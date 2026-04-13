import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  // Verify authentication
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only joao_admin can create alteracoes
  const service = createServiceClient()
  const { data: usuario } = await service
    .from('usuarios')
    .select('perfil')
    .eq('id', user.id)
    .single()

  if (usuario?.perfil !== 'joao_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { paciente_id, responsavel_id, observacoes_joao } = body as {
    paciente_id: string
    responsavel_id: string
    observacoes_joao: string | null
  }

  if (!paciente_id || !responsavel_id) {
    return NextResponse.json(
      { error: 'paciente_id e responsavel_id sao obrigatorios' },
      { status: 400 }
    )
  }

  const hoje = new Date()
  const dataCriacao = hoje.toISOString().split('T')[0]

  const prazo = new Date(hoje)
  prazo.setDate(prazo.getDate() + 3)
  const dataPrazo = prazo.toISOString().split('T')[0]

  const { data, error } = await service.from('tarefas').insert({
    paciente_id,
    responsavel_id,
    modulo: 'E',
    status: 'pendente',
    data_criacao: dataCriacao,
    data_prazo: dataPrazo,
    observacoes_joao: observacoes_joao || null,
  }).select('id').single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: data.id }, { status: 201 })
}
