import { NextRequest, NextResponse } from 'next/server'

import {
  gerarMontagemFotosComAjustes,
  MontagemFotosError,
  type AjustesMontagem,
} from '@/lib/montagem-fotos'
import { createClient } from '@/lib/supabase/server'
import type { FormularioRecebido } from '@/types/formularios'

export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  let body: { retornoFormId?: string; ajustes?: AjustesMontagem }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { retornoFormId, ajustes } = body

  if (!retornoFormId) {
    return NextResponse.json(
      { error: 'retornoFormId é obrigatório' },
      { status: 400 },
    )
  }

  if (!ajustes || typeof ajustes !== 'object') {
    return NextResponse.json(
      { error: 'ajustes é obrigatório' },
      { status: 400 },
    )
  }

  const { data: formulariosData, error } = await supabase
    .from('formularios_recebidos')
    .select('id, paciente_id, tipo_formulario, dados_raw, criado_em')
    .eq('paciente_id', id)
    .in('tipo_formulario', ['fotos_iniciais', 'fotos_30dias'])
    .order('criado_em', { ascending: true })

  if (error) {
    return NextResponse.json(
      { error: 'Falha ao buscar formulários de fotos' },
      { status: 500 },
    )
  }

  const formularios = (formulariosData ?? []) as FormularioRecebido[]
  const fotosIniciais = formularios.find(
    (f) => f.tipo_formulario === 'fotos_iniciais',
  )
  const fotosRetorno = formularios.find((f) => f.id === retornoFormId)

  if (!fotosIniciais || !fotosRetorno) {
    return NextResponse.json(
      { error: 'Fotos iniciais e fotos de retorno 30 dias são obrigatórias' },
      { status: 404 },
    )
  }

  try {
    const montagem = await gerarMontagemFotosComAjustes(
      fotosIniciais,
      fotosRetorno,
      ajustes,
    )

    return new NextResponse(new Uint8Array(montagem), {
      headers: {
        'content-type': 'image/png',
        'content-disposition': `inline; filename="montagem-antes-depois-${id}.png"`,
        'cache-control': 'private, no-store',
      },
    })
  } catch (err) {
    if (err instanceof MontagemFotosError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }

    console.error('[montagem-fotos] falha ao gerar montagem com ajustes', err)
    return NextResponse.json(
      { error: 'Falha ao gerar montagem de fotos' },
      { status: 500 },
    )
  }
}
