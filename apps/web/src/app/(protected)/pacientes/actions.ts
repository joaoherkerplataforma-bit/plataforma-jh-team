'use server'

import { createClient } from '@/lib/supabase/server'
import { delegarModuloB } from '@/lib/automacoes'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nao autenticado')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('perfil')
    .eq('id', user.id)
    .single()

  if (usuario?.perfil !== 'joao_admin') {
    throw new Error('Apenas joao_admin pode executar esta acao')
  }

  return supabase
}

export async function cancelarPaciente(id: string) {
  const supabase = await assertAdmin()

  const { error } = await supabase
    .from('pacientes')
    .update({ status: 'cancelado' })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function reativarPaciente(id: string) {
  const supabase = await assertAdmin()

  const { error } = await supabase
    .from('pacientes')
    .update({ status: 'ativo' })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function renovarPaciente(
  pacienteId: string,
  tipoplano: 'dieta' | 'completo',
  duracaoPlano: 'trimestral' | 'semestral' | 'anual',
): Promise<void> {
  const supabase = await assertAdmin()
  const { data: { user } } = await supabase.auth.getUser()

  const { error: errRpc } = await supabase.rpc('renovar_paciente', {
    p_paciente_id: pacienteId,
    p_tipo_plano: tipoplano,
    p_duracao_plano: duracaoPlano,
    p_renovado_por: user!.id,
  })
  if (errRpc) throw new Error(errRpc.message)

  // Busca nome do paciente para obs da tarefa B
  const { data: pacienteData } = await supabase
    .from('pacientes')
    .select('nome')
    .eq('id', pacienteId)
    .single()

  // Cria tarefa B com alternancia Pablo/Estagiario
  const resultado = await delegarModuloB(supabase, pacienteId, pacienteData?.nome ?? '')
  if (!resultado.ok) throw new Error(resultado.error)
}
