'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { autorizarEquipe } from '@/lib/auth'
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

/**
 * Atualiza manualmente as datas do plano de um paciente.
 * Liberada para toda a equipe (joao_admin, pablo, joao_estagiario) via
 * autorizarEquipe(). Usa service_role para o UPDATE, restrito por whitelist
 * as 3 colunas de data. Nao altera nenhuma outra coluna nem dispara cascata.
 */
export async function atualizarDatasPaciente(
  id: string,
  dados: {
    data_inicio?: string
    data_vencimento_plano?: string
    proximo_retorno?: string
  },
): Promise<{ success: boolean; error?: string }> {
  const auth = await autorizarEquipe()
  if (!auth.ok) return { success: false, error: auth.error }

  // Whitelist estrita: apenas as 3 colunas de data podem ser atualizadas.
  const updates: {
    data_inicio?: string
    data_vencimento_plano?: string
    proximo_retorno?: string
  } = {}
  if (dados.data_inicio !== undefined) updates.data_inicio = dados.data_inicio
  if (dados.data_vencimento_plano !== undefined) updates.data_vencimento_plano = dados.data_vencimento_plano
  if (dados.proximo_retorno !== undefined) updates.proximo_retorno = dados.proximo_retorno

  if (Object.keys(updates).length === 0) {
    return { success: false, error: 'Nenhuma data informada para atualizar' }
  }

  const service = createServiceClient()

  // Guard obrigatorio: vencimento > inicio. Quando apenas um dos dois for
  // informado, compara com o valor atual do paciente.
  if (updates.data_inicio !== undefined || updates.data_vencimento_plano !== undefined) {
    const { data: atual, error: errBusca } = await service
      .from('pacientes')
      .select('data_inicio, data_vencimento_plano')
      .eq('id', id)
      .single()

    if (errBusca || !atual) {
      return { success: false, error: 'Paciente nao encontrado' }
    }

    const inicio = updates.data_inicio ?? atual.data_inicio
    const vencimento = updates.data_vencimento_plano ?? atual.data_vencimento_plano

    // Datas em formato YYYY-MM-DD: comparacao lexicografica equivale a cronologica.
    if (inicio && vencimento && vencimento <= inicio) {
      return {
        success: false,
        error: 'A data de vencimento do plano deve ser posterior a data de inicio.',
      }
    }
  }

  const { error } = await service.from('pacientes').update(updates).eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/pacientes')
  return { success: true }
}
