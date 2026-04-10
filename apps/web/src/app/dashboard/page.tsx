import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { calcularCamposPaciente, calcularResumo, separarPacientes } from '@/lib/pacientes'
import type { Paciente } from '@/types/pacientes'
import { LogoutButton } from '@/app/dashboard/logout-button'
import { PacientesTable } from '@/app/dashboard/pacientes-table'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('nome, perfil')
    .eq('id', user.id)
    .single()

  // Buscar todos os pacientes (admin ve tudo)
  const { data: pacientesRaw } = await supabase
    .from('pacientes')
    .select('*')
    .order('nome', { ascending: true })

  const pacientes = (pacientesRaw as Paciente[] | null) ?? []
  const resumo = calcularResumo(pacientes)
  const pacientesCalculados = pacientes.map(calcularCamposPaciente)
  const { ativos, vencidos } = separarPacientes(pacientesCalculados)

  return (
    <main className="min-h-screen bg-[#1A1A1A]">
      {/* Header */}
      <header className="bg-[#242424] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold tracking-[0.15em] text-gold">
              JH TEAM
            </h1>
            <div className="h-6 w-px bg-white/10" />
            {usuario && (
              <p className="text-white/40 text-sm">
                {usuario.nome}{' '}
                <span className="text-white/20">({usuario.perfil})</span>
              </p>
            )}
          </div>
          <LogoutButton />
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PacientesTable
          ativos={ativos}
          vencidos={vencidos}
          resumo={resumo}
        />
      </div>
    </main>
  )
}
