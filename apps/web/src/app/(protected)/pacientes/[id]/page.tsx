import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Paciente } from '@/types/pacientes'
import { PacientePerfil } from '@/app/(protected)/pacientes/[id]/paciente-perfil'

export default async function PacienteDetalhe({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()

  const { data: paciente, error } = await supabase
    .from('pacientes')
    .select('*')
    .eq('id', params.id)
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
    .eq('paciente_id', params.id)
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

  return (
    <PacientePerfil
      paciente={paciente as Paciente}
      perfilAtual={perfilAtual}
      responsavelNome={responsavelNome}
    />
  )
}
