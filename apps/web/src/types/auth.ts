export type PerfilAcesso = 'joao_admin' | 'pablo' | 'joao_estagiario' | 'aluno'

export interface UserProfile {
  id: string
  nome: string
  email: string
  perfil: PerfilAcesso
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export const PERFIL_ROUTES: Record<PerfilAcesso, string> = {
  joao_admin: '/dashboard',
  pablo: '/tarefas',
  joao_estagiario: '/tarefas',
  aluno: '/portal',
} as const

export const PROTECTED_ROUTES = ['/dashboard', '/tarefas', '/portal'] as const
