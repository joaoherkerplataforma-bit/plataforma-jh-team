import { NextRequest, NextResponse } from 'next/server'

import { createServiceClient } from '@/lib/supabase/service'
import { verificarWebhookToken } from '@/lib/webhook-auth'
import { type PerguntaResposta, isValidRespostas } from '@/lib/webhook-respostas'
import { processarAnamnese } from '@/lib/automacoes'

interface AnamnesePayload {
  nome_completo: string
  email: string
  telefone?: string
  // Aceita literal ("Dieta" | "Completo") ou combinado ("Trimestral - Dieta")
  qual_plano: string
  tempo_plano?: string
  origem?: string
  respostas?: PerguntaResposta[]
}

// Webhook legado (Make → Google Forms). Hoje apenas um wrapper fino sobre a
// logica compartilhada em lib/automacoes. Mantido durante a transicao para os
// formularios nativos; pode ser removido ao desligar o Make.
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

  if (body.respostas !== undefined && !isValidRespostas(body.respostas)) {
    console.warn(`[webhook anamnese] respostas malformado para "${body.nome_completo}", ignorando campo`)
    delete body.respostas
  }

  const supabase = createServiceClient()
  const r = await processarAnamnese(supabase, {
    nome_completo: body.nome_completo,
    email: body.email,
    telefone: body.telefone ?? null,
    qual_plano: body.qual_plano,
    tempo_plano: body.tempo_plano,
    origem: body.origem ?? null,
    dados_raw: body as unknown as Record<string, unknown>,
  })

  if (!r.ok) {
    return NextResponse.json({ error: r.error, details: r.details }, { status: r.status })
  }
  return NextResponse.json({
    ok: true,
    paciente_id: r.paciente_id,
    tarefa_id: r.tarefa_id,
    responsavel: r.responsavel,
  })
}
