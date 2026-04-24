import { NextRequest, NextResponse } from 'next/server'

import { createServiceClient } from '@/lib/supabase/service'
import { verificarWebhookToken } from '@/lib/webhook-auth'
import { hoje, addDias, addMeses } from '@/lib/dates'
import { parsePlano, DURACAO_MESES } from '@/lib/parse-plano'

interface AnamnesePayload {
  nome_completo: string
  email: string
  telefone?: string
  // Aceita tanto literal ("Dieta" | "Completo") quanto formato combinado
  // do Google Forms (ex.: "Trimestral - Dieta", "Semestral - Dieta + Treino")
  qual_plano: string
  tempo_plano?: string
  origem?: string
}

const ORIGENS_VALIDAS = ['Instagram', 'TikTok', 'YouTube', 'Indicação'] as const

export async function POST(request: NextRequest) {
  if (!verificarWebhookToken(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: AnamnesePayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { nome_completo, email, telefone, qual_plano, tempo_plano } = body

  if (!nome_completo || !email || !qual_plano) {
    return NextResponse.json({ error: 'Campos obrigatorios: nome_completo, email, qual_plano' }, { status: 400 })
  }

  if (body.origem && !ORIGENS_VALIDAS.includes(body.origem as typeof ORIGENS_VALIDAS[number])) {
    return NextResponse.json(
      { error: 'Valor inválido para origem', validos: ORIGENS_VALIDAS },
      { status: 400 }
    )
  }

  const plano = parsePlano(qual_plano, tempo_plano)

  if (!plano) {
    return NextResponse.json(
      {
        error: 'Valores invalidos para qual_plano ou tempo_plano',
        detalhes:
          'qual_plano aceita "Dieta" | "Completo" (com tempo_plano "Trimestral"|"Semestral"|"Anual") ' +
          'ou formato combinado "Trimestral - Dieta", "Semestral - Dieta + Treino", etc.',
        recebido: { qual_plano, tempo_plano },
      },
      { status: 400 }
    )
  }

  const { tipo_plano, duracao_plano } = plano

  const meses = DURACAO_MESES[duracao_plano]
  const data_inicio = addDias(hoje(), 5)
  const data_vencimento_plano = addMeses(data_inicio, meses)
  const proximo_retorno = addDias(data_inicio, 30)

  const supabase = createServiceClient()

  try {
    // Check if paciente already exists
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
          origem: body.origem ?? null,
        })
        .select('id')
        .single()

      if (errPaciente || !novoPaciente) {
        return NextResponse.json({ error: 'Falha ao criar paciente', details: errPaciente?.message }, { status: 500 })
      }
      paciente_id = novoPaciente.id
    }

    // Alternancia: buscar delegacao_controle e usuarios
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
      return NextResponse.json(
        { error: 'Configuracao de delegacao incompleta: verifique delegacao_controle e usuarios' },
        { status: 500 }
      )
    }

    // Proximo responsavel = inverso do ultimo_delegado
    const proximo_perfil = delegacao.ultimo_delegado === 'pablo' ? 'joao_estagiario' : 'pablo'
    const responsavel = usuarios.find((u) => u.perfil === proximo_perfil)

    if (!responsavel) {
      return NextResponse.json({ error: `Usuario com perfil ${proximo_perfil} nao encontrado` }, { status: 500 })
    }

    // Atualizar delegacao_controle
    await supabase
      .from('delegacao_controle')
      .update({
        ultimo_delegado: proximo_perfil,
        contador: delegacao.contador + 1,
      })
      .eq('id', delegacao.id)

    // Criar tarefa Modulo B
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
      return NextResponse.json({ error: 'Falha ao criar tarefa', details: errTarefa?.message }, { status: 500 })
    }

    // Registrar formulario recebido
    await supabase.from('formularios_recebidos').insert({
      paciente_id,
      tipo_formulario: 'anamnese',
      dados_raw: body,
      nome_formulario: nome_completo,
      email_formulario: email,
      processado: true,
    })

    return NextResponse.json({
      ok: true,
      paciente_id,
      tarefa_id: tarefa.id,
      responsavel: proximo_perfil,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro interno', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}
