import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

import { createServiceClient } from '@/lib/supabase/service'
import { autorizarEquipe } from '@/lib/auth'
import { slugify } from '@/lib/formulario-schema'
import type { AcaoFormulario } from '@/types/formulario-builder'

const ACOES: readonly AcaoFormulario[] = [
  'anamnese',
  'fotos_iniciais',
  'treino',
  'fotos_30dias',
  'feedback_retorno',
  'nenhuma',
]

interface CreateBody {
  titulo?: unknown
  acao?: unknown
}

export async function POST(request: NextRequest) {
  const auth = await autorizarEquipe()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (auth.user.perfil !== 'joao_admin') {
    return NextResponse.json({ error: 'Apenas o admin gerencia formulários' }, { status: 403 })
  }

  let body: CreateBody
  try {
    body = (await request.json()) as CreateBody
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const titulo = typeof body.titulo === 'string' ? body.titulo.trim() : ''
  if (!titulo) return NextResponse.json({ error: 'Título é obrigatório' }, { status: 400 })

  const acao: AcaoFormulario = ACOES.includes(body.acao as AcaoFormulario)
    ? (body.acao as AcaoFormulario)
    : 'nenhuma'

  const service = createServiceClient()

  // Gera slug único
  const base = slugify(titulo) || 'formulario'
  let slug = base
  let n = 2
  // Evita colisão consultando os slugs existentes com o mesmo prefixo
  const { data: existentes } = await service
    .from('formularios')
    .select('slug')
    .like('slug', `${base}%`)
  const usados = new Set((existentes ?? []).map((e) => e.slug as string))
  while (usados.has(slug)) slug = `${base}-${n++}`

  const { data, error } = await service
    .from('formularios')
    .insert({ titulo, acao, slug, campos: [], ativo: true })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath('/formularios')
  return NextResponse.json({ ok: true, id: data.id }, { status: 201 })
}
