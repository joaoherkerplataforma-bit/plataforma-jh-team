import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { PerfilAcesso } from '@/types/auth'

export interface AuthorizedUser {
  id: string
  perfil: PerfilAcesso
}

const PERFIS_EQUIPE: readonly PerfilAcesso[] = [
  'joao_admin',
  'pablo',
  'joao_estagiario',
] as const

/**
 * Verifica se o usuario autenticado faz parte da equipe operacional
 * (joao_admin, pablo ou joao_estagiario).
 *
 * Retorna `{ ok: true, user }` em caso de sucesso ou `{ ok: false, status, error }`
 * que pode ser convertido diretamente em NextResponse.
 *
 * Usa service client para a leitura do perfil para evitar problemas de RLS
 * caso a sessao nao consiga consultar a tabela `usuarios` por algum motivo.
 */
export async function autorizarEquipe(): Promise<
  | { ok: true; user: AuthorizedUser }
  | { ok: false; status: 401 | 403; error: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }

  const service = createServiceClient()
  const { data: usuario, error } = await service
    .from('usuarios')
    .select('perfil')
    .eq('id', user.id)
    .single()

  if (error || !usuario) {
    return { ok: false, status: 403, error: 'Forbidden' }
  }

  const perfil = usuario.perfil as PerfilAcesso
  if (!PERFIS_EQUIPE.includes(perfil)) {
    return { ok: false, status: 403, error: 'Forbidden' }
  }

  return { ok: true, user: { id: user.id, perfil } }
}
