// =============================================================
// Logica de negocio das automacoes de formulario.
// Fonte unica da verdade: usada tanto pelos webhooks legados (Make) quanto
// pelos formularios nativos (/api/forms/[slug]/submit).
// =============================================================

import type { SupabaseClient } from '@supabase/supabase-js'

import { hoje, addDias, addMeses } from '@/lib/dates'
import { parsePlano, DURACAO_MESES } from '@/lib/parse-plano'

export type ResultadoAutomacao =
  | { ok: true; status: number; paciente_id: string; tarefa_id?: string; responsavel?: string }
  | { ok: false; status: number; error: string; details?: string }

interface EntradaComum {
  nome_completo: string
  /** Payload completo persistido em formularios_recebidos.dados_raw */
  dados_raw: Record<string, unknown>
  /** Definicao do formulario nativo (NULL para webhooks legados) */
  formulario_id?: string | null
}

interface EntradaAnamnese extends EntradaComum {
  email: string
  telefone?: string | null
  qual_plano: string
  tempo_plano?: string
  origem?: string | null
}

type EntradaComEmail = EntradaComum & { email: string }

const ORIGENS_VALIDAS = ['Instagram', 'TikTok', 'YouTube', 'Indicação'] as const

// -------------------------------------------------------------
// Anamnese — cria/reusa paciente + tarefa Modulo B com alternancia
// -------------------------------------------------------------
export async function processarAnamnese(
  supabase: SupabaseClient,
  input: EntradaAnamnese
): Promise<ResultadoAutomacao> {
  const { nome_completo, email, telefone, qual_plano, tempo_plano, origem, dados_raw, formulario_id } = input

  if (!nome_completo || !email || !qual_plano) {
    return { ok: false, status: 400, error: 'Campos obrigatorios: nome_completo, email, qual_plano' }
  }

  if (origem && !ORIGENS_VALIDAS.includes(origem as (typeof ORIGENS_VALIDAS)[number])) {
    return { ok: false, status: 400, error: 'Valor inválido para origem' }
  }

  const plano = parsePlano(qual_plano, tempo_plano)
  if (!plano) {
    return { ok: false, status: 400, error: 'Valores invalidos para qual_plano ou tempo_plano' }
  }

  const { tipo_plano, duracao_plano } = plano
  const meses = DURACAO_MESES[duracao_plano]
  const data_inicio = addDias(hoje(), 5)
  const data_vencimento_plano = addMeses(data_inicio, meses)
  const proximo_retorno = addDias(data_inicio, 30)

  try {
    // Reusa paciente existente (match por nome + email)
    const { data: existente } = await supabase
      .from('pacientes')
      .select('id')
      .ilike('nome', nome_completo)
      .eq('email', email)
      .limit(1)
      .single()

    let paciente_id: string
    if (existente) {
      paciente_id = existente.id
    } else {
      const { data: novoPaciente, error: errPaciente } = await supabase
        .from('pacientes')
        .insert({
          nome: nome_completo,
          email,
          telefone: telefone || null,
          tipo_plano,
          duracao_plano,
          data_inicio,
          data_vencimento_plano,
          proximo_retorno,
          status: 'ativo',
          origem: origem ?? null,
        })
        .select('id')
        .single()

      if (errPaciente || !novoPaciente) {
        return { ok: false, status: 500, error: 'Falha ao criar paciente', details: errPaciente?.message }
      }
      paciente_id = novoPaciente.id
    }

    // Alternancia Pablo/Estagiario via delegacao_controle
    const { data: delegacao } = await supabase
      .from('delegacao_controle')
      .select('id, ultimo_delegado, contador')
      .limit(1)
      .single()

    const { data: usuarios } = await supabase
      .from('usuarios')
      .select('id, perfil')
      .in('perfil', ['pablo', 'joao_estagiario'])
      .eq('ativo', true)

    if (!delegacao || !usuarios || usuarios.length < 2) {
      return { ok: false, status: 500, error: 'Configuracao de delegacao incompleta' }
    }

    const proximo_perfil = delegacao.ultimo_delegado === 'pablo' ? 'joao_estagiario' : 'pablo'
    const responsavel = usuarios.find((u) => u.perfil === proximo_perfil)
    if (!responsavel) {
      return { ok: false, status: 500, error: `Usuario com perfil ${proximo_perfil} nao encontrado` }
    }

    await supabase
      .from('delegacao_controle')
      .update({ ultimo_delegado: proximo_perfil, contador: delegacao.contador + 1 })
      .eq('id', delegacao.id)

    const { data: tarefa, error: errTarefa } = await supabase
      .from('tarefas')
      .insert({
        paciente_id,
        modulo: 'B',
        responsavel_id: responsavel.id,
        data_criacao: hoje(),
        data_prazo: addDias(hoje(), 3),
        status: 'pendente',
      })
      .select('id')
      .single()

    if (errTarefa || !tarefa) {
      return { ok: false, status: 500, error: 'Falha ao criar tarefa', details: errTarefa?.message }
    }

    await registrarFormulario(supabase, {
      paciente_id,
      tipo_formulario: 'anamnese',
      dados_raw,
      nome_formulario: nome_completo,
      email_formulario: email,
      formulario_id,
    })

    return { ok: true, status: 200, paciente_id, tarefa_id: tarefa.id, responsavel: proximo_perfil }
  } catch (error) {
    return { ok: false, status: 500, error: 'Erro interno', details: msg(error) }
  }
}

// -------------------------------------------------------------
// Fotos iniciais / Treino — apenas registram (paciente deve existir)
// -------------------------------------------------------------
export async function processarFotosIniciais(
  supabase: SupabaseClient,
  input: EntradaComEmail
): Promise<ResultadoAutomacao> {
  return registrarComPaciente(supabase, input, 'fotos_iniciais')
}

export async function processarTreino(
  supabase: SupabaseClient,
  input: EntradaComEmail
): Promise<ResultadoAutomacao> {
  return registrarComPaciente(supabase, input, 'treino')
}

async function registrarComPaciente(
  supabase: SupabaseClient,
  input: EntradaComEmail,
  tipo: 'fotos_iniciais' | 'treino'
): Promise<ResultadoAutomacao> {
  const { nome_completo, email, dados_raw, formulario_id } = input
  if (!nome_completo || !email) {
    return { ok: false, status: 400, error: 'Campos obrigatorios: nome_completo, email' }
  }

  try {
    const { data: paciente, error } = await supabase
      .from('pacientes')
      .select('id')
      .ilike('nome', nome_completo)
      .eq('email', email)
      .limit(1)
      .single()

    if (error || !paciente) {
      return { ok: false, status: 404, error: 'Paciente nao encontrado' }
    }

    await registrarFormulario(supabase, {
      paciente_id: paciente.id,
      tipo_formulario: tipo,
      dados_raw,
      nome_formulario: nome_completo,
      email_formulario: email,
      formulario_id,
    })

    return { ok: true, status: 200, paciente_id: paciente.id }
  } catch (error) {
    return { ok: false, status: 500, error: 'Erro interno', details: msg(error) }
  }
}

// -------------------------------------------------------------
// Fotos 30 dias — cria tarefa Modulo C para Pablo (+4 dias)
// -------------------------------------------------------------
export async function processarFotos30Dias(
  supabase: SupabaseClient,
  input: EntradaComum
): Promise<ResultadoAutomacao> {
  const { nome_completo, dados_raw, formulario_id } = input
  if (!nome_completo) {
    return { ok: false, status: 400, error: 'Campo obrigatorio: nome_completo' }
  }

  try {
    const { data: paciente, error } = await supabase
      .from('pacientes')
      .select('id')
      .ilike('nome', nome_completo)
      .limit(1)
      .single()

    if (error || !paciente) {
      return { ok: false, status: 404, error: 'Paciente nao encontrado' }
    }

    const pablo = await buscarPablo(supabase)
    if (!pablo) return { ok: false, status: 500, error: 'Usuario pablo nao encontrado' }

    const { data: tarefa, error: errTarefa } = await supabase
      .from('tarefas')
      .insert({
        paciente_id: paciente.id,
        modulo: 'C',
        responsavel_id: pablo,
        data_criacao: hoje(),
        data_prazo: addDias(hoje(), 4),
        status: 'pendente',
      })
      .select('id')
      .single()

    if (errTarefa || !tarefa) {
      return { ok: false, status: 500, error: 'Falha ao criar tarefa', details: errTarefa?.message }
    }

    await registrarFormulario(supabase, {
      paciente_id: paciente.id,
      tipo_formulario: 'fotos_30dias',
      dados_raw,
      nome_formulario: nome_completo,
      formulario_id,
    })

    return { ok: true, status: 200, paciente_id: paciente.id, tarefa_id: tarefa.id }
  } catch (error) {
    return { ok: false, status: 500, error: 'Erro interno', details: msg(error) }
  }
}

// -------------------------------------------------------------
// Feedback/retorno — cria tarefa Modulo D bloqueada (espera Joao gravar C)
// -------------------------------------------------------------
export async function processarRetornoDieta(
  supabase: SupabaseClient,
  input: EntradaComum
): Promise<ResultadoAutomacao> {
  const { nome_completo, dados_raw, formulario_id } = input
  if (!nome_completo) {
    return { ok: false, status: 400, error: 'Campo obrigatorio: nome_completo' }
  }

  try {
    const { data: paciente, error } = await supabase
      .from('pacientes')
      .select('id')
      .ilike('nome', nome_completo)
      .limit(1)
      .single()

    if (error || !paciente) {
      return { ok: false, status: 404, error: 'Paciente nao encontrado' }
    }

    const pablo = await buscarPablo(supabase)
    if (!pablo) return { ok: false, status: 500, error: 'Usuario pablo nao encontrado' }

    const { data: tarefaC } = await supabase
      .from('tarefas')
      .select('id')
      .eq('paciente_id', paciente.id)
      .eq('modulo', 'C')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const { data: tarefa, error: errTarefa } = await supabase
      .from('tarefas')
      .insert({
        paciente_id: paciente.id,
        modulo: 'D',
        responsavel_id: pablo,
        data_criacao: hoje(),
        data_prazo: addDias(hoje(), 3),
        status: 'bloqueada',
        tarefa_pai_id: tarefaC?.id || null,
      })
      .select('id')
      .single()

    if (errTarefa || !tarefa) {
      return { ok: false, status: 500, error: 'Falha ao criar tarefa', details: errTarefa?.message }
    }

    await registrarFormulario(supabase, {
      paciente_id: paciente.id,
      tipo_formulario: 'feedback_retorno',
      dados_raw,
      nome_formulario: nome_completo,
      formulario_id,
    })

    return { ok: true, status: 200, paciente_id: paciente.id, tarefa_id: tarefa.id }
  } catch (error) {
    return { ok: false, status: 500, error: 'Erro interno', details: msg(error) }
  }
}

// -------------------------------------------------------------
// Avulso (acao 'nenhuma') — so registra a resposta, sem criar tarefa.
// Tenta vincular a um paciente por nome+email (best-effort); pode ficar NULL.
// -------------------------------------------------------------
export async function registrarAvulso(
  supabase: SupabaseClient,
  input: EntradaComum & { email?: string | null }
): Promise<ResultadoAutomacao> {
  const { nome_completo, email, dados_raw, formulario_id } = input
  try {
    let paciente_id: string | null = null
    if (nome_completo) {
      const query = supabase.from('pacientes').select('id').ilike('nome', nome_completo)
      if (email) query.eq('email', email)
      const { data } = await query.limit(1).single()
      paciente_id = data?.id ?? null
    }

    await registrarFormulario(supabase, {
      paciente_id,
      tipo_formulario: 'avulso',
      dados_raw,
      nome_formulario: nome_completo || null,
      email_formulario: email ?? null,
      formulario_id,
    })

    return { ok: true, status: 200, paciente_id: paciente_id ?? '' }
  } catch (error) {
    return { ok: false, status: 500, error: 'Erro interno', details: msg(error) }
  }
}

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------
async function buscarPablo(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase
    .from('usuarios')
    .select('id')
    .eq('perfil', 'pablo')
    .eq('ativo', true)
    .limit(1)
    .single()
  return data?.id ?? null
}

interface RegistroFormulario {
  paciente_id: string | null
  tipo_formulario: string
  dados_raw: Record<string, unknown>
  nome_formulario?: string | null
  email_formulario?: string | null
  formulario_id?: string | null
}

async function registrarFormulario(supabase: SupabaseClient, reg: RegistroFormulario): Promise<void> {
  await supabase.from('formularios_recebidos').insert({
    paciente_id: reg.paciente_id,
    tipo_formulario: reg.tipo_formulario,
    dados_raw: reg.dados_raw,
    nome_formulario: reg.nome_formulario ?? null,
    email_formulario: reg.email_formulario ?? null,
    formulario_id: reg.formulario_id ?? null,
    processado: true,
  })
}

function msg(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown'
}
