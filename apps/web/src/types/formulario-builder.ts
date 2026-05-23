// =============================================================
// Tipos do construtor de formularios nativo.
// =============================================================

export type TipoCampo =
  | 'texto_curto'
  | 'texto_longo'
  | 'email'
  | 'telefone'
  | 'escolha_unica'
  | 'escolha_multipla'
  | 'escala_0_10'
  | 'numero'
  | 'data'
  | 'upload_foto'

export type AcaoFormulario =
  | 'anamnese'
  | 'fotos_iniciais'
  | 'treino'
  | 'fotos_30dias'
  | 'feedback_retorno'
  | 'nenhuma'

/** Atributo do paciente que o campo alimenta (usado pela logica de negocio). */
export type MapeiaPara = 'nome' | 'email' | 'telefone' | 'qual_plano' | 'origem'

export interface CampoFormulario {
  key: string
  tipo: TipoCampo
  label: string
  descricao?: string
  obrigatorio: boolean
  opcoes?: string[]
  mapeia_para?: MapeiaPara | null
}

export interface Formulario {
  id: string
  slug: string
  titulo: string
  descricao: string | null
  acao: AcaoFormulario
  campos: CampoFormulario[]
  ativo: boolean
  share_token: string
  created_at: string
  updated_at: string
}

/** Versao para listagem (sem os campos, com contagem de respostas). */
export interface FormularioResumo {
  id: string
  slug: string
  titulo: string
  acao: AcaoFormulario
  ativo: boolean
  share_token: string
  total_campos: number
  total_respostas: number
}

export const TIPO_CAMPO_LABELS: Record<TipoCampo, string> = {
  texto_curto: 'Texto curto',
  texto_longo: 'Texto longo',
  email: 'E-mail',
  telefone: 'Telefone',
  escolha_unica: 'Escolha única',
  escolha_multipla: 'Múltipla escolha',
  escala_0_10: 'Escala 0–10',
  numero: 'Número',
  data: 'Data',
  upload_foto: 'Upload de foto',
}

export const ACAO_LABELS: Record<AcaoFormulario, string> = {
  anamnese: 'Anamnese (cria paciente + tarefa)',
  fotos_iniciais: 'Fotos iniciais',
  treino: 'Diagnóstico de treino',
  fotos_30dias: 'Fotos 30 dias (cria tarefa de fotos)',
  feedback_retorno: 'Feedback/retorno (cria tarefa de dieta)',
  nenhuma: 'Nenhuma (apenas registra respostas)',
}

/** Tipos de campo que usam lista de opções. */
export const TIPOS_COM_OPCOES: readonly TipoCampo[] = ['escolha_unica', 'escolha_multipla'] as const

/** Tipos de campo que aceitam mapeamento para atributo do paciente. */
export const MAPEAMENTOS: readonly MapeiaPara[] = ['nome', 'email', 'telefone', 'qual_plano', 'origem'] as const

export const MAPEAMENTO_LABELS: Record<MapeiaPara, string> = {
  nome: 'Nome do paciente',
  email: 'E-mail do paciente',
  telefone: 'Telefone do paciente',
  qual_plano: 'Plano contratado',
  origem: 'Origem (como conheceu)',
}
