import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { Formulario, FormularioResumo } from '@/types/formulario-builder'
import { parseDadosRaw } from '@/lib/formularios'
import { FormulariosLista } from '@/app/(protected)/formularios/formularios-lista'

export const dynamic = 'force-dynamic'

export default async function FormulariosPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('perfil')
    .eq('id', user.id)
    .single()

  if (usuario?.perfil !== 'joao_admin') redirect('/relatorio')

  const service = createServiceClient()

  const { data: formsRaw } = await service
    .from('formularios')
    .select('id, slug, titulo, acao, ativo, share_token, campos')
    .order('created_at', { ascending: true })

  const forms = (formsRaw ?? []) as Pick<
    Formulario,
    'id' | 'slug' | 'titulo' | 'acao' | 'ativo' | 'share_token' | 'campos'
  >[]

  // Conta respostas por formulario (escala pequena: tally em memória)
  const { data: recebidos } = await service
    .from('formularios_recebidos')
    .select('id, formulario_id, dados_raw, nome_formulario, email_formulario, criado_em, paciente:pacientes(nome, email)')
    .order('criado_em', { ascending: false })
  const contagem = new Map<string, number>()
  for (const r of recebidos ?? []) {
    const fid = (r as { formulario_id: string | null }).formulario_id
    if (fid) contagem.set(fid, (contagem.get(fid) ?? 0) + 1)
  }

  const resumos: FormularioResumo[] = forms.map((f) => ({
    id: f.id,
    slug: f.slug,
    titulo: f.titulo,
    acao: f.acao,
    ativo: f.ativo,
    share_token: f.share_token,
    total_campos: Array.isArray(f.campos) ? f.campos.length : 0,
    total_respostas: contagem.get(f.id) ?? 0,
  }))

  const respostasPorFormulario = new Map<
    string,
    {
      id: string
      criado_em: string
      nome: string | null
      email: string | null
      respostas: Record<string, string>
    }[]
  >()

  for (const recebido of recebidos ?? []) {
    const row = recebido as {
      id: string
      formulario_id: string | null
      dados_raw: unknown
      nome_formulario: string | null
      email_formulario: string | null
      criado_em: string
      paciente: { nome: string | null; email: string | null } | { nome: string | null; email: string | null }[] | null
    }
    if (!row.formulario_id) continue

    const paciente = Array.isArray(row.paciente) ? row.paciente[0] : row.paciente
    const respostas: Record<string, string> = {}
    for (const item of parseDadosRaw(row.dados_raw)) {
      respostas[item.pergunta] = item.resposta
    }

    const lista = respostasPorFormulario.get(row.formulario_id) ?? []
    lista.push({
      id: row.id,
      criado_em: row.criado_em,
      nome: row.nome_formulario ?? paciente?.nome ?? null,
      email: row.email_formulario ?? paciente?.email ?? null,
      respostas,
    })
    respostasPorFormulario.set(row.formulario_id, lista)
  }

  const formulariosComRespostas = resumos.map((resumo) => {
    const form = forms.find((f) => f.id === resumo.id)
    return {
      ...resumo,
      campos: Array.isArray(form?.campos)
        ? form.campos.map((campo) => ({ key: campo.key, label: campo.label }))
        : [],
      respostas: respostasPorFormulario.get(resumo.id) ?? [],
    }
  })

  return <FormulariosLista formularios={formulariosComRespostas} />
}
