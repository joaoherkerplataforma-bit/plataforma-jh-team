'use server'

import { createClient } from '@/lib/supabase/server'

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
