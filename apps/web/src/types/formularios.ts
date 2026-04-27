export type TipoFormulario =
  | 'anamnese'
  | 'fotos_iniciais'
  | 'treino'
  | 'fotos_30dias'
  | 'feedback_retorno'

export interface PerguntaResposta {
  pergunta: string
  resposta: string
}

export interface FormularioRecebido {
  id: string
  paciente_id: string
  tipo_formulario: TipoFormulario
  dados_raw: Record<string, unknown> & { respostas?: PerguntaResposta[] }
  criado_em: string
}

export interface CardFormulario {
  tipo: TipoFormulario
  titulo: string
  status: 'respondido' | 'aguardando'
  /** criado_em do registro, se respondido */
  data?: string
  /** para fotos_30dias e feedback_retorno */
  cicloNumero?: number
  /** dados completos se respondido */
  formulario?: FormularioRecebido
}
