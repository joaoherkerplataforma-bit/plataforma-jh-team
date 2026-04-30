import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type {
  ProgressoVideoaula,
  Videoaula,
} from '@/types/videoaulas'

/**
 * Lista videoaulas ativas (ordenadas pela trilha do aluno).
 * Usa o server client — RLS aplica:
 *   - Equipe: vê todas as ativas
 *   - Aluno:  vê apenas as ativas
 */
export async function listarVideoaulasAtivas(): Promise<Videoaula[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('videoaulas')
    .select('*')
    .eq('ativo', true)
    .order('ordem', { ascending: true })

  if (error) {
    console.error('[videoaulas] listarVideoaulasAtivas falhou', error)
    throw new Error(`Falha ao listar videoaulas ativas: ${error.message}`)
  }

  return (data ?? []) as Videoaula[]
}

/**
 * Lista todas as videoaulas (ativas e arquivadas) para a tela de admin.
 * Apenas a equipe consegue enxergar arquivadas (RLS aluno limita a ativo=true).
 */
export async function listarTodasVideoaulas(): Promise<Videoaula[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('videoaulas')
    .select('*')
    .order('ordem', { ascending: true })

  if (error) {
    console.error('[videoaulas] listarTodasVideoaulas falhou', error)
    throw new Error(`Falha ao listar todas as videoaulas: ${error.message}`)
  }

  return (data ?? []) as Videoaula[]
}

/**
 * Lista o progresso de um aluno (linhas que indicam quais videoaulas ele
 * já assistiu). RLS garante que aluno só lê o próprio progresso; equipe
 * lê todos.
 */
export async function listarProgressoAluno(
  alunoId: string,
): Promise<ProgressoVideoaula[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('progresso_videoaulas')
    .select('*')
    .eq('aluno_id', alunoId)

  if (error) {
    console.error('[videoaulas] listarProgressoAluno falhou', error)
    throw new Error(`Falha ao listar progresso do aluno: ${error.message}`)
  }

  return (data ?? []) as ProgressoVideoaula[]
}

/**
 * Marca uma videoaula como assistida pelo aluno.
 *
 * Idempotente: a tabela tem UNIQUE(aluno_id, videoaula_id). Se já existir
 * registro, o erro 23505 (unique_violation) é capturado como sucesso
 * silencioso — chamadas repetidas são no-op.
 */
export async function marcarComoAssistida(
  alunoId: string,
  videoaulaId: string,
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('progresso_videoaulas')
    .insert({ aluno_id: alunoId, videoaula_id: videoaulaId })

  if (!error) return

  // 23505 = unique_violation (já assistiu) — comportamento idempotente.
  if (error.code === '23505') return

  console.error('[videoaulas] marcarComoAssistida falhou', error)
  throw new Error(`Falha ao marcar videoaula como assistida: ${error.message}`)
}

/**
 * Gera signed URL temporária para reprodução do vídeo no Portal do Aluno.
 *
 * IMPORTANTE: usa service-role (bypassa RLS do Storage). Quem chama deve
 * validar ANTES que o aluno tem direito de assistir essa videoaula
 * (regras de desbloqueio em `lib/portal-gating.ts`). Esta função apenas
 * traduz o `storage_path` em uma URL assinada com TTL.
 */
export async function gerarSignedUrl(
  storagePath: string,
  ttlSeconds = 3600,
): Promise<string> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .storage
    .from('videoaulas')
    .createSignedUrl(storagePath, ttlSeconds)

  if (error || !data?.signedUrl) {
    console.error('[videoaulas] gerarSignedUrl falhou', { storagePath, error })
    throw new Error(
      `Falha ao gerar URL assinada da videoaula: ${error?.message ?? 'sem URL'}`,
    )
  }

  return data.signedUrl
}
