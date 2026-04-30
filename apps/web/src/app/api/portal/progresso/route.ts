import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  listarProgressoAluno,
  listarVideoaulasAtivas,
  marcarComoAssistida,
} from '@/lib/videoaulas'
import { podeAcessarVideoaula } from '@/lib/portal-gating'
import type { PerfilAcesso } from '@/types/auth'

interface ProgressoBody {
  videoaula_id?: unknown
}

/**
 * POST /api/portal/progresso
 *
 * Marca uma videoaula como assistida pelo aluno autenticado.
 *
 * - Apenas perfil 'aluno' (equipe em preview NAO marca progresso).
 * - Defesa em profundidade: valida `podeAcessarVideoaula` server-side antes
 *   de gravar o progresso, mesmo que a UI ja tenha aplicado o gating.
 * - Idempotente: chamadas repetidas para a mesma videoaula sao no-op.
 */
export async function POST(request: NextRequest) {
  // 1. Autenticacao
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })
  }

  // 2. Validacao de perfil — apenas aluno marca progresso.
  // Usa service client para nao depender de RLS na leitura do perfil.
  const service = createServiceClient()
  const { data: usuario, error: usuarioError } = await service
    .from('usuarios')
    .select('perfil')
    .eq('id', user.id)
    .single()

  if (usuarioError || !usuario) {
    return NextResponse.json(
      { error: 'Perfil de usuario nao encontrado.' },
      { status: 403 },
    )
  }

  const perfil = usuario.perfil as PerfilAcesso
  if (perfil !== 'aluno') {
    return NextResponse.json(
      { error: 'Apenas alunos podem marcar progresso.' },
      { status: 403 },
    )
  }

  // 3. Parse e validacao do body.
  let body: ProgressoBody
  try {
    body = (await request.json()) as ProgressoBody
  } catch {
    return NextResponse.json({ error: 'JSON invalido.' }, { status: 400 })
  }

  const videoaulaId =
    typeof body.videoaula_id === 'string' ? body.videoaula_id.trim() : ''

  if (!videoaulaId) {
    return NextResponse.json(
      { error: 'Campo videoaula_id e obrigatorio.' },
      { status: 400 },
    )
  }

  // 4. Defesa em profundidade — valida gating server-side.
  const [videoaulasAtivas, progresso] = await Promise.all([
    listarVideoaulasAtivas(),
    listarProgressoAluno(user.id),
  ])

  if (!podeAcessarVideoaula(videoaulaId, videoaulasAtivas, progresso)) {
    return NextResponse.json(
      { error: 'Videoaula bloqueada ou inexistente.' },
      { status: 403 },
    )
  }

  // 5. Marca como assistida (idempotente).
  try {
    await marcarComoAssistida(user.id, videoaulaId)
  } catch (err) {
    console.error('[api/portal/progresso] marcarComoAssistida falhou', err)
    return NextResponse.json(
      { error: 'Falha ao gravar progresso. Tente novamente.' },
      { status: 500 },
    )
  }

  // 6. Revalida o Portal — badge "Assistida" e desbloqueio da proxima
  // aparecem ja na proxima request server-side.
  revalidatePath('/portal')

  return NextResponse.json({ ok: true })
}
