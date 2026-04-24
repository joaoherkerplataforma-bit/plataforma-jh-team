export type PerfilAcesso = 'joao_admin' | 'pablo' | 'joao_estagiario' | 'aluno'

export interface UserProfile {
  id: string
  nome: string
  email: string
  perfil: PerfilAcesso
  ativo: boolean
  created_at: string
  updated_at: string
}

export const PERFIL_ROUTES: Record<PerfilAcesso, string> = {
  joao_admin: '/relatorio',
  pablo: '/relatorio',
  joao_estagiario: '/relatorio',
  aluno: '/portal',
} as const

export const PROTECTED_ROUTES = ['/relatorio', '/pacientes', '/tarefas', '/portal'] as const
