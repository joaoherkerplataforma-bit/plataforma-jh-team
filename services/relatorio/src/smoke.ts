// =============================================================
// Smoke test do relatório — valida a lógica de classificação e a
// formatação SEM acessar o Supabase nem o WhatsApp.
// Rodar: npm run smoke
// =============================================================

import { classificarRelatorio } from './relatorio'
import { formatarRelatorio } from './formatar'
import type { PacienteRow, TarefaRow } from './types'

const HOJE = '2026-05-23'

function dataRelativa(dias: number): string {
  const d = new Date(Date.UTC(2026, 4, 23) + dias * 86_400_000)
  return d.toISOString().split('T')[0]
}

const pacientes: PacienteRow[] = [
  // Retorno é hoje → deve cair em "enviar formulários de 30 dias"
  paciente('Ana Retorno-Hoje', { proximo_retorno: dataRelativa(0) }),
  // Retorno em 2 dias → "retornos próximos"
  paciente('Bruno Retorno-2d', { proximo_retorno: dataRelativa(2) }),
  // Retorno passou há 3 dias → "retornos atrasados"
  paciente('Carla Retorno-Atrasado', { proximo_retorno: dataRelativa(-3) }),
  // Plano vence em 1 dia → "planos vencendo"
  paciente('Diego Vence-1d', { data_vencimento_plano: dataRelativa(1) }),
  // Plano venceu há 10 dias → "planos vencidos" + conta como vencido
  paciente('Eva Vencida', { data_vencimento_plano: dataRelativa(-10) }),
  // Cancelado → não aparece em lugar nenhum
  paciente('Fabio Cancelado', { status: 'cancelado', data_vencimento_plano: dataRelativa(-5) }),
  // Ativo normal, sem alertas
  paciente('Gabi Tranquila', {
    proximo_retorno: dataRelativa(20),
    data_vencimento_plano: dataRelativa(120),
  }),
]

const tarefas: TarefaRow[] = [
  // Atrasada há 5 dias (prazo passou 5 dias) → entra
  tarefa('B', 'pendente', dataRelativa(-5), 'Bruno Retorno-2d'),
  // Atrasada apenas 2 dias → NÃO entra (graça de 3)
  tarefa('C', 'feito', dataRelativa(-2), 'Diego Vence-1d'),
  // Entregue → nunca conta como atrasada
  tarefa('D', 'entregue', dataRelativa(-30), 'Eva Vencida'),
  // Bloqueada → nunca conta (aguarda Módulo C)
  tarefa('D', 'bloqueada', dataRelativa(-10), 'Ana Retorno-Hoje'),
]

function paciente(nome: string, over: Partial<PacienteRow> = {}): PacienteRow {
  return {
    id: nome,
    nome,
    telefone: null,
    tipo_plano: 'dieta',
    duracao_plano: 'trimestral',
    data_inicio: dataRelativa(-60),
    data_vencimento_plano: dataRelativa(30),
    proximo_retorno: null,
    status: 'ativo',
    ...over,
  }
}

function tarefa(
  modulo: TarefaRow['modulo'],
  status: TarefaRow['status'],
  prazo: string,
  nomePaciente: string
): TarefaRow {
  return { id: `${modulo}-${nomePaciente}`, modulo, status, data_prazo: prazo, paciente: { nome: nomePaciente } }
}

// ---- Execução + asserções ----
const dados = classificarRelatorio(pacientes, tarefas, HOJE)

const checks: Array<[string, boolean]> = [
  ['enviarFormularios30 = [Ana]', eqNomes(dados.enviarFormularios30, ['Ana Retorno-Hoje'])],
  ['retornosProximos = [Bruno]', eqNomes(dados.retornosProximos, ['Bruno Retorno-2d'])],
  ['retornosAtrasados = [Carla]', eqNomes(dados.retornosAtrasados, ['Carla Retorno-Atrasado'])],
  ['planosVencendo = [Diego]', eqNomes(dados.planosVencendo, ['Diego Vence-1d'])],
  ['planosVencidos = [Eva]', eqNomes(dados.planosVencidos, ['Eva Vencida'])],
  ['tarefasAtrasadas = 1 (Bruno/B)', dados.tarefasAtrasadas.length === 1 && dados.tarefasAtrasadas[0].nomePaciente === 'Bruno Retorno-2d'],
  ['resumo.vencidos = 1', dados.resumo.vencidos === 1],
  ['resumo.ativos = 5', dados.resumo.ativos === 5], // 7 pacientes - 1 cancelado - 1 vencida
  ['resumo.paraVencer = 1', dados.resumo.paraVencer === 1],
  ['cancelado não aparece em vencidos', !dados.planosVencidos.some((p) => p.nome === 'Fabio Cancelado')],
]

let falhou = false
for (const [nome, ok] of checks) {
  console.log(`${ok ? '✅' : '❌'} ${nome}`)
  if (!ok) falhou = true
}

console.log('\n----- Pré-visualização da mensagem WhatsApp -----\n')
console.log(formatarRelatorio(dados))

if (falhou) {
  console.error('\n❌ Smoke test FALHOU')
  process.exit(1)
}
console.log('\n✅ Smoke test passou')

function eqNomes(linhas: Array<{ nome: string }>, esperado: string[]): boolean {
  const got = linhas.map((l) => l.nome).sort()
  const exp = [...esperado].sort()
  return got.length === exp.length && got.every((n, i) => n === exp[i])
}
