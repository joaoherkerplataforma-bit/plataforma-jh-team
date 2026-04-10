import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { UserProfile } from '@/types/auth'
import { ThemeProvider } from '@/components/theme-provider'
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
    .select('id, nome, email, perfil, ativo, criado_em, atualizado_em')
    .eq('id', user.id)
    .single()

  if (!usuario) {
    // User has a valid Supabase Auth session but no entry in the `usuarios`
    // table. Redirecting to /login directly would cause an infinite loop
    // (middleware detects the session and redirects back to /dashboard).
    // Routing through /api/auth/signout clears the session first.
    redirect('/api/auth/signout')
  }

  const userProfile: UserProfile = {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    perfil: usuario.perfil,
    ativo: usuario.ativo,
    criado_em: usuario.criado_em,
    atualizado_em: usuario.atualizado_em,
  }

  return (
    <ThemeProvider>
      <AppLayout user={userProfile}>
        {children}
      </AppLayout>
    </ThemeProvider>
  )
}
