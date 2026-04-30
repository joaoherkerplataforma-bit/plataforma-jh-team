import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { autorizarEquipe } from '@/lib/auth'

interface PatchBody {
  titulo?: unknown
  descricao?: unknown
  ordem?: unknown
  ativo?: unknown
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await autorizarEquipe()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'id obrigatorio' }, { status: 400 })
  }

  let body: PatchBody
  try {
    body = (await request.json()) as PatchBody
  } catch {
    return NextResponse.json({ error: 'JSON invalido' }, { status: 400 })
  }

  const update: Record<string, string | number | boolean | null> = {}

  if (body.titulo !== undefined) {
    if (typeof body.titulo !== 'string' || !body.titulo.trim()) {
      return NextResponse.json(
        { error: 'titulo invalido' },
        { status: 400 },
      )
    }
    update.titulo = body.titulo.trim()
  }

  if (body.descricao !== undefined) {
    if (body.descricao === null) {
      update.descricao = null
    } else if (typeof body.descricao === 'string') {
      update.descricao = body.descricao.trim() || null
    } else {
      return NextResponse.json(
        { error: 'descricao invalida' },
        { status: 400 },
      )
    }
  }

  if (body.ordem !== undefined) {
    if (typeof body.ordem !== 'number' || !Number.isFinite(body.ordem)) {
      return NextResponse.json({ error: 'ordem invalida' }, { status: 400 })
    }
    const ordemInt = Math.trunc(body.ordem)
    if (ordemInt < 1) {
      return NextResponse.json(
        { error: 'ordem deve ser >= 1' },
        { status: 400 },
      )
    }
    update.ordem = ordemInt
  }

  if (body.ativo !== undefined) {
    if (typeof body.ativo !== 'boolean') {
      return NextResponse.json({ error: 'ativo invalido' }, { status: 400 })
    }
    update.ativo = body.ativo
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: 'nenhum campo para atualizar' },
      { status: 400 },
    )
  }

  const service = createServiceClient()
  const { error } = await service
    .from('videoaulas')
    .update(update)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidatePath('/pacientes/videoaulas')
  revalidatePath('/portal')

  return NextResponse.json({ ok: true })
}

/**
 * Soft-delete: marca ativo=false. Preserva FK em progresso_videoaulas.
 * Para eliminar de fato (incluindo objeto no Storage) seria necessario
 * outro endpoint dedicado e politica de retencao explicita.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await autorizarEquipe()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'id obrigatorio' }, { status: 400 })
  }

  const service = createServiceClient()
  const { error } = await service
    .from('videoaulas')
    .update({ ativo: false })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidatePath('/pacientes/videoaulas')
  revalidatePath('/portal')

  return NextResponse.json({ ok: true })
}
