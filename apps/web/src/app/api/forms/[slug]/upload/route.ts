import { NextRequest, NextResponse } from 'next/server'

import { createServiceClient } from '@/lib/supabase/service'

const BUCKET = 'formularios-fotos'
const MAX_BYTES = 25 * 1024 * 1024 // 25 MB (bucket também limita)
const EXT_POR_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Envio inválido' }, { status: 400 })
  }

  const token = String(formData.get('token') ?? '')
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Arquivo ausente' }, { status: 400 })
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Arquivo vazio ou maior que 25 MB' }, { status: 400 })
  }
  const ext = EXT_POR_MIME[file.type]
  if (!ext) {
    return NextResponse.json({ error: 'Formato não suportado (use JPG, PNG ou WEBP)' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Valida que o link (token) corresponde a um formulário ativo
  const { data: form } = await supabase
    .from('formularios')
    .select('id, ativo, share_token')
    .eq('slug', slug)
    .single()

  if (!form || !form.ativo || token !== form.share_token) {
    return NextResponse.json({ error: 'Link inválido' }, { status: 403 })
  }

  const path = `${slug}/${crypto.randomUUID()}.${ext}`
  const bytes = new Uint8Array(await file.arrayBuffer())

  const { error: errUpload } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false })

  if (errUpload) {
    return NextResponse.json({ error: 'Falha ao enviar a foto', details: errUpload.message }, { status: 500 })
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)

  return NextResponse.json({ ok: true, url: pub.publicUrl })
}
