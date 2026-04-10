'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="px-6 py-2 border border-white/20 text-white/60 hover:text-white hover:border-gold rounded-lg transition-colors text-sm tracking-wide"
    >
      Sair
    </button>
  )
}
