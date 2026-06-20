import { createClient } from '@/lib/supabase/server'
import type { Paciente } from '@/types/pacientes'
import { PacientesLista } from '@/app/(protected)/pacientes/pacientes-lista'

export default async function PacientesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: usuarioData } = await supabase
    .from('usuarios')
    .select('perfil')
    .eq('id', user?.id ?? '')
    .single()
  const perfilAtual = usuarioData?.perfil ?? ''

  const { data: pacientesRaw } = await supabase
    .from('pacientes')
    .select('id, nome, email, telefone, tipo_plano, duracao_plano, data_inicio, data_vencimento_plano, proximo_retorno, status, observacoes, origem, created_at, updated_at')
    .order('nome', { ascending: true })

  const pacientes = (pacientesRaw as Paciente[] | null) ?? []

  return <PacientesLista pacientes={pacientes} perfilAtual={perfilAtual} />
}
