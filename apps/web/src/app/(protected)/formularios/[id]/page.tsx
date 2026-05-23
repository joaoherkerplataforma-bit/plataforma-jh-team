import { redirect, notFound } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { Formulario, CampoFormulario } from '@/types/formulario-builder'
import { EditorFormulario } from '@/app/(protected)/formularios/[id]/editor-formulario'

export const dynamic = 'force-dynamic'

export default async function EditarFormularioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

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
  const { data: formRow } = await service
    .from('formularios')
    .select('id, slug, titulo, descricao, acao, campos, ativo, share_token, created_at, updated_at')
    .eq('id', id)
    .single()

  if (!formRow) notFound()

  const form = formRow as Formulario
  const campos = (form.campos ?? []) as CampoFormulario[]

  return <EditorFormulario form={{ ...form, campos }} />
}
