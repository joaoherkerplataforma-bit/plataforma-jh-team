import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { EquipeCliente, type MembroEquipe } from '@/app/(protected)/equipe/equipe-cliente'

export const dynamic = 'force-dynamic'

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
  if (usuario?.perfil !== 'joao_admin') redirect('/relatorio')

  const service = createServiceClient()
  const { data } = await service
    .from('usuarios')
    .select('id, nome, email, perfil, ativo')
    .in('perfil', ['joao_admin', 'pablo', 'joao_estagiario'])
    .order('perfil', { ascending: true })
    .order('nome', { ascending: true })

  const membros = (data ?? []) as MembroEquipe[]

  return <EquipeCliente membros={membros} currentUserId={user.id} />
}
