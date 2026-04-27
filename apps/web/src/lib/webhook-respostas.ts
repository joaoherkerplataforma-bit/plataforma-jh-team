/**
 * Tipo e validacao defensiva do array `respostas` enviado pelos webhooks
 * dos Google Forms (via Make).
 *
 * Padrao: se `respostas` nao vier no payload, comportamento idêntico ao
 * fluxo legado (compat 100%). Se vier malformado, o webhook loga um warning
 * e ignora o campo — nao bloqueia a requisicao.
 */

export interface PerguntaResposta {
  pergunta: string
  resposta: string
}

export function isValidRespostas(value: unknown): value is PerguntaResposta[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as PerguntaResposta).pergunta === 'string' &&
        typeof (item as PerguntaResposta).resposta === 'string'
    )
  )
}
