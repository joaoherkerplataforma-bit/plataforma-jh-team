import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { autorizarEquipe } from '@/lib/auth'

interface CreateBody {
  titulo?: unknown
  descricao?: unknown
  ordem?: unknown
  storage_path?: unknown
  duracao_seg?: unknown
}

export async function POST(request: NextRequest) {
  const auth = await autorizarEquipe()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  let body: CreateBody
  try {
    body = (await request.json()) as CreateBody
  } catch {
    return NextResponse.json({ error: 'JSON invalido' }, { status: 400 })
  }

  const titulo = typeof body.titulo === 'string' ? body.titulo.trim() : ''
  const descricao =
    typeof body.descricao === 'string'
      ? body.descricao.trim() || null
      : body.descricao === null
        ? null
        : null
  const ordem = typeof body.ordem === 'number' ? Math.trunc(body.ordem) : NaN
  const storagePath =
    typeof body.storage_path === 'string' ? body.storage_path.trim() : ''
  const duracaoSeg =
    typeof body.duracao_seg === 'number' && Number.isFinite(body.duracao_seg)
      ? Math.trunc(body.duracao_seg)
      : null

  if (!titulo) {
    return NextResponse.json(
      { error: 'titulo e obrigatorio' },
      { status: 400 },
    )
  }
  if (!Number.isFinite(ordem) || ordem < 1) {
    return NextResponse.json(
      { error: 'ordem deve ser inteiro >= 1' },
      { status: 400 },
    )
  }
  if (!storagePath) {
    return NextResponse.json(
      { error: 'storage_path e obrigatorio' },
      { status: 400 },
    )
  }

  const service = createServiceClient()
  const { data, error } = await service
    .from('videoaulas')
    .insert({
      titulo,
      descricao,
      ordem,
      storage_path: storagePath,
      duracao_seg: duracaoSeg,
      created_by: auth.user.id,
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidatePath('/pacientes/videoaulas')
  revalidatePath('/portal')

  return NextResponse.json({ ok: true, id: data.id }, { status: 201 })
}
