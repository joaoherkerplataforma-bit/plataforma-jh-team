import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { PerfilAcesso } from '@/types/auth'
import type { Tarefa } from '@/types/tarefas'
import { TarefasTabs } from '@/app/(protected)/tarefas/tarefas-tabs'

export default async function TarefasPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch current user's perfil using service client (bypasses RLS)
  const service = createServiceClient()

  const { data: usuario } = await service
    .from('usuarios')
    .select('id, perfil')
    .eq('id', user.id)
    .single()

  const perfil = (usuario?.perfil ?? 'aluno') as PerfilAcesso

  // Build query — filter by responsavel_id for pablo/estagiario
  // joao_admin sees all tasks
  // Hide completed tasks across all tabs: status "feito" and "entregue"
  // are never shown. "pendente", "gravado" (Modulo C) and "bloqueada"
  // (admin only, handled in the client) remain visible.
  let query = service
    .from('tarefas')
    .select(
      `
      *,
      paciente:pacientes!paciente_id(id, nome, email, tipo_plano, observacoes_operacionais),
      responsavel:usuarios!responsavel_id(id, nome, perfil)
    `
    )
    .not('status', 'in', '("feito","entregue")')
    .order('data_criacao', { ascending: false })

  if (perfil !== 'joao_admin') {
    query = query.eq('responsavel_id', user.id)
  }

  const { data: tarefasRaw } = await query

  const tarefas = (tarefasRaw ?? []) as unknown as Tarefa[]

  const tarefasB = tarefas.filter((t) => t.modulo === 'B')
  const tarefasC = tarefas.filter((t) => t.modulo === 'C')
  const tarefasD = tarefas.filter((t) => t.modulo === 'D')
  const tarefasE = tarefas.filter((t) => t.modulo === 'E')

  // Summary counts for the header
  const totalAberto = tarefas.filter(
    (t) => t.status !== 'entregue' && t.status !== 'bloqueada'
  ).length

  // Fetch pacientes list for the modal (admin only)
  let pacientes: { id: string; nome: string }[] = []
  let usuarios: { id: string; nome: string; perfil: string }[] = []

  if (perfil === 'joao_admin') {
    const { data: pacientesData } = await service
      .from('pacientes')
      .select('id, nome')
      .order('nome', { ascending: true })

    pacientes = (pacientesData ?? []) as { id: string; nome: string }[]

    const { data: usuariosData } = await service
      .from('usuarios')
      .select('id, nome, perfil')
      .in('perfil', ['pablo', 'joao_estagiario'])
      .eq('ativo', true)
      .order('nome', { ascending: true })

    usuarios = (usuariosData ?? []) as { id: string; nome: string; perfil: string }[]
  }

  return (
    <>
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#F5F0E8] tracking-wide">Tarefas</h1>
            <p className="text-sm text-[#F5F0E8] mt-0.5">
              {totalAberto === 0
                ? 'Tudo em dia!'
                : `${totalAberto} tarefa${totalAberto !== 1 ? 's' : ''} em aberto`}
            </p>
          </div>
          <div className="h-px w-24 bg-gradient-to-r from-[#C9A84C]/60 to-transparent hidden sm:block" />
        </div>
        <div className="h-px w-full bg-[#2A2209] mt-4" />
      </div>

      <TarefasTabs
        tarefasB={tarefasB}
        tarefasC={tarefasC}
        tarefasD={tarefasD}
        tarefasE={tarefasE}
        perfil={perfil}
        pacientes={pacientes}
        usuarios={usuarios}
      />
    </>
  )
}
