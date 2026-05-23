// =============================================================
// Tipos mínimos espelhando o schema Supabase relevante ao relatório.
// (O monorepo ainda não tem um pacote de tipos compartilhado; quando
//  packages/types existir, estes tipos podem ser reaproveitados de lá.)
// =============================================================

export type StatusPaciente = 'ativo' | 'vencido' | 'pausado' | 'cancelado'
export type StatusTarefa = 'pendente' | 'bloqueada' | 'feito' | 'gravado' | 'entregue'
export type ModuloTarefa = 'B' | 'C' | 'D'

export interface PacienteRow {
  id: string
  nome: string
  telefone: string | null
  tipo_plano: 'dieta' | 'completo'
  duracao_plano: 'trimestral' | 'semestral' | 'anual'
  data_inicio: string
  data_vencimento_plano: string
  proximo_retorno: string | null
  status: StatusPaciente
}

export interface TarefaRow {
  id: string
  modulo: ModuloTarefa
  status: StatusTarefa
  data_prazo: string
  paciente: { nome: string } | { nome: string }[] | null
}

// -------------------------------------------------------------
// Linhas derivadas (já com cálculos) que vão para o relatório
// -------------------------------------------------------------

export interface PacienteRetornoLinha {
  nome: string
  diasParaRetorno: number
  proximoRetorno: string
}

export interface PacientePlanoLinha {
  nome: string
  diasAtivos: number
  dataVencimento: string
}

export interface TarefaAtrasadaLinha {
  nomePaciente: string
  modulo: ModuloTarefa
  diasDeAtraso: number
  prazo: string
}

export interface ResumoRelatorio {
  ativos: number
  vencidos: number
  paraVencer: number
}

export interface RelatorioData {
  hoje: string
  // Seções conforme PROJETO.md (Relatório diário, WhatsApp, 8h)
  enviarFormularios30: PacienteRetornoLinha[] // retorno é HOJE → João envia os 2 forms
  retornosProximos: PacienteRetornoLinha[] // faltam 1–3 dias
  retornosAtrasados: PacienteRetornoLinha[] // retorno já passou
  planosVencendo: PacientePlanoLinha[] // vence em 0–3 dias
  planosVencidos: PacientePlanoLinha[] // já venceu (renovação)
  tarefasAtrasadas: TarefaAtrasadaLinha[] // sem conclusão há mais de 3 dias
  resumo: ResumoRelatorio
}
