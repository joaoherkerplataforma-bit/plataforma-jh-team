import type { Paciente, PacienteComCalculos, ResumoCards } from '@/types/pacientes'

function calcularDiasEntreDatas(dataAlvo: string, hoje: Date): number {
  const alvo = new Date(dataAlvo + 'T00:00:00')
  const hojeZerado = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  return Math.ceil((alvo.getTime() - hojeZerado.getTime()) / (1000 * 60 * 60 * 24))
}

export function calcularCamposPaciente(paciente: Paciente): PacienteComCalculos {
  const hoje = new Date()
  const diasAtivos = calcularDiasEntreDatas(paciente.data_vencimento_plano, hoje)
  const diasParaRetorno = paciente.proximo_retorno
    ? calcularDiasEntreDatas(paciente.proximo_retorno, hoje)
    : null

  return {
    ...paciente,
    dias_para_retorno: diasParaRetorno,
    dias_ativos: diasAtivos,
  }
}

export function calcularResumo(pacientes: Paciente[]): ResumoCards {
  const hoje = new Date()
  let totalAtivos = 0
  let totalVencidos = 0
  let vencendoEmBreve = 0

  for (const p of pacientes) {
    if (p.status === 'cancelado') continue
    const diasAtivos = calcularDiasEntreDatas(p.data_vencimento_plano, hoje)
    if (diasAtivos < 0) {
      totalVencidos++
    } else {
      totalAtivos++
      if (diasAtivos >= 0 && diasAtivos <= 3) {
        vencendoEmBreve++
      }
    }
  }

  return {
    total_ativos: totalAtivos,
    total_vencidos: totalVencidos,
    vencendo_em_breve: vencendoEmBreve,
  }
}

export function separarPacientes(pacientes: PacienteComCalculos[]): {
  ativos: PacienteComCalculos[]
  vencidos: PacienteComCalculos[]
  cancelados: PacienteComCalculos[]
} {
  const ativos: PacienteComCalculos[] = []
  const vencidos: PacienteComCalculos[] = []
  const cancelados: PacienteComCalculos[] = []

  for (const p of pacientes) {
    if (p.status === 'cancelado') {
      cancelados.push(p)
    } else if (p.dias_ativos < 0) {
      vencidos.push(p)
    } else {
      ativos.push(p)
    }
  }

  return { ativos, vencidos, cancelados }
}

export function formatarData(dataStr: string | null): string {
  if (!dataStr) return '-'
  const [ano, mes, dia] = dataStr.split('-')
  return `${dia}/${mes}/${ano}`
}

export function corDaLinhaRetorno(diasParaRetorno: number | null): string {
  if (diasParaRetorno === null) return ''
  if (diasParaRetorno === 0) return 'bg-green-900/30 border-l-2 border-l-green-500'
  if (diasParaRetorno >= 1 && diasParaRetorno <= 3) return 'bg-orange-900/20 border-l-2 border-l-orange-500'
  if (diasParaRetorno < 0) return 'bg-red-900/20 border-l-2 border-l-red-500'
  return ''
}

export function badgeStatusRetorno(diasParaRetorno: number | null): {
  texto: string
  classe: string
} {
  if (diasParaRetorno === null) return { texto: '-', classe: 'text-white/40' }
  if (diasParaRetorno === 0) return { texto: 'Hoje', classe: 'bg-green-600/20 text-green-400' }
  if (diasParaRetorno >= 1 && diasParaRetorno <= 3) return { texto: `${diasParaRetorno}d`, classe: 'bg-orange-600/20 text-orange-400' }
  if (diasParaRetorno < 0) return { texto: `${Math.abs(diasParaRetorno)}d atrasado`, classe: 'bg-red-600/20 text-red-400' }
  return { texto: `${diasParaRetorno}d`, classe: 'bg-white/5 text-white/50' }
}

export function badgeStatusPlano(diasAtivos: number): {
  texto: string
  classe: string
} {
  if (diasAtivos < 0) return { texto: 'Vencido', classe: 'bg-red-600/20 text-red-400' }
  if (diasAtivos >= 0 && diasAtivos <= 3) return { texto: `Vence em ${diasAtivos}d`, classe: 'bg-yellow-600/20 text-[#F5F0E8]' }
  return { texto: 'Ativo', classe: 'bg-green-600/20 text-green-400' }
}

export function corNomePaciente(diasAtivos: number): string {
  if (diasAtivos < 0) return 'text-red-500 font-semibold'
  return 'text-white'
}
