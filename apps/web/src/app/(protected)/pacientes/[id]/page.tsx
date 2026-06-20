import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Paciente } from '@/types/pacientes'
import type { FormularioRecebido } from '@/types/formularios'
import { PacientePerfil } from '@/app/(protected)/pacientes/[id]/paciente-perfil'

export default async function PacienteDetalhe({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: paciente, error } = await supabase
    .from('pacientes')
    .select('id, nome, email, telefone, tipo_plano, duracao_plano, data_inicio, data_vencimento_plano, proximo_retorno, status, observacoes, origem, created_at, updated_at')
    .eq('id', id)
    .single()

  if (error || !paciente) notFound()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: usuarioData } = await supabase
    .from('usuarios')
    .select('perfil')
    .eq('id', user?.id ?? '')
    .single()
  const perfilAtual = usuarioData?.perfil ?? ''

  const { data: tarefaB } = await supabase
    .from('tarefas')
    .select(
      'id, status, data_prazo, created_at, responsavel:usuarios(id, nome, perfil)',
    )
    .eq('paciente_id', id)
    .eq('modulo', 'B')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const responsavelRaw = tarefaB?.responsavel as
    | { nome: string }
    | { nome: string }[]
    | null
    | undefined
  const responsavelObj = Array.isArray(responsavelRaw)
    ? (responsavelRaw[0] ?? null)
    : (responsavelRaw ?? null)
  const responsavelNome = responsavelObj?.nome ?? null

  const { data: formulariosData } = await supabase
    .from('formularios_recebidos')
    .select('id, paciente_id, tipo_formulario, dados_raw, criado_em')
    .eq('paciente_id', id)
    .order('criado_em', { ascending: true })
  const formularios = (formulariosData ?? []) as FormularioRecebido[]

  return (
    <PacientePerfil
      paciente={paciente as Paciente}
      perfilAtual={perfilAtual}
      responsavelNome={responsavelNome}
      formularios={formularios}
    />
  )
}
