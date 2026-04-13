import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { StatusTarefa } from '@/types/tarefas'

const VALID_STATUSES: StatusTarefa[] = ['pendente', 'bloqueada', 'feito', 'gravado', 'entregue']

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

  const body = await request.json()
  const { status } = body as { status: StatusTarefa }

  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Status invalido' }, { status: 400 })
  }

  // Use service client to bypass RLS — auth is already verified above
  const service = createServiceClient()
  const { error } = await service.from('tarefas').update({ status }).eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
