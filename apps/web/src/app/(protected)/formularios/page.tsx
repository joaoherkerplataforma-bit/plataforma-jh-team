import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { Formulario, FormularioResumo } from '@/types/formulario-builder'
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
    .select('formulario_id')
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

  return <FormulariosLista formularios={resumos} />
}
