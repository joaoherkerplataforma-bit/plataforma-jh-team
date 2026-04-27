import { NextRequest, NextResponse } from 'next/server'

import { createServiceClient } from '@/lib/supabase/service'
import { verificarWebhookToken } from '@/lib/webhook-auth'
import { hoje, addDias } from '@/lib/dates'

interface PerguntaResposta {
  pergunta: string
  resposta: string
}

interface RetornoDietaPayload {
  nome_completo: string
  respostas?: PerguntaResposta[]
}

function isValidRespostas(value: unknown): value is PerguntaResposta[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as PerguntaResposta).pergunta === 'string' &&
        typeof (item as PerguntaResposta).resposta === 'string'
    )
  )
}

export async function POST(request: NextRequest) {
  if (!verificarWebhookToken(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: RetornoDietaPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { nome_completo } = body

  if (!nome_completo) {
    return NextResponse.json({ error: 'Campo obrigatorio: nome_completo' }, { status: 400 })
  }

  // Defensive validation: if respostas vier malformado, logar e remover
  // (nao bloquear o webhook — preserva compat e robustez ao Make).
  if (body.respostas !== undefined && !isValidRespostas(body.respostas)) {
    console.warn(
      `[webhook retorno-dieta] respostas malformado para "${nome_completo}", ignorando campo`
    )
    delete body.respostas
  }

  const supabase = createServiceClient()

  try {
    const { data: paciente, error: errPaciente } = await supabase
      .from('pacientes')
      .select('id')
      .ilike('nome', nome_completo)
      .limit(1)
      .single()

    if (errPaciente || !paciente) {
      return NextResponse.json({ error: 'Paciente nao encontrado' }, { status: 404 })
    }

    // Pablo always handles Modulo D
    const { data: pablo, error: errPablo } = await supabase
      .from('usuarios')
      .select('id')
      .eq('perfil', 'pablo')
      .eq('ativo', true)
      .limit(1)
      .single()

    if (errPablo || !pablo) {
      return NextResponse.json({ error: 'Usuario pablo nao encontrado' }, { status: 500 })
    }

    // Find most recent tarefa C for this paciente
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
        responsavel_id: pablo.id,
        data_criacao: hoje(),
        data_prazo: addDias(hoje(), 3),
        status: 'bloqueada',
        tarefa_pai_id: tarefaC?.id || null,
      })
      .select('id')
      .single()

    if (errTarefa || !tarefa) {
      return NextResponse.json({ error: 'Falha ao criar tarefa', details: errTarefa?.message }, { status: 500 })
    }

    await supabase.from('formularios_recebidos').insert({
      paciente_id: paciente.id,
      tipo_formulario: 'feedback_retorno',
      dados_raw: body,
      nome_formulario: nome_completo,
      processado: true,
    })

    return NextResponse.json({ ok: true, tarefa_id: tarefa.id })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro interno', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}
