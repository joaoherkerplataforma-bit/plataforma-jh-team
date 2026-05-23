import { NextRequest, NextResponse } from 'next/server'

import { createServiceClient } from '@/lib/supabase/service'
import { verificarWebhookToken } from '@/lib/webhook-auth'
import { type PerguntaResposta, isValidRespostas } from '@/lib/webhook-respostas'
import { processarFotosIniciais } from '@/lib/automacoes'

interface FotosIniciaisPayload {
  nome_completo: string
  email: string
  respostas?: PerguntaResposta[]
}

export async function POST(request: NextRequest) {
  if (!verificarWebhookToken(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: FotosIniciaisPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (body.respostas !== undefined && !isValidRespostas(body.respostas)) {
    console.warn(`[webhook fotos-iniciais] respostas malformado para "${body.nome_completo}", ignorando campo`)
    delete body.respostas
  }

  const supabase = createServiceClient()
  const r = await processarFotosIniciais(supabase, {
    nome_completo: body.nome_completo,
    email: body.email,
    dados_raw: body as unknown as Record<string, unknown>,
  })

  if (!r.ok) {
    return NextResponse.json({ error: r.error, details: r.details }, { status: r.status })
  }
  return NextResponse.json({ ok: true, paciente_id: r.paciente_id })
}
