export interface Paciente {
  id: string
  nome: string
  email: string | null
  telefone: string | null
  data_inicio: string
  data_vencimento_plano: string
  proximo_retorno: string | null
  tipo_plano: 'dieta' | 'completo'
  duracao_plano: 'trimestral' | 'semestral' | 'anual'
  observacoes: string | null
  status: 'ativo' | 'vencido' | 'pausado'
  created_at: string
  updated_at: string
}

export interface PacienteComCalculos extends Paciente {
  dias_para_retorno: number | null
  dias_ativos: number
}

export interface ResumoCards {
  total_ativos: number
  total_vencidos: number
  vencendo_em_breve: number
}

export type TabAtiva = 'ativos' | 'vencidos'

export const TIPO_PLANO_LABELS: Record<Paciente['tipo_plano'], string> = {
  dieta: 'Dieta',
  completo: 'Completo',
} as const

export const TEMPO_PLANO_LABELS: Record<Paciente['duracao_plano'], string> = {
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
} as const
