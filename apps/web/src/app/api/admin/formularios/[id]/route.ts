import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

import { createServiceClient } from '@/lib/supabase/service'
import { autorizarEquipe } from '@/lib/auth'
import { normalizarCampos } from '@/lib/formulario-schema'
import type { AcaoFormulario } from '@/types/formulario-builder'

const ACOES: readonly AcaoFormulario[] = [
  'anamnese',
  'fotos_iniciais',
  'treino',
  'fotos_30dias',
  'feedback_retorno',
  'nenhuma',
]

interface PatchBody {
  titulo?: unknown
  descricao?: unknown
  acao?: unknown
  ativo?: unknown
  campos?: unknown
  rotacionar_token?: unknown
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await autorizarEquipe()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (auth.user.perfil !== 'joao_admin') {
    return NextResponse.json({ error: 'Apenas o admin gerencia formulários' }, { status: 403 })
  }

  const { id } = await params

  let body: PatchBody
  try {
    body = (await request.json()) as PatchBody
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}

  if (typeof body.titulo === 'string') {
    const t = body.titulo.trim()
    if (!t) return NextResponse.json({ error: 'Título não pode ficar vazio' }, { status: 400 })
    update.titulo = t
  }
  if (body.descricao === null || typeof body.descricao === 'string') {
    update.descricao = typeof body.descricao === 'string' ? body.descricao.trim() || null : null
  }
  if (body.acao !== undefined) {
    if (!ACOES.includes(body.acao as AcaoFormulario)) {
      return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
    }
    update.acao = body.acao
  }
  if (typeof body.ativo === 'boolean') {
    update.ativo = body.ativo
  }
  if (body.campos !== undefined) {
    const res = normalizarCampos(body.campos)
    if (res.erro) return NextResponse.json({ error: res.erro }, { status: 400 })
    update.campos = res.campos
  }
  if (body.rotacionar_token === true) {
    update.share_token = crypto.randomUUID().replace(/-/g, '')
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 })
  }

  const service = createServiceClient()
  const { error } = await service.from('formularios').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath('/formularios')
  revalidatePath(`/formularios/${id}`)
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await autorizarEquipe()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (auth.user.perfil !== 'joao_admin') {
    return NextResponse.json({ error: 'Apenas o admin gerencia formulários' }, { status: 403 })
  }

  const { id } = await params
  const service = createServiceClient()
  const { error } = await service.from('formularios').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath('/formularios')
  return NextResponse.json({ ok: true })
}
