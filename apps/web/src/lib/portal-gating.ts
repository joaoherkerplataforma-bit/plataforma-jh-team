import type {
  ProgressoVideoaula,
  Videoaula,
  VideoaulaComProgresso,
} from '@/types/videoaulas'

/**
 * Lógica pura de desbloqueio sequencial das videoaulas do Portal do Aluno.
 *
 * Regras:
 *   - Aluno só acessa a "área personalizada" (dieta/treino externos) depois
 *     de assistir TODAS as videoaulas ativas.
 *   - Videoaulas são desbloqueadas em ordem: a próxima só libera quando a
 *     anterior foi marcada como assistida.
 *   - A primeira videoaula da trilha começa sempre desbloqueada.
 *
 * Sem I/O: estas funções recebem dados já carregados e retornam cálculos.
 */

/**
 * Determina se o aluno já pode acessar a área personalizada (dieta/treino).
 * True quando todas as videoaulas ativas foram assistidas (e existe pelo
 * menos uma videoaula ativa).
 */
export function podeAcessarAreaPersonalizada(
  progresso: ProgressoVideoaula[],
  videoaulasAtivas: Videoaula[],
): boolean {
  if (videoaulasAtivas.length === 0) return false

  const idsAssistidas = new Set(progresso.map((p) => p.videoaula_id))
  return videoaulasAtivas.every((v) => idsAssistidas.has(v.id))
}

/**
 * Calcula `assistida` e `desbloqueada` para cada videoaula da trilha.
 *
 * - Assume que `videoaulas` já vem ordenado por `ordem` ASC (caller
 *   garante via query); reordena defensivamente para não depender disso.
 * - Primeira videoaula: sempre desbloqueada.
 * - Demais: desbloqueada se a anterior na ordem já foi assistida.
 */
export function calcularDesbloqueio(
  videoaulas: Videoaula[],
  progresso: ProgressoVideoaula[],
): VideoaulaComProgresso[] {
  const idsAssistidas = new Set(progresso.map((p) => p.videoaula_id))
  const ordenadas = [...videoaulas].sort((a, b) => a.ordem - b.ordem)

  const resultado: VideoaulaComProgresso[] = []
  let anteriorAssistida = true // primeira videoaula sempre desbloqueada

  for (const v of ordenadas) {
    const assistida = idsAssistidas.has(v.id)
    const desbloqueada = anteriorAssistida
    resultado.push({ ...v, assistida, desbloqueada })
    anteriorAssistida = assistida
  }

  return resultado
}

/**
 * Retorna a próxima videoaula que o aluno deve assistir (primeira
 * desbloqueada e não assistida). Null quando todas já foram assistidas
 * ou nenhuma existe.
 */
export function proximaVideoaula(
  videoaulasComProgresso: VideoaulaComProgresso[],
): VideoaulaComProgresso | null {
  for (const v of videoaulasComProgresso) {
    if (v.desbloqueada && !v.assistida) return v
  }
  return null
}

/**
 * Verifica se o aluno tem direito de assistir a uma videoaula específica.
 * Usado pelo backend antes de gerar a signed URL.
 *
 * Retorna true quando a videoaula está na trilha calculada e marcada como
 * desbloqueada. Retorna false se a videoaula não existe na lista, está
 * inativa (não veio na lista) ou ainda está bloqueada.
 */
export function podeAcessarVideoaula(
  videoaulaId: string,
  videoaulas: Videoaula[],
  progresso: ProgressoVideoaula[],
): boolean {
  const trilha = calcularDesbloqueio(videoaulas, progresso)
  const item = trilha.find((v) => v.id === videoaulaId)
  return Boolean(item?.desbloqueada)
}
