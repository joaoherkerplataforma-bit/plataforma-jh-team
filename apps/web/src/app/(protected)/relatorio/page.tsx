import { createClient } from '@/lib/supabase/server'
import { calcularCamposPaciente, calcularResumo, separarPacientes } from '@/lib/pacientes'
import type { Paciente } from '@/types/pacientes'
import { PacientesTable } from '@/app/(protected)/relatorio/pacientes-table'

interface TarefasResumo {
  tarefas_em_aberto: number
  tarefas_atrasadas: number
}

async function buscarResumoTarefas(): Promise<TarefasResumo> {
  try {
    const supabase = await createClient()

    const { count: emAberto } = await supabase
      .from('tarefas')
      .select('*', { count: 'exact', head: true })
      .not('status', 'in', '("entregue","cancelada")')

    const { count: atrasadas } = await supabase
      .from('tarefas')
      .select('*', { count: 'exact', head: true })
      .not('status', 'in', '("entregue","cancelada")')
      .lt('data_entrega', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

    return {
      tarefas_em_aberto: emAberto ?? 0,
      tarefas_atrasadas: atrasadas ?? 0,
    }
  } catch {
    return { tarefas_em_aberto: 0, tarefas_atrasadas: 0 }
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()

  // Buscar todos os pacientes (admin ve tudo)
  const { data: pacientesRaw } = await supabase
    .from('pacientes')
    .select('*')
    .order('nome', { ascending: true })

  const pacientes = (pacientesRaw as Paciente[] | null) ?? []
  const resumo = calcularResumo(pacientes)
  const pacientesCalculados = pacientes.map(calcularCamposPaciente)
  const { ativos, vencidos } = separarPacientes(pacientesCalculados)

  const tarefasResumo = await buscarResumoTarefas()

  return (
    <PacientesTable
      ativos={ativos}
      vencidos={vencidos}
      resumo={resumo}
      tarefasResumo={tarefasResumo}
    />
  )
}
