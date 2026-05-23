import type { WhatsAppConfig } from './config'

// WhatsApp limita o corpo de mensagens de texto a 4096 caracteres.
// Deixamos folga para não esbarrar no limite ao quebrar por linhas.
const LIMITE_CHUNK = 3800

export interface ResultadoEnvio {
  enviado: boolean
  partes: number
  erro?: string
}

/**
 * Envia o relatório via WhatsApp Business API (Meta Cloud API).
 * Mensagens longas são divididas em várias partes, respeitando o limite
 * de caracteres e quebrando sempre em fim de linha.
 *
 * Observação operacional: mensagens proativas (fora da janela de 24h de
 * atendimento) podem exigir um *template* aprovado pela Meta. Este envio usa
 * texto livre — funciona quando o João interage com o número diariamente.
 * Veja o README para a alternativa com template.
 */
export async function enviarRelatorioWhatsApp(
  texto: string,
  cfg: WhatsAppConfig
): Promise<ResultadoEnvio> {
  const partes = dividirEmPartes(texto, LIMITE_CHUNK)
  const url = `https://graph.facebook.com/${cfg.apiVersion}/${cfg.phoneNumberId}/messages`

  try {
    for (let i = 0; i < partes.length; i++) {
      const corpo = partes.length > 1 ? `(${i + 1}/${partes.length})\n${partes[i]}` : partes[i]
      await enviarTexto(url, cfg, corpo)
    }
    return { enviado: true, partes: partes.length }
  } catch (erro) {
    return {
      enviado: false,
      partes: partes.length,
      erro: erro instanceof Error ? erro.message : 'Erro desconhecido',
    }
  }
}

async function enviarTexto(url: string, cfg: WhatsAppConfig, body: string): Promise<void> {
  const resposta = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: cfg.recipient,
      type: 'text',
      text: { preview_url: false, body },
    }),
  })

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => '')
    throw new Error(`WhatsApp API ${resposta.status}: ${detalhe}`)
  }
}

/**
 * Divide o texto em partes de no máximo `limite` caracteres, quebrando
 * em fim de linha. Linhas isoladas maiores que o limite são fatiadas.
 */
export function dividirEmPartes(texto: string, limite: number): string[] {
  if (texto.length <= limite) return [texto]

  const partes: string[] = []
  let atual = ''

  for (const linha of texto.split('\n')) {
    const candidato = atual ? `${atual}\n${linha}` : linha
    if (candidato.length <= limite) {
      atual = candidato
      continue
    }
    if (atual) {
      partes.push(atual)
      atual = ''
    }
    // Linha sozinha estoura o limite: fatiar em pedaços fixos.
    if (linha.length > limite) {
      for (let i = 0; i < linha.length; i += limite) {
        partes.push(linha.slice(i, i + limite))
      }
    } else {
      atual = linha
    }
  }

  if (atual) partes.push(atual)
  return partes
}
