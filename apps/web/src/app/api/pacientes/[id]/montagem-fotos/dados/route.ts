import { NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { parseDadosRaw } from '@/lib/formularios'
import type { FormularioRecebido, PerguntaResposta } from '@/types/formularios'

type FotoTipo = 'frente' | 'lado' | 'costas'

function normalizar(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function buscarRespostaFoto(
  respostas: PerguntaResposta[],
  tipo: FotoTipo,
): string | null {
  const resposta = respostas.find((item) => {
    const pergunta = normalizar(item.pergunta)
    if (tipo === 'frente') return pergunta.includes('frente')
    if (tipo === 'lado')
      return pergunta.includes('lado') || pergunta.includes('lateral')
    return pergunta.includes('costas')
  })?.resposta

  return resposta && resposta.trim() ? resposta.trim() : null
}

function extrairFotos(
  formulario: FormularioRecebido,
): Record<FotoTipo, string> | null {
  const respostas = parseDadosRaw(formulario.dados_raw)
  const fotos: Partial<Record<FotoTipo, string>> = {}

  for (const tipo of ['frente', 'lado', 'costas'] as const) {
    const url = buscarRespostaFoto(respostas, tipo)
    if (url) fotos[tipo] = url
  }

  if (!fotos.frente || !fotos.lado || !fotos.costas) return null
  return fotos as Record<FotoTipo, string>
}

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
      { error: 'Falha ao buscar formulários' },
      { status: 500 },
    )
  }

  const formularios = (formulariosData ?? []) as FormularioRecebido[]
  const fotosIniciais = formularios.find(
    (f) => f.tipo_formulario === 'fotos_iniciais',
  )
  const retornos = formularios.filter(
    (f) => f.tipo_formulario === 'fotos_30dias',
  )

  const fotosRetorno = retornoId
    ? retornos.find((f) => f.id === retornoId)
    : retornos.at(-1)

  if (!fotosIniciais || !fotosRetorno) {
    return NextResponse.json(
      { error: 'Fotos iniciais e de retorno são obrigatórias' },
      { status: 404 },
    )
  }

  const antes = extrairFotos(fotosIniciais)
  const depois = extrairFotos(fotosRetorno)

  if (!antes || !depois) {
    return NextResponse.json(
      { error: 'Não foi possível extrair as URLs das fotos' },
      { status: 422 },
    )
  }

  return NextResponse.json({ antes, depois })
}
