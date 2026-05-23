import type { SupabaseClient } from '@supabase/supabase-js'

import { diasEntre } from './dates'
import type {
  PacienteRow,
  TarefaRow,
  RelatorioData,
  PacienteRetornoLinha,
  PacientePlanoLinha,
  TarefaAtrasadaLinha,
} from './types'

// Janela de antecedência (em dias) para os alertas de retorno e vencimento.
// PROJETO.md: laranja/amarelo = faltando 3, 2 ou 1 dias.
const JANELA_ALERTA = 3

// PROJETO.md: "tarefa atrasada = sem conclusão há mais de 3 dias" (após o prazo).
const GRACA_TAREFA_ATRASADA = 3

/**
 * Lê pacientes + tarefas do Supabase e monta os dados do relatório diário.
 */
export async function montarRelatorio(
  supabase: SupabaseClient,
  hoje: string
): Promise<RelatorioData> {
  const [pacientes, tarefas] = await Promise.all([
    buscarPacientes(supabase),
    buscarTarefas(supabase),
  ])
  return classificarRelatorio(pacientes, tarefas, hoje)
}

/**
 * Função pura: classifica pacientes e tarefas nas seções do relatório,
 * aplicando exatamente as regras do PROJETO.md / lib/pacientes.ts do web app.
 * Separada de `montarRelatorio` para ser testável sem acesso ao banco.
 */
export function classificarRelatorio(
  pacientes: PacienteRow[],
  tarefas: TarefaRow[],
  hoje: string
): RelatorioData {
  const enviarFormularios30: PacienteRetornoLinha[] = []
  const retornosProximos: PacienteRetornoLinha[] = []
  const retornosAtrasados: PacienteRetornoLinha[] = []
  const planosVencendo: PacientePlanoLinha[] = []
  const planosVencidos: PacientePlanoLinha[] = []

  let ativos = 0
  let vencidos = 0
  let paraVencer = 0

  for (const p of pacientes) {
    // Cancelado sai de toda a operação (alinha com calcularResumo do web app).
    if (p.status === 'cancelado') continue

    const diasAtivos = diasEntre(p.data_vencimento_plano, hoje)

    // --- Resumo (espelha calcularResumo) ---
    if (diasAtivos < 0) {
      vencidos++
    } else {
      ativos++
      if (diasAtivos <= JANELA_ALERTA) paraVencer++
    }

    // --- Seções de plano ---
    if (diasAtivos < 0) {
      planosVencidos.push({
        nome: p.nome,
        diasAtivos,
        dataVencimento: p.data_vencimento_plano,
      })
    } else if (diasAtivos <= JANELA_ALERTA) {
      planosVencendo.push({
        nome: p.nome,
        diasAtivos,
        dataVencimento: p.data_vencimento_plano,
      })
    }

    // --- Seções de retorno ---
    if (p.proximo_retorno) {
      const diasParaRetorno = diasEntre(p.proximo_retorno, hoje)
      const linha: PacienteRetornoLinha = {
        nome: p.nome,
        diasParaRetorno,
        proximoRetorno: p.proximo_retorno,
      }
      if (diasParaRetorno === 0) {
        // Retorno é HOJE → João envia os 2 formulários de 30 dias.
        enviarFormularios30.push(linha)
      } else if (diasParaRetorno > 0 && diasParaRetorno <= JANELA_ALERTA) {
        retornosProximos.push(linha)
      } else if (diasParaRetorno < 0) {
        retornosAtrasados.push(linha)
      }
    }
  }

  // Tarefas sem conclusão há mais de 3 dias após o prazo.
  // 'bloqueada' não conta (aguarda dependência legítima do Módulo C).
  const tarefasAtrasadas: TarefaAtrasadaLinha[] = []
  for (const t of tarefas) {
    if (t.status === 'entregue' || t.status === 'bloqueada') continue
    const diasDeAtraso = diasEntre(hoje, t.data_prazo) // positivo = prazo no passado
    if (diasDeAtraso > GRACA_TAREFA_ATRASADA) {
      tarefasAtrasadas.push({
        nomePaciente: nomeDoPaciente(t),
        modulo: t.modulo,
        diasDeAtraso,
        prazo: t.data_prazo,
      })
    }
  }

  // Ordenações: mais urgente primeiro.
  enviarFormularios30.sort((a, b) => a.nome.localeCompare(b.nome))
  retornosProximos.sort((a, b) => a.diasParaRetorno - b.diasParaRetorno)
  retornosAtrasados.sort((a, b) => a.diasParaRetorno - b.diasParaRetorno) // mais atrasado primeiro
  planosVencendo.sort((a, b) => a.diasAtivos - b.diasAtivos)
  planosVencidos.sort((a, b) => a.diasAtivos - b.diasAtivos)
  tarefasAtrasadas.sort((a, b) => b.diasDeAtraso - a.diasDeAtraso)

  return {
    hoje,
    enviarFormularios30,
    retornosProximos,
    retornosAtrasados,
    planosVencendo,
    planosVencidos,
    tarefasAtrasadas,
    resumo: { ativos, vencidos, paraVencer },
  }
}

async function buscarPacientes(supabase: SupabaseClient): Promise<PacienteRow[]> {
  const { data, error } = await supabase
    .from('pacientes')
    .select(
      'id, nome, telefone, tipo_plano, duracao_plano, data_inicio, data_vencimento_plano, proximo_retorno, status'
    )

  if (error) throw new Error(`Falha ao buscar pacientes: ${error.message}`)
  return (data ?? []) as PacienteRow[]
}

async function buscarTarefas(supabase: SupabaseClient): Promise<TarefaRow[]> {
  const { data, error } = await supabase
    .from('tarefas')
    .select('id, modulo, status, data_prazo, paciente:pacientes(nome)')

  if (error) throw new Error(`Falha ao buscar tarefas: ${error.message}`)
  return (data ?? []) as unknown as TarefaRow[]
}

function nomeDoPaciente(t: TarefaRow): string {
  const p = t.paciente
  if (!p) return 'Paciente desconhecido'
  if (Array.isArray(p)) return p[0]?.nome ?? 'Paciente desconhecido'
  return p.nome
}
