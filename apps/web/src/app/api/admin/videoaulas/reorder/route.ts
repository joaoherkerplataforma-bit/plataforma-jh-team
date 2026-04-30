import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { autorizarEquipe } from '@/lib/auth'

interface ReorderBody {
  id?: unknown
  direction?: unknown
}

/**
 * Reordena uma videoaula ATIVA trocando-a com o vizinho imediatamente
 * acima ('up') ou abaixo ('down').
 *
 * Estrategia para nao colidir com `idx_videoaulas_ordem_ativo` (UNIQUE WHERE ativo=true):
 *   1) Move o alvo para uma ordem temporaria negativa (libera o slot).
 *   2) Move o vizinho para a ordem original do alvo.
 *   3) Move o alvo para a ordem original do vizinho.
 *
 * Se algum step falhar, tenta restaurar o estado original como mitigacao
 * (rollback best-effort sem transacao real — limitacao conhecida do PostgREST).
 */
export async function POST(request: NextRequest) {
  const auth = await autorizarEquipe()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  let body: ReorderBody
  try {
    body = (await request.json()) as ReorderBody
  } catch {
    return NextResponse.json({ error: 'JSON invalido' }, { status: 400 })
  }

  const id = typeof body.id === 'string' ? body.id : ''
  const direction = body.direction
  if (!id) {
    return NextResponse.json({ error: 'id obrigatorio' }, { status: 400 })
  }
  if (direction !== 'up' && direction !== 'down') {
    return NextResponse.json(
      { error: "direction deve ser 'up' ou 'down'" },
      { status: 400 },
    )
  }

  const service = createServiceClient()

  // Busca o alvo
  const { data: alvo, error: erroAlvo } = await service
    .from('videoaulas')
    .select('id, ordem, ativo')
    .eq('id', id)
    .single()

  if (erroAlvo || !alvo) {
    return NextResponse.json(
      { error: 'videoaula nao encontrada' },
      { status: 404 },
    )
  }
  if (!alvo.ativo) {
    return NextResponse.json(
      { error: 'apenas videoaulas ativas podem ser reordenadas' },
      { status: 400 },
    )
  }

  // Busca o vizinho na direcao indicada (entre os ativos).
  const ordemAlvo = alvo.ordem as number
  let vizinhoQuery = service
    .from('videoaulas')
    .select('id, ordem')
    .eq('ativo', true)
    .neq('id', id)

  if (direction === 'up') {
    vizinhoQuery = vizinhoQuery
      .lt('ordem', ordemAlvo)
      .order('ordem', { ascending: false })
      .limit(1)
  } else {
    vizinhoQuery = vizinhoQuery
      .gt('ordem', ordemAlvo)
      .order('ordem', { ascending: true })
      .limit(1)
  }

  const { data: vizinhos, error: erroVizinho } = await vizinhoQuery
  if (erroVizinho) {
    return NextResponse.json(
      { error: erroVizinho.message },
      { status: 500 },
    )
  }
  const vizinho = vizinhos?.[0]
  if (!vizinho) {
    // Ja esta no extremo — operacao no-op.
    return NextResponse.json({ ok: true, noop: true })
  }

  const ordemVizinho = vizinho.ordem as number

  // Step 1: alvo -> ordem temporaria negativa (qualquer valor nao colidente).
  // Usa um random no intervalo dos integers Postgres (-2_147_483_648 .. -1) para
  // minimizar o risco de colisao caso varias reordenacoes rodem em paralelo.
  const ordemTemp = -1 - Math.floor(Math.random() * 2_000_000_000)
  const r1 = await service
    .from('videoaulas')
    .update({ ordem: ordemTemp })
    .eq('id', alvo.id)
  if (r1.error) {
    return NextResponse.json(
      { error: `falha step 1: ${r1.error.message}` },
      { status: 500 },
    )
  }

  // Step 2: vizinho -> ordem original do alvo
  const r2 = await service
    .from('videoaulas')
    .update({ ordem: ordemAlvo })
    .eq('id', vizinho.id)
  if (r2.error) {
    // Rollback step 1
    await service
      .from('videoaulas')
      .update({ ordem: ordemAlvo })
      .eq('id', alvo.id)
    return NextResponse.json(
      { error: `falha step 2: ${r2.error.message}` },
      { status: 500 },
    )
  }

  // Step 3: alvo -> ordem original do vizinho
  const r3 = await service
    .from('videoaulas')
    .update({ ordem: ordemVizinho })
    .eq('id', alvo.id)
  if (r3.error) {
    // Rollback: vizinho volta para sua ordem original; alvo volta para a sua.
    await service
      .from('videoaulas')
      .update({ ordem: ordemVizinho })
      .eq('id', vizinho.id)
    await service
      .from('videoaulas')
      .update({ ordem: ordemAlvo })
      .eq('id', alvo.id)
    return NextResponse.json(
      { error: `falha step 3: ${r3.error.message}` },
      { status: 500 },
    )
  }

  revalidatePath('/pacientes/videoaulas')
  revalidatePath('/portal')

  return NextResponse.json({ ok: true })
}
