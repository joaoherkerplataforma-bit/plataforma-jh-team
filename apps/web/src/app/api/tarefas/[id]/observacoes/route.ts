import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Verify authentication
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only joao_admin can edit observacoes
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
  const { observacoes_joao } = body as { observacoes_joao: string | null }

  if (observacoes_joao !== null && typeof observacoes_joao !== 'string') {
    return NextResponse.json({ error: 'Valor invalido' }, { status: 400 })
  }

  const { error } = await service
    .from('tarefas')
    .update({ observacoes_joao: observacoes_joao || null })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
