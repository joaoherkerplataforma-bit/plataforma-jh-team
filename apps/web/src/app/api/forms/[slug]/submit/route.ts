import { NextRequest, NextResponse } from 'next/server'

import { createServiceClient } from '@/lib/supabase/service'
import { validarValor, valorParaString } from '@/lib/formulario-schema'
import {
  processarAnamnese,
  processarFotosIniciais,
  processarTreino,
  processarFotos30Dias,
  processarRetornoDieta,
  registrarAvulso,
  type ResultadoAutomacao,
} from '@/lib/automacoes'
import type { CampoFormulario, Formulario, MapeiaPara } from '@/types/formulario-builder'

interface SubmitBody {
  token?: string
  hp?: string // honeypot — deve vir vazio
  valores?: Record<string, unknown>
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  let body: SubmitBody
  try {
    body = (await request.json()) as SubmitBody
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  // Honeypot: bot preencheu o campo oculto -> finge sucesso e ignora.
  if (typeof body.hp === 'string' && body.hp.trim() !== '') {
    return NextResponse.json({ ok: true })
  }

  const tokenRecebido = body.token ?? request.nextUrl.searchParams.get('t') ?? ''
  const valores = body.valores ?? {}

  const supabase = createServiceClient()

  const { data: formRow } = await supabase
    .from('formularios')
    .select('id, slug, titulo, descricao, acao, campos, ativo, share_token, created_at, updated_at')
    .eq('slug', slug)
    .single()

  if (!formRow) {
    return NextResponse.json({ error: 'Formulário não encontrado' }, { status: 404 })
  }

  const form = formRow as Formulario
  if (!form.ativo) {
    return NextResponse.json({ error: 'Este formulário não está mais disponível' }, { status: 410 })
  }
  if (!tokenRecebido || tokenRecebido !== form.share_token) {
    return NextResponse.json({ error: 'Link inválido ou expirado' }, { status: 403 })
  }

  const campos = (form.campos ?? []) as CampoFormulario[]

  // Validacao server-side de cada campo
  for (const campo of campos) {
    const erro = validarValor(campo, valores[campo.key])
    if (erro) {
      return NextResponse.json({ error: erro }, { status: 400 })
    }
  }

  // Monta dados_raw compativel com a tela /pacientes/[id] (respostas[]) +
  // campos mapeados no topo (consumidos pela logica de negocio).
  const mapped: Record<MapeiaPara, string> = {} as Record<MapeiaPara, string>
  const respostas: { pergunta: string; resposta: string }[] = []
  for (const campo of campos) {
    const str = valorParaString(valores[campo.key])
    respostas.push({ pergunta: campo.label, resposta: str })
    if (campo.mapeia_para) mapped[campo.mapeia_para] = str
  }

  const dados_raw: Record<string, unknown> = {
    fonte: 'nativo',
    formulario_slug: form.slug,
    respostas,
    nome_completo: mapped.nome ?? '',
    email: mapped.email ?? '',
    telefone: mapped.telefone ?? '',
    qual_plano: mapped.qual_plano ?? '',
    origem: mapped.origem ?? '',
  }

  const resultado = await despachar(supabase, form, mapped, dados_raw)

  if (!resultado.ok) {
    return NextResponse.json(
      { error: resultado.error, details: resultado.details },
      { status: resultado.status }
    )
  }

  return NextResponse.json({ ok: true, paciente_id: resultado.paciente_id })
}

async function despachar(
  supabase: ReturnType<typeof createServiceClient>,
  form: Formulario,
  mapped: Record<MapeiaPara, string>,
  dados_raw: Record<string, unknown>
): Promise<ResultadoAutomacao> {
  const formulario_id = form.id
  const nome_completo = mapped.nome ?? ''
  const email = mapped.email ?? ''

  switch (form.acao) {
    case 'anamnese':
      return processarAnamnese(supabase, {
        nome_completo,
        email,
        telefone: mapped.telefone ?? null,
        qual_plano: mapped.qual_plano ?? '',
        origem: mapped.origem ?? null,
        dados_raw,
        formulario_id,
      })
    case 'fotos_iniciais':
      return processarFotosIniciais(supabase, { nome_completo, email, dados_raw, formulario_id })
    case 'treino':
      return processarTreino(supabase, { nome_completo, email, dados_raw, formulario_id })
    case 'fotos_30dias':
      return processarFotos30Dias(supabase, { nome_completo, dados_raw, formulario_id })
    case 'feedback_retorno':
      return processarRetornoDieta(supabase, { nome_completo, dados_raw, formulario_id })
    case 'nenhuma':
    default:
      return registrarAvulso(supabase, { nome_completo, email, dados_raw, formulario_id })
  }
}
