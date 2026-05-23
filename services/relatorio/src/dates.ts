// =============================================================
// Utilitários de data. Tudo trabalha com strings YYYY-MM-DD e
// calcula "hoje" no fuso da operação (BRT por padrão) — o relatório
// dispara às 8h BRT, então a data de referência tem que ser a local.
// =============================================================

/**
 * Data de "hoje" (YYYY-MM-DD) no fuso informado.
 * en-CA formata como YYYY-MM-DD, o que evita parsing manual.
 */
export function hojeNoFuso(timezone: string): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return fmt.format(new Date())
}

/**
 * Diferença em dias inteiros entre `alvo` e `base` (alvo - base).
 * Ambas no formato YYYY-MM-DD. Positivo = alvo no futuro.
 * Usa Date.UTC para ignorar horário/fuso e evitar erros de DST.
 */
export function diasEntre(alvo: string, base: string): number {
  const a = ymdParaUTC(alvo)
  const b = ymdParaUTC(base)
  return Math.round((a - b) / 86_400_000)
}

function ymdParaUTC(ymd: string): number {
  const [ano, mes, dia] = ymd.split('-').map(Number)
  return Date.UTC(ano, mes - 1, dia)
}

/** Converte YYYY-MM-DD em DD/MM/YYYY para exibição. */
export function formatarDataBR(ymd: string): string {
  const [ano, mes, dia] = ymd.split('-')
  return `${dia}/${mes}/${ano}`
}

/** "hoje", "1 dia", "3 dias" — texto amigável para contagem de dias. */
export function plural(qtd: number, singular: string, plural: string): string {
  return `${qtd} ${qtd === 1 ? singular : plural}`
}
