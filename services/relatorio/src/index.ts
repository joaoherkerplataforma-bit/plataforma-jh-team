// =============================================================
// JH TEAM — Serviço de Relatório Diário
// Deploy: Railway | Execução: cron job às 8h (BRT) todos os dias
// Canal: WhatsApp Business API → João Herker
//
// Modos:
//   npm start                 → executa uma vez e sai (cron do Railway)
//   npm run start:scheduler   → fica de pé e dispara às 8h via node-cron
//   npm run report:dry        → monta e imprime o relatório (sem enviar)
//
// Flags: --once (padrão) | --scheduler | --dry
// =============================================================

import 'dotenv/config'
import cron from 'node-cron'

import { carregarConfig } from './config'
import { criarClienteSupabase } from './supabase'
import { hojeNoFuso } from './dates'
import { montarRelatorio } from './relatorio'
import { formatarRelatorio } from './formatar'
import { enviarRelatorioWhatsApp } from './whatsapp'

interface Opcoes {
  scheduler: boolean
  dry: boolean
}

function parseArgs(argv: string[]): Opcoes {
  return {
    scheduler: argv.includes('--scheduler'),
    dry: argv.includes('--dry'),
  }
}

function log(msg: string): void {
  console.log(`[${new Date().toISOString()}] [JH TEAM] ${msg}`)
}

/** Monta, formata e (se configurado) envia o relatório diário. */
async function executarRelatorio(dry: boolean): Promise<void> {
  const config = carregarConfig()
  const supabase = criarClienteSupabase(config)

  const hoje = hojeNoFuso(config.timezone)
  log(`Montando relatório de ${hoje} (fuso ${config.timezone})...`)

  const dados = await montarRelatorio(supabase, hoje)
  const texto = formatarRelatorio(dados)

  log(
    `Relatório: ${dados.resumo.ativos} ativos, ${dados.resumo.vencidos} vencidos, ` +
      `${dados.resumo.paraVencer} para vencer, ${dados.tarefasAtrasadas.length} tarefa(s) atrasada(s).`
  )

  if (dry) {
    log('Modo --dry: relatório não será enviado. Conteúdo abaixo:')
    console.log('\n' + texto + '\n')
    return
  }

  if (!config.whatsapp) {
    log(
      'WhatsApp não configurado (defina WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN / ' +
        'WHATSAPP_RECIPIENT). Imprimindo o relatório no log:'
    )
    console.log('\n' + texto + '\n')
    return
  }

  log('Enviando relatório via WhatsApp...')
  const resultado = await enviarRelatorioWhatsApp(texto, config.whatsapp)
  if (resultado.enviado) {
    log(`Relatório enviado com sucesso (${resultado.partes} parte(s)).`)
  } else {
    throw new Error(`Falha ao enviar WhatsApp: ${resultado.erro}`)
  }
}

async function main(): Promise<void> {
  const opcoes = parseArgs(process.argv.slice(2))

  if (opcoes.scheduler) {
    const config = carregarConfig()
    if (!cron.validate(config.cronSchedule)) {
      throw new Error(`REPORT_CRON inválido: "${config.cronSchedule}"`)
    }
    log(
      `Modo scheduler ativo. Agendado para "${config.cronSchedule}" no fuso ${config.timezone}.`
    )
    cron.schedule(
      config.cronSchedule,
      () => {
        executarRelatorio(opcoes.dry).catch((erro) => {
          log(`ERRO no relatório agendado: ${erro instanceof Error ? erro.message : erro}`)
        })
      },
      { timezone: config.timezone }
    )
    // Mantém o processo vivo.
    return
  }

  // Modo one-shot (padrão): executa e sai. Ideal para o cron do Railway.
  await executarRelatorio(opcoes.dry)
  log('Concluído.')
}

main().catch((erro) => {
  log(`ERRO FATAL: ${erro instanceof Error ? erro.message : erro}`)
  process.exit(1)
})
