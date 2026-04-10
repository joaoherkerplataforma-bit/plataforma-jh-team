import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/app/dashboard/logout-button'

export default async function TarefasPage() {
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

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 px-4">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold tracking-[0.2em] text-gold">
          Tarefas
        </h1>
        <div className="h-px w-48 mx-auto bg-gradient-to-r from-transparent via-gold to-transparent" />
        {usuario && (
          <p className="text-white/50 text-sm">
            Logado como{' '}
            <span className="text-gold">{usuario.nome}</span>{' '}
            <span className="text-white/30">({usuario.perfil})</span>
          </p>
        )}
      </div>

      <LogoutButton />

      <p className="text-white/20 text-xs mt-4">
        Modulos B, C e D em desenvolvimento
      </p>
    </main>
  )
}
