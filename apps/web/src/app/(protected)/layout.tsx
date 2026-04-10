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
    redirect('/login')
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
