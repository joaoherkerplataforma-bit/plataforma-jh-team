'use client'

import { useRouter } from 'next/navigation'
import { LogOut, Menu } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { UserProfile, PerfilAcesso } from '@/types/auth'

const PERFIL_LABELS: Record<PerfilAcesso, string> = {
  joao_admin: 'ADMIN',
  pablo: 'PABLO',
  joao_estagiario: 'ESTAGIARIO',
  aluno: 'ALUNO',
} as const

interface HeaderProps {
  user: UserProfile
  onToggleSidebar?: () => void
}

export function Header({ user, onToggleSidebar }: HeaderProps) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-30 bg-[#0A0A0A] border-b border-[#2A2209]">
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
        {/* Esquerda: hamburger (mobile) + saudacao */}
        <div className="flex items-center gap-4">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-lg text-[#F5F0E8] hover:text-[#F5F0E8] hover:bg-[#1A1500]/60 transition-colors"
              aria-label="Abrir menu"
            >
              <Menu size={22} />
            </button>
          )}

          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#F5F0E8]">
              Ola, {user.nome.split(' ')[0]}
            </h2>
            <p className="text-sm text-[#F5F0E8] hidden sm:block">
              Aqui esta o resumo da sua plataforma hoje.
            </p>
          </div>
        </div>

        {/* Direita: badge + toggle tema + sair */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-[#1A1500] text-[#F5F0E8] border border-[#C9A84C]">
            {PERFIL_LABELS[user.perfil]}
          </span>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm text-[#F5F0E8] border border-[#C9A84C] hover:bg-[#1A1500] rounded-lg transition-colors"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>
    </header>
  )
}
