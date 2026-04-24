import { createClient } from '@/lib/supabase/server'
import type { Paciente } from '@/types/pacientes'
import { PacientesLista } from '@/app/(protected)/pacientes/pacientes-lista'

export default async function PacientesPage() {
  const supabase = await createClient()

  const { data: pacientesRaw } = await supabase
    .from('pacientes')
    .select('*')
    .order('nome', { ascending: true })

  const pacientes = (pacientesRaw as Paciente[] | null) ?? []

  return <PacientesLista pacientes={pacientes} />
}
