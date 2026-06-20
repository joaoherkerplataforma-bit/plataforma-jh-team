import { NextRequest, NextResponse } from 'next/server'

import { gerarMontagemFotos, MontagemFotosError } from '@/lib/montagem-fotos'
import { createClient } from '@/lib/supabase/server'
import type { FormularioRecebido } from '@/types/formularios'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const retornoId = request.nextUrl.searchParams.get('retorno')
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
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
  const fotosIniciais = formularios.find((f) => f.tipo_formulario === 'fotos_iniciais')
  const retornos = formularios.filter((f) => f.tipo_formulario === 'fotos_30dias')

  const fotosRetorno = retornoId
    ? retornos.find((f) => f.id === retornoId)
    : retornos.at(-1)

  if (!fotosIniciais || !fotosRetorno) {
    return NextResponse.json(
      { error: 'Fotos iniciais e fotos de retorno 30 dias são obrigatórias' },
      { status: 404 },
    )
  }

  try {
    const montagem = await gerarMontagemFotos(fotosIniciais, fotosRetorno)

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

    console.error('[montagem-fotos] falha ao gerar montagem', err)
    return NextResponse.json(
      { error: 'Falha ao gerar montagem de fotos' },
      { status: 500 },
    )
  }
}
