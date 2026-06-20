export type StatusTarefa = 'pendente' | 'bloqueada' | 'feito' | 'gravado' | 'entregue'
export type ModuloTarefa = 'B' | 'C' | 'D' | 'E'

export interface PacienteResumo {
  id: string
  nome: string
  email: string | null
  tipo_plano: 'dieta' | 'completo'
}

export interface ResponsavelResumo {
  id: string
  nome: string
  perfil: string
}

export interface Tarefa {
  id: string
  paciente_id: string
  modulo: ModuloTarefa
  responsavel_id: string | null
  status: StatusTarefa
  data_criacao: string
  data_prazo: string
  tarefa_pai_id: string | null
  observacoes_joao: string | null
  formulario_id: string | null
  created_at: string
  updated_at: string
  paciente: PacienteResumo | null
  responsavel: ResponsavelResumo | null
}

export const STATUS_LABELS: Record<StatusTarefa, string> = {
  pendente: 'Pendente',
  bloqueada: 'Bloqueada',
  feito: 'Feito',
  gravado: 'Gravado',
  entregue: 'Entregue',
} as const

export const STATUS_BADGE_CLASS: Record<StatusTarefa, string> = {
  pendente:  'bg-yellow-900/40 text-[#F5F0E8] border border-yellow-700/40',
  bloqueada: 'bg-[#1A1A1A] text-[#555] border border-[#333]',
  feito:     'bg-blue-900/40 text-blue-300 border border-blue-700/40',
  gravado:   'bg-purple-900/40 text-purple-300 border border-purple-700/40',
  entregue:  'bg-green-900/40 text-green-300 border border-green-700/40',
} as const

export const TIPO_PLANO_LABELS: Record<'dieta' | 'completo', string> = {
  dieta: 'Dieta',
  completo: 'Completo',
} as const
