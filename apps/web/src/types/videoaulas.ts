export interface Videoaula {
  id: string
  titulo: string
  descricao: string | null
  ordem: number
  storage_path: string
  duracao_seg: number | null
  ativo: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface VideoaulaInsert {
  id?: string
  titulo: string
  descricao?: string | null
  ordem: number
  storage_path: string
  duracao_seg?: number | null
  ativo?: boolean
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

export interface VideoaulaUpdate {
  id?: string
  titulo?: string
  descricao?: string | null
  ordem?: number
  storage_path?: string
  duracao_seg?: number | null
  ativo?: boolean
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

export interface ProgressoVideoaula {
  id: string
  aluno_id: string
  videoaula_id: string
  assistido_em: string
}

export interface ProgressoVideoaulaInsert {
  id?: string
  aluno_id: string
  videoaula_id: string
  assistido_em?: string
}

export interface VideoaulaComProgresso extends Videoaula {
  assistida: boolean
  desbloqueada: boolean
}
