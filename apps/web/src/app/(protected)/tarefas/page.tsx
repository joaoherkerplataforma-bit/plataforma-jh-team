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
  let query = service
    .from('tarefas')
    .select(
      `
      *,
      paciente:pacientes!paciente_id(id, nome, email, tipo_plano),
      responsavel:usuarios!responsavel_id(id, nome, perfil)
    `
    )
    .order('data_criacao', { ascending: false })

  if (perfil !== 'joao_admin') {
    query = query.eq('responsavel_id', user.id)
  }

  // Módulo D: estagiário doesn't see D — already filtered by responsavel_id
  // (estagiario is never assigned to D per business rules)

  const { data: tarefasRaw } = await query

  const tarefas = (tarefasRaw ?? []) as unknown as Tarefa[]

  const tarefasB = tarefas.filter((t) => t.modulo === 'B')
  const tarefasC = tarefas.filter((t) => t.modulo === 'C')
  const tarefasD = tarefas.filter((t) => t.modulo === 'D')

  // Summary counts for the header
  const totalAberto = tarefas.filter(
    (t) => t.status !== 'entregue' && t.status !== 'bloqueada'
  ).length

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#F5F0E8] tracking-wide">Tarefas</h1>
            <p className="text-sm text-[#8A7A5A] mt-0.5">
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
        perfil={perfil}
      />
    </div>
  )
}
