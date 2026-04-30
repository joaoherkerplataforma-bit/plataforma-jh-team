import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listarTodasVideoaulas } from '@/lib/videoaulas'
import { ListaAdmin } from '@/app/(protected)/pacientes/videoaulas/lista-admin'

const PERFIS_PERMITIDOS = ['joao_admin', 'pablo', 'joao_estagiario'] as const

export default async function VideoaulasAdminPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: usuarioData } = await supabase
    .from('usuarios')
    .select('perfil')
    .eq('id', user.id)
    .single()

  const perfilAtual = usuarioData?.perfil ?? ''

  if (!PERFIS_PERMITIDOS.includes(perfilAtual as typeof PERFIS_PERMITIDOS[number])) {
    redirect('/portal')
  }

  const videoaulas = await listarTodasVideoaulas()

  return <ListaAdmin videoaulas={videoaulas} />
}
