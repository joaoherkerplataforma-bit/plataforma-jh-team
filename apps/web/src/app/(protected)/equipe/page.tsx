import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { EquipeCliente, type MembroEquipe } from '@/app/(protected)/equipe/equipe-cliente'

export const dynamic = 'force-dynamic'

const PERFIS_EQUIPE = ['joao_admin', 'pablo', 'joao_estagiario'] as const

export default async function EquipePage() {
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
  if (!usuario || !PERFIS_EQUIPE.includes(usuario.perfil as typeof PERFIS_EQUIPE[number])) {
    redirect('/relatorio')
  }

  const service = createServiceClient()
  const { data } = await service
    .from('usuarios')
    .select('id, nome, email, perfil, ativo')
    .in('perfil', ['joao_admin', 'pablo', 'joao_estagiario'])
    .order('perfil', { ascending: true })
    .order('nome', { ascending: true })

  const membros = (data ?? []) as MembroEquipe[]
  const ehAdmin = usuario.perfil === 'joao_admin'

  return (
    <EquipeCliente
      membros={membros}
      currentUserId={user.id}
      ehAdmin={ehAdmin}
    />
  )
}
