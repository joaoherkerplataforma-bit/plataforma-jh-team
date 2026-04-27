import { NextRequest, NextResponse } from 'next/server'

import { createServiceClient } from '@/lib/supabase/service'
import { verificarWebhookToken } from '@/lib/webhook-auth'
import { type PerguntaResposta, isValidRespostas } from '@/lib/webhook-respostas'

interface TreinoPayload {
  nome_completo: string
  email: string
  respostas?: PerguntaResposta[]
}

export async function POST(request: NextRequest) {
  if (!verificarWebhookToken(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: TreinoPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { nome_completo, email } = body

  if (!nome_completo || !email) {
    return NextResponse.json({ error: 'Campos obrigatorios: nome_completo, email' }, { status: 400 })
  }

  // Defensive validation: if respostas vier malformado, logar e remover
  // (nao bloquear o webhook — preserva compat e robustez ao Make).
  if (body.respostas !== undefined && !isValidRespostas(body.respostas)) {
    console.warn(
      `[webhook treino] respostas malformado para "${nome_completo}", ignorando campo`
    )
    delete body.respostas
  }

  const supabase = createServiceClient()

  try {
    const { data: paciente, error: errPaciente } = await supabase
      .from('pacientes')
      .select('id')
      .ilike('nome', nome_completo)
      .eq('email', email)
      .limit(1)
      .single()

    if (errPaciente || !paciente) {
      return NextResponse.json({ error: 'Paciente nao encontrado' }, { status: 404 })
    }

    await supabase.from('formularios_recebidos').insert({
      paciente_id: paciente.id,
      tipo_formulario: 'treino',
      dados_raw: body,
      nome_formulario: nome_completo,
      email_formulario: email,
      processado: true,
    })

    return NextResponse.json({ ok: true, paciente_id: paciente.id })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro interno', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}
