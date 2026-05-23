import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { UserProfile } from '@/types/auth'
import { AppLayout } from '@/components/layout/app-layout'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, nome, email, perfil, ativo, created_at, updated_at')
    .eq('id', user.id)
    .single()

  if (!usuario) {
    // User has a valid Supabase Auth session but no entry in the `usuarios`
    // table. Redirecting to /login directly would cause an infinite loop
    // (middleware detects the session and redirects back to /relatorio).
    // Routing through /api/auth/signout clears the session first.
    redirect('/api/auth/signout')
  }

  const userProfile: UserProfile = {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    perfil: usuario.perfil,
    ativo: usuario.ativo,
    created_at: usuario.created_at,
    updated_at: usuario.updated_at,
  }

  return <AppLayout user={userProfile}>{children}</AppLayout>
}
