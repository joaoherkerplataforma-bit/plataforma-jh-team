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
const ERRO_EMAIL_NAO_ENCONTRADO =
  'E-mail não encontrado, verifique se há erros de digitação e tente novamente'
const DIAS_MINIMOS_ENTRE_FOTOS_RETORNO = 25

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
    const resultadoDelegacao = await delegarModuloB(supabase, paciente_id, nome_completo)
    if (!resultadoDelegacao.ok) return resultadoDelegacao

    await registrarFormulario(supabase, {
      paciente_id,
      tipo_formulario: 'anamnese',
      dados_raw,
      nome_formulario: nome_completo,
      email_formulario: email,
      formulario_id,
    })

    return { ok: true, status: 200, paciente_id, tarefa_id: resultadoDelegacao.tarefa_id, responsavel: resultadoDelegacao.responsavel }
  } catch (error) {
    return { ok: false, status: 500, error: 'Erro interno', details: msg(error) }
  }
}

// -------------------------------------------------------------
// Fotos iniciais — registra + cria tarefa Modulo C (Pablo)
// -------------------------------------------------------------
export async function processarFotosIniciais(
  supabase: SupabaseClient,
  input: EntradaComEmail
): Promise<ResultadoAutomacao> {
  const { nome_completo, email, dados_raw, formulario_id } = input
  if (!nome_completo || !email) {
    return { ok: false, status: 400, error: 'Campos obrigatorios: nome_completo, email' }
  }

  try {
    const { data: paciente, error } = await supabase
      .from('pacientes')
      .select('id')
      .eq('email', email)
      .limit(1)
      .single()

    if (error || !paciente) {
      return { ok: false, status: 404, error: ERRO_EMAIL_NAO_ENCONTRADO }
    }

    // Idempotência: só cria tarefa se não houver fotos_iniciais já registrada
    const jaProcessado = await formularioJaRegistrado(supabase, paciente.id, 'fotos_iniciais')

    let tarefa_id: string | undefined
    if (!jaProcessado) {
      const responsavelFotos = await buscarResponsavelFotos(supabase)
      if (!responsavelFotos) {
        return { ok: false, status: 500, error: 'Usuario responsavel pelas fotos nao encontrado' }
      }

      const { data: tarefa, error: errTarefa } = await supabase
        .from('tarefas')
        .insert({
          paciente_id: paciente.id,
          modulo: 'C',
          responsavel_id: responsavelFotos,
          data_criacao: hoje(),
          data_prazo: addDias(hoje(), 4),
          status: 'pendente',
          observacoes_joao: `Fotos iniciais — ${nome_completo}`,
        })
        .select('id')
        .single()

      if (errTarefa || !tarefa) {
        return { ok: false, status: 500, error: 'Falha ao criar tarefa', details: errTarefa?.message }
      }
      tarefa_id = tarefa.id
    }

    await registrarFormulario(supabase, {
      paciente_id: paciente.id,
      tipo_formulario: 'fotos_iniciais',
      dados_raw,
      nome_formulario: nome_completo,
      email_formulario: email,
      formulario_id,
    })

    return { ok: true, status: 200, paciente_id: paciente.id, tarefa_id }
  } catch (error) {
    return { ok: false, status: 500, error: 'Erro interno', details: msg(error) }
  }
}

// -------------------------------------------------------------
// Treino — registra + cria tarefa Modulo B (alternancia)
// -------------------------------------------------------------
export async function processarTreino(
  supabase: SupabaseClient,
  input: EntradaComEmail
): Promise<ResultadoAutomacao> {
  const { nome_completo, email, dados_raw, formulario_id } = input
  if (!nome_completo || !email) {
    return { ok: false, status: 400, error: 'Campos obrigatorios: nome_completo, email' }
  }

  try {
    const { data: paciente, error } = await supabase
      .from('pacientes')
      .select('id')
      .eq('email', email)
      .limit(1)
      .single()

    if (error || !paciente) {
      return { ok: false, status: 404, error: ERRO_EMAIL_NAO_ENCONTRADO }
    }

    // Idempotência: só cria tarefa se não houver treino já registrado
    const jaProcessado = await formularioJaRegistrado(supabase, paciente.id, 'treino')

    let tarefa_id: string | undefined
    if (!jaProcessado) {
      const resultadoDelegacao = await delegarModuloB(supabase, paciente.id, nome_completo)
      if (!resultadoDelegacao.ok) return resultadoDelegacao
      tarefa_id = resultadoDelegacao.tarefa_id
    }

    await registrarFormulario(supabase, {
      paciente_id: paciente.id,
      tipo_formulario: 'treino',
      dados_raw,
      nome_formulario: nome_completo,
      email_formulario: email,
      formulario_id,
    })

    return { ok: true, status: 200, paciente_id: paciente.id, tarefa_id }
  } catch (error) {
    return { ok: false, status: 500, error: 'Erro interno', details: msg(error) }
  }
}

// -------------------------------------------------------------
// Fotos 30 dias — cria tarefa Modulo C para Pablo (+4 dias)
// -------------------------------------------------------------
export async function processarFotos30Dias(
  supabase: SupabaseClient,
  input: EntradaComEmail
): Promise<ResultadoAutomacao> {
  const { nome_completo, email, dados_raw, formulario_id } = input
  if (!email) {
    return { ok: false, status: 400, error: 'Campo obrigatorio: email' }
  }

  try {
    const { data: paciente, error } = await supabase
      .from('pacientes')
      .select('id')
      .eq('email', email)
      .limit(1)
      .single()

    if (error || !paciente) {
      return { ok: false, status: 404, error: ERRO_EMAIL_NAO_ENCONTRADO }
    }

    const disponibilidade = await verificarDisponibilidadeFotos30(supabase, paciente.id)
    if (!disponibilidade.ok) return disponibilidade

    const responsavelFotos = await buscarResponsavelFotos(supabase)
    if (!responsavelFotos) return { ok: false, status: 500, error: 'Usuario responsavel pelas fotos nao encontrado' }

    const { data: tarefa, error: errTarefa } = await supabase
      .from('tarefas')
      .insert({
        paciente_id: paciente.id,
        modulo: 'C',
        responsavel_id: responsavelFotos,
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
      email_formulario: email,
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
  input: EntradaComEmail
): Promise<ResultadoAutomacao> {
  const { nome_completo, email, dados_raw, formulario_id } = input
  if (!email) {
    return { ok: false, status: 400, error: 'Campo obrigatorio: email' }
  }

  try {
    const { data: paciente, error } = await supabase
      .from('pacientes')
      .select('id')
      .eq('email', email)
      .limit(1)
      .single()

    if (error || !paciente) {
      return { ok: false, status: 404, error: ERRO_EMAIL_NAO_ENCONTRADO }
    }

    const responsavelRetorno = await buscarResponsavelFotos(supabase)
    if (!responsavelRetorno) return { ok: false, status: 500, error: 'Usuario responsavel pelas fotos nao encontrado' }

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
        responsavel_id: responsavelRetorno,
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
      email_formulario: email,
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

/**
 * Cria tarefa Modulo B com alternância Pablo/Estagiário via delegacao_controle.
 * Reutilizada por processarAnamnese(), processarTreino() e criação manual de paciente.
 */
async function delegarModuloB(
  supabase: SupabaseClient,
  paciente_id: string,
  nome_paciente: string,
): Promise<
  | { ok: true; tarefa_id: string; responsavel: string }
  | Extract<ResultadoAutomacao, { ok: false }>
> {
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
      observacoes_joao: nome_paciente ? `${nome_paciente}` : null,
    })
    .select('id')
    .single()

  if (errTarefa || !tarefa) {
    return { ok: false, status: 500, error: 'Falha ao criar tarefa', details: errTarefa?.message }
  }

  return { ok: true, tarefa_id: tarefa.id, responsavel: proximo_perfil }
}

/**
 * Verifica se já existe um formulário registrado para este paciente + tipo.
 * Usado para idempotência na criação de tarefas.
 */
async function formularioJaRegistrado(
  supabase: SupabaseClient,
  paciente_id: string,
  tipo: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('formularios_recebidos')
    .select('id')
    .eq('paciente_id', paciente_id)
    .eq('tipo_formulario', tipo)
    .limit(1)

  if (error || !data) return false
  return data.length > 0
}

async function buscarResponsavelFotos(supabase: SupabaseClient): Promise<string | null> {
  const { data: pablo } = await supabase
    .from('usuarios')
    .select('id')
    .eq('perfil', 'pablo')
    .eq('ativo', true)
    .limit(1)
    .maybeSingle()

  if (pablo?.id) return pablo.id

  const { data: admin } = await supabase
    .from('usuarios')
    .select('id')
    .eq('perfil', 'joao_admin')
    .eq('ativo', true)
    .limit(1)
    .maybeSingle()

  return admin?.id ?? null
}

interface FormularioRetornoMinimo {
  tipo_formulario: 'fotos_30dias' | 'feedback_retorno'
  criado_em: string
}

async function verificarDisponibilidadeFotos30(
  supabase: SupabaseClient,
  pacienteId: string
): Promise<{ ok: true } | Extract<ResultadoAutomacao, { ok: false }>> {
  const { data, error } = await supabase
    .from('formularios_recebidos')
    .select('tipo_formulario, criado_em')
    .eq('paciente_id', pacienteId)
    .in('tipo_formulario', ['fotos_30dias', 'feedback_retorno'])
    .order('criado_em', { ascending: true })

  if (error) {
    return { ok: false, status: 500, error: 'Falha ao validar ciclo de retorno', details: error.message }
  }

  const formularios = (data ?? []) as FormularioRetornoMinimo[]
  const fotos = formularios.filter((f) => f.tipo_formulario === 'fotos_30dias')
  const feedbacks = formularios.filter((f) => f.tipo_formulario === 'feedback_retorno')

  if (fotos.length === 0) return { ok: true }

  let feedbackCursor = 0
  let ultimaFotoComFeedback: FormularioRetornoMinimo | null = null

  for (const foto of fotos) {
    const feedbackIndex = feedbacks.findIndex(
      (feedback, idx) => idx >= feedbackCursor && feedback.criado_em > foto.criado_em,
    )

    if (feedbackIndex === -1) {
      return {
        ok: false,
        status: 409,
        error: 'As fotos de retorno deste ciclo já foram enviadas. Preencha o Feedback & Retorno antes de enviar novas fotos.',
      }
    }

    ultimaFotoComFeedback = foto
    feedbackCursor = feedbackIndex + 1
  }

  if (!ultimaFotoComFeedback) return { ok: true }

  const diasDesdeUltimasFotos = diasEntreDatas(
    ultimaFotoComFeedback.criado_em.slice(0, 10),
    hoje(),
  )

  if (diasDesdeUltimasFotos < DIAS_MINIMOS_ENTRE_FOTOS_RETORNO) {
    return {
      ok: false,
      status: 409,
      error: `O próximo ciclo de fotos ainda não está disponível. Tente novamente quando completar ${DIAS_MINIMOS_ENTRE_FOTOS_RETORNO} dias desde o último envio de fotos.`,
    }
  }

  return { ok: true }
}

function diasEntreDatas(inicio: string, fim: string): number {
  const inicioMs = new Date(`${inicio}T00:00:00Z`).getTime()
  const fimMs = new Date(`${fim}T00:00:00Z`).getTime()
  return Math.floor((fimMs - inicioMs) / (1000 * 60 * 60 * 24))
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
