import { NextRequest, NextResponse } from 'next/server'

import { createServiceClient } from '@/lib/supabase/service'
import { verificarWebhookToken } from '@/lib/webhook-auth'
import { hoje, addDias } from '@/lib/dates'

interface Fotos30DiasPayload {
  nome_completo: string
}

export async function POST(request: NextRequest) {
  if (!verificarWebhookToken(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Fotos30DiasPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { nome_completo } = body

  if (!nome_completo) {
    return NextResponse.json({ error: 'Campo obrigatorio: nome_completo' }, { status: 400 })
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

    // Pablo always handles Modulo C
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

    const { data: tarefa, error: errTarefa } = await supabase
      .from('tarefas')
      .insert({
        paciente_id: paciente.id,
        modulo: 'C',
        responsavel_id: pablo.id,
        data_criacao: hoje(),
        data_prazo: addDias(hoje(), 4),
        status: 'pendente',
      })
      .select('id')
      .single()

    if (errTarefa || !tarefa) {
      return NextResponse.json({ error: 'Falha ao criar tarefa', details: errTarefa?.message }, { status: 500 })
    }

    await supabase.from('formularios_recebidos').insert({
      paciente_id: paciente.id,
      tipo_formulario: 'fotos_30dias',
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
