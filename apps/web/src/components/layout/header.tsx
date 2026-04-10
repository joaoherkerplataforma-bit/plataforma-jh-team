'use client'

import { useRouter } from 'next/navigation'
import { Sun, Moon, LogOut, Menu } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/components/theme-provider'
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
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-[#1A1A1A] border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
        {/* Esquerda: hamburger (mobile) + saudacao */}
        <div className="flex items-center gap-4">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              aria-label="Abrir menu"
            >
              <Menu size={22} />
            </button>
          )}

          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1A1A1A] dark:text-white">
              Ola, {user.nome.split(' ')[0]}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
              Aqui esta o resumo da sua plataforma hoje.
            </p>
          </div>
        </div>

        {/* Direita: badge + toggle tema + sair */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-[#C9A84C]/20 text-[#C9A84C]">
            {PERFIL_LABELS[user.perfil]}
          </span>

          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            aria-label={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 dark:text-white/60 hover:text-[#1A1A1A] dark:hover:text-white border border-gray-200 dark:border-white/20 hover:border-[#C9A84C] dark:hover:border-[#C9A84C] rounded-lg transition-colors"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>
    </header>
  )
}
