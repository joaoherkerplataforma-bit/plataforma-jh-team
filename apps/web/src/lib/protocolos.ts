import type { SupabaseClient } from '@supabase/supabase-js'

export interface ProtocoloAtivo {
  id: string
  paciente_id: string
  tipo: 'dieta' | 'treino' | 'dieta_e_treino'
  link_webdiet: string | null
  link_mfit: string | null
  versao: number
  ativo: boolean
}

/**
 * Busca o protocolo ativo de um paciente. Retorna `null` se nenhum protocolo
 * ativo for encontrado (paciente sem protocolo cadastrado ainda).
 */
export async function buscarProtocoloAtivo(
  supabase: SupabaseClient,
  pacienteId: string,
): Promise<ProtocoloAtivo | null> {
  const { data, error } = await supabase
    .from('protocolos_base')
    .select(
      'id, paciente_id, tipo, link_webdiet, link_mfit, versao, ativo',
    )
    .eq('paciente_id', pacienteId)
    .eq('ativo', true)
    .order('versao', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return data as ProtocoloAtivo
}
