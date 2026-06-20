import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

const PERFIS_PERMITIDOS = ['joao_admin', 'pablo', 'joao_estagiario']

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const { data: usuario } = await service
    .from('usuarios')
    .select('perfil')
    .eq('id', user.id)
    .single()

  if (!usuario || !PERFIS_PERMITIDOS.includes(usuario.perfil)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { observacoes_operacionais } = body as {
    observacoes_operacionais: string | null
  }

  if (
    observacoes_operacionais !== null &&
    typeof observacoes_operacionais !== 'string'
  ) {
    return NextResponse.json({ error: 'Valor invalido' }, { status: 400 })
  }

  const { error } = await service
    .from('pacientes')
    .update({ observacoes_operacionais: observacoes_operacionais || null })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
