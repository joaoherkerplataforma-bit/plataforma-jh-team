import { formatarDataBR, plural } from './dates'
import type { ModuloTarefa, RelatorioData } from './types'

const MODULO_LABEL: Record<ModuloTarefa, string> = {
  B: 'Protocolo novo',
  C: 'Fotos antes/depois',
  D: 'Retorno dietético',
}

/**
 * Renderiza o relatório diário como texto pronto para o WhatsApp.
 * Segue o conteúdo definido no PROJETO.md (seção "Relatório diário").
 */
export function formatarRelatorio(r: RelatorioData): string {
  const linhas: string[] = []

  linhas.push('*JH TEAM — Relatório diário*')
  linhas.push(`📅 ${formatarDataBR(r.hoje)}`)
  linhas.push('')

  // 1. Quem precisa enviar formulários de 30 dias hoje
  linhas.push('📨 *Enviar formulários de 30 dias hoje*')
  if (r.enviarFormularios30.length === 0) {
    linhas.push('_Ninguém hoje._')
  } else {
    for (const p of r.enviarFormularios30) {
      linhas.push(`• ${p.nome}`)
    }
  }
  linhas.push('')

  // 2. Retornos próximos (1–3 dias) + atrasados
  linhas.push('🔁 *Retornos próximos*')
  if (r.retornosProximos.length === 0 && r.retornosAtrasados.length === 0) {
    linhas.push('_Nenhum retorno nos próximos dias._')
  } else {
    for (const p of r.retornosProximos) {
      linhas.push(
        `• ${p.nome} — em ${plural(p.diasParaRetorno, 'dia', 'dias')} (${formatarDataBR(p.proximoRetorno)})`
      )
    }
    for (const p of r.retornosAtrasados) {
      const atraso = Math.abs(p.diasParaRetorno)
      linhas.push(
        `• ⚠️ ${p.nome} — retorno passou há ${plural(atraso, 'dia', 'dias')} (${formatarDataBR(p.proximoRetorno)})`
      )
    }
  }
  linhas.push('')

  // 3. Planos vencendo em breve
  linhas.push('⏳ *Planos vencendo em breve*')
  if (r.planosVencendo.length === 0) {
    linhas.push('_Nenhum plano vencendo nos próximos dias._')
  } else {
    for (const p of r.planosVencendo) {
      const quando =
        p.diasAtivos === 0 ? 'vence hoje' : `vence em ${plural(p.diasAtivos, 'dia', 'dias')}`
      linhas.push(`• ${p.nome} — ${quando} (${formatarDataBR(p.dataVencimento)})`)
    }
  }
  linhas.push('')

  // 4. Planos vencidos (renovação)
  linhas.push('🔴 *Planos vencidos (renovação)*')
  if (r.planosVencidos.length === 0) {
    linhas.push('_Nenhum plano vencido._')
  } else {
    for (const p of r.planosVencidos) {
      const atraso = Math.abs(p.diasAtivos)
      linhas.push(
        `• ${p.nome} — venceu há ${plural(atraso, 'dia', 'dias')} (${formatarDataBR(p.dataVencimento)})`
      )
    }
  }
  linhas.push('')

  // 5. Tarefas atrasadas (sem conclusão há mais de 3 dias)
  linhas.push('🚨 *Tarefas atrasadas*')
  if (r.tarefasAtrasadas.length === 0) {
    linhas.push('_Nenhuma tarefa atrasada._')
  } else {
    for (const t of r.tarefasAtrasadas) {
      linhas.push(
        `• ${t.nomePaciente} — ${MODULO_LABEL[t.modulo]} — atrasada há ${plural(t.diasDeAtraso, 'dia', 'dias')}`
      )
    }
  }
  linhas.push('')

  // 6. Resumo
  linhas.push('📊 *Resumo*')
  linhas.push(
    `${r.resumo.ativos} ativos · ${r.resumo.vencidos} vencidos · ${r.resumo.paraVencer} para vencer`
  )

  return linhas.join('\n')
}
