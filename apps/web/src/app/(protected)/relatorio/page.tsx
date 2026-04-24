import { createClient } from '@/lib/supabase/server'
import type { Paciente } from '@/types/pacientes'
import { RelatorioMetricas } from '@/app/(protected)/relatorio/relatorio-metricas'
import { RelatorioPlaceholder } from '@/app/(protected)/relatorio/relatorio-placeholder'

const COMBINACOES = [
  { key: 'dieta-trimestral', label: 'Dieta Trimestral' },
  { key: 'dieta-semestral', label: 'Dieta Semestral' },
  { key: 'dieta-anual', label: 'Dieta Anual' },
  { key: 'completo-trimestral', label: 'Completo Trimestral' },
  { key: 'completo-semestral', label: 'Completo Semestral' },
  { key: 'completo-anual', label: 'Completo Anual' },
] as const

export default async function RelatorioPage() {
  const supabase = await createClient()

  const { data: pacientesRaw } = await supabase
    .from('pacientes')
    .select('*')
    .order('nome', { ascending: true })

  const pacientes = (pacientesRaw as Paciente[] | null) ?? []

  const hoje = new Date()
  const seteDiasAtras = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]
  const trintaDiasAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  const totalAtivos = pacientes.filter((p) => p.status === 'ativo').length
  const totalVencidos = pacientes.filter((p) => p.status === 'vencido').length
  const totalCancelados = pacientes.filter((p) => p.status === 'cancelado').length
  const novos7dias = pacientes.filter((p) => p.data_inicio >= seteDiasAtras).length
  const novos30dias = pacientes.filter((p) => p.data_inicio >= trintaDiasAtras).length

  const comDuracao = pacientes.filter((p) => p.status !== 'cancelado')
  const tempoMedioDias =
    comDuracao.length > 0
      ? Math.round(
          comDuracao.reduce((acc, p) => {
            const inicio = new Date(p.data_inicio + 'T00:00:00').getTime()
            const fim = new Date(p.data_vencimento_plano + 'T00:00:00').getTime()
            return acc + (fim - inicio) / (1000 * 60 * 60 * 24)
          }, 0) / comDuracao.length,
        )
      : null

  const distribuicaoPorPlano = COMBINACOES.map((c) => {
    const [tipo, duracao] = c.key.split('-')
    return {
      label: c.label,
      total: pacientes.filter(
        (p) => p.tipo_plano === tipo && p.duracao_plano === duracao,
      ).length,
    }
  })

  return (
    <>
      <RelatorioMetricas
        totalPacientes={pacientes.length}
        totalAtivos={totalAtivos}
        totalVencidos={totalVencidos}
        totalCancelados={totalCancelados}
        novos7dias={novos7dias}
        novos30dias={novos30dias}
        tempoMedioDias={tempoMedioDias}
        distribuicaoPorPlano={distribuicaoPorPlano}
      />
      <RelatorioPlaceholder />
    </>
  )
}
