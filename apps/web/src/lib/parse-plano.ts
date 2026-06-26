/**
 * Parser de qual_plano / tempo_plano para o webhook de anamnese.
 *
 * O Google Forms entrega `qual_plano` no formato combinado "Tempo - Plano",
 * mas testes manuais e payloads legados podem mandar literais. Este modulo
 * suporta ambos.
 */

const PLANO_MAP: Record<string, string> = {
  dieta: 'dieta',
  completo: 'completo',
}

const DURACAO_MAP: Record<string, string> = {
  trimestral: 'trimestral',
  semestral: 'semestral',
  anual: 'anual',
}

export const DURACAO_MESES: Record<string, number> = {
  trimestral: 3,
  semestral: 6,
  anual: 12,
}

/**
 * Margem adicional (em dias) somada ao vencimento do plano, alem da duracao
 * em meses. O vencimento e calculado como: data_inicio + N meses + 15 dias.
 */
export const MARGEM_VENCIMENTO_DIAS = 15

/**
 * Parseia os campos qual_plano e tempo_plano do payload da anamnese.
 *
 * Aceita dois formatos:
 *
 * 1. Literal (legado / testes manuais):
 *    qual_plano = "Dieta" | "Completo"
 *    tempo_plano = "Trimestral" | "Semestral" | "Anual"
 *
 * 2. Combinado (Google Forms):
 *    qual_plano = "{Tempo} - {Plano}" (ex.: "Trimestral - Dieta + Treino")
 *    tempo_plano e ignorado quando qual_plano contem " - "
 *
 * Retorna { tipo_plano, duracao_plano } normalizados em minusculas, ou null
 * se nao foi possivel resolver os valores.
 */
export function parsePlano(
  qual_plano: string,
  tempo_plano?: string
): { tipo_plano: string; duracao_plano: string } | null {
  if (!qual_plano || typeof qual_plano !== 'string') return null

  const raw = qual_plano.trim()

  // Formato combinado: "Tempo - Plano [+ Treino]"
  if (raw.includes(' - ')) {
    const [tempoParte, planoParte] = raw.split(' - ', 2).map((s) => s.trim())
    if (!tempoParte || !planoParte) return null

    const duracao = DURACAO_MAP[tempoParte.toLowerCase()]
    if (!duracao) return null

    // "Dieta + Treino" -> completo, "Dieta" sozinho -> dieta
    const planoLower = planoParte.toLowerCase()
    const temTreino = planoLower.includes('treino')
    const tipo = temTreino ? 'completo' : 'dieta'

    return { tipo_plano: tipo, duracao_plano: duracao }
  }

  // Formato literal: qual_plano + tempo_plano separados
  const tipo = PLANO_MAP[raw.toLowerCase()]
  if (!tipo) return null

  if (!tempo_plano || typeof tempo_plano !== 'string') return null
  const duracao = DURACAO_MAP[tempo_plano.trim().toLowerCase()]
  if (!duracao) return null

  return { tipo_plano: tipo, duracao_plano: duracao }
}
