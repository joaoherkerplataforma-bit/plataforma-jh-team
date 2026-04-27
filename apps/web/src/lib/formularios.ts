import type {
  CardFormulario,
  FormularioRecebido,
  PerguntaResposta,
  TipoFormulario,
} from '@/types/formularios'

export const LABELS_FORMULARIO: Record<TipoFormulario, string> = {
  anamnese: 'Anamnese (Diagnóstico Dieta)',
  fotos_iniciais: 'Fotos Iniciais',
  treino: 'Diagnóstico Treino',
  fotos_30dias: 'Fotos 30 dias',
  feedback_retorno: 'Feedback & Retorno',
}

export const ORDEM_JORNADA: TipoFormulario[] = [
  'anamnese',
  'fotos_iniciais',
  'treino',
  'fotos_30dias',
  'feedback_retorno',
]

const FOTO_REGEX = /^https?:\/\/.*\.(jpg|jpeg|png|webp|heic|gif)(\?.*)?$/i
const DRIVE_FILE_REGEX = /^https?:\/\/(drive\.google\.com|lh\d+\.googleusercontent\.com)\//i

/**
 * Extrai array `respostas` do JSON `dados_raw`. Retorna `[]` se não houver
 * array válido — nunca quebra a página se o payload do Make estiver
 * incompleto ou em formato inesperado.
 */
export function parseDadosRaw(dadosRaw: unknown): PerguntaResposta[] {
  if (!dadosRaw || typeof dadosRaw !== 'object') return []
  const respostas = (dadosRaw as { respostas?: unknown }).respostas
  if (!Array.isArray(respostas)) return []
  const result: PerguntaResposta[] = []
  for (const item of respostas) {
    if (!item || typeof item !== 'object') continue
    const pergunta = (item as { pergunta?: unknown }).pergunta
    const resposta = (item as { resposta?: unknown }).resposta
    if (typeof pergunta === 'string' && typeof resposta === 'string') {
      result.push({ pergunta, resposta })
    }
  }
  return result
}

/**
 * Detecta se uma resposta é uma URL de foto. Considera extensões comuns e
 * URLs do Google Drive sem extensão (que serão tratadas como foto pelo
 * componente de modal quando o tipo de formulário for de fotos).
 */
export function isFotoUrl(resposta: string): boolean {
  if (typeof resposta !== 'string') return false
  if (FOTO_REGEX.test(resposta)) return true
  if (DRIVE_FILE_REGEX.test(resposta)) return true
  return false
}

/**
 * Monta a sequência de cards na ordem da jornada do paciente.
 *
 * Ordem fixa:
 *   1. Anamnese
 *   2. Fotos iniciais
 *   3. Treino (apenas plano completo)
 *   4. Pares (Fotos 30 dias / Feedback retorno) por ciclo, em ordem
 *      cronológica. Cada ciclo é numerado a partir de 1. Se um lado do par
 *      não existe naquele ciclo, mostra "Aguardando".
 *
 * Se ainda não houver nenhum formulário de retorno, mostra exatamente um
 * par vazio do ciclo 1 (foto30 + feedback) com status "aguardando".
 */
export function montarCardsDoCiclo(
  formularios: FormularioRecebido[],
  tipoPlano: 'dieta' | 'completo',
): CardFormulario[] {
  const cards: CardFormulario[] = []

  const buscarPrimeiro = (tipo: TipoFormulario): FormularioRecebido | undefined =>
    formularios.find((f) => f.tipo_formulario === tipo)

  const ordenarPorData = (lista: FormularioRecebido[]): FormularioRecebido[] =>
    [...lista].sort(
      (a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime(),
    )

  // Card 1: anamnese
  const anamnese = buscarPrimeiro('anamnese')
  cards.push({
    tipo: 'anamnese',
    titulo: LABELS_FORMULARIO.anamnese,
    status: anamnese ? 'respondido' : 'aguardando',
    data: anamnese?.criado_em,
    formulario: anamnese,
  })

  // Card 2: fotos_iniciais
  const fotosIniciais = buscarPrimeiro('fotos_iniciais')
  cards.push({
    tipo: 'fotos_iniciais',
    titulo: LABELS_FORMULARIO.fotos_iniciais,
    status: fotosIniciais ? 'respondido' : 'aguardando',
    data: fotosIniciais?.criado_em,
    formulario: fotosIniciais,
  })

  // Card 3: treino (apenas plano completo)
  if (tipoPlano === 'completo') {
    const treino = buscarPrimeiro('treino')
    cards.push({
      tipo: 'treino',
      titulo: LABELS_FORMULARIO.treino,
      status: treino ? 'respondido' : 'aguardando',
      data: treino?.criado_em,
      formulario: treino,
    })
  }

  // Cards 4+: pares por ciclo
  const fotos30 = ordenarPorData(
    formularios.filter((f) => f.tipo_formulario === 'fotos_30dias'),
  )
  const feedbacks = ordenarPorData(
    formularios.filter((f) => f.tipo_formulario === 'feedback_retorno'),
  )

  const totalCiclos = Math.max(fotos30.length, feedbacks.length, 1)

  for (let i = 0; i < totalCiclos; i++) {
    const cicloNumero = i + 1
    const f30 = fotos30[i]
    const fb = feedbacks[i]

    cards.push({
      tipo: 'fotos_30dias',
      titulo: LABELS_FORMULARIO.fotos_30dias,
      status: f30 ? 'respondido' : 'aguardando',
      data: f30?.criado_em,
      cicloNumero,
      formulario: f30,
    })

    cards.push({
      tipo: 'feedback_retorno',
      titulo: LABELS_FORMULARIO.feedback_retorno,
      status: fb ? 'respondido' : 'aguardando',
      data: fb?.criado_em,
      cicloNumero,
      formulario: fb,
    })
  }

  return cards
}
