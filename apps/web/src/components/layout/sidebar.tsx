'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type { UserProfile, PerfilAcesso } from '@/types/auth'

const PERFIL_LABELS: Record<PerfilAcesso, string> = {
  joao_admin: 'ADMIN',
  pablo: 'PABLO',
  joao_estagiario: 'ESTAGIARIO',
  aluno: 'ALUNO',
} as const

const menuItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    perfis: ['joao_admin'] as PerfilAcesso[],
  },
  {
    label: 'Pacientes',
    href: '/dashboard',
    icon: Users,
    perfis: ['joao_admin'] as PerfilAcesso[],
  },
  {
    label: 'Tarefas',
    href: '/tarefas',
    icon: CheckSquare,
    perfis: ['pablo', 'joao_estagiario'] as PerfilAcesso[],
  },
  {
    label: 'Portal',
    href: '/portal',
    icon: BookOpen,
    perfis: ['aluno'] as PerfilAcesso[],
  },
] as const

interface SidebarProps {
  user: UserProfile
  mobileAberta?: boolean
  onFecharMobile?: () => void
}

export function Sidebar({ user, mobileAberta, onFecharMobile }: SidebarProps) {
  const [expandida, setExpandida] = useState(true)
  const pathname = usePathname()

  const itensVisiveis = menuItems.filter((item) =>
    item.perfis.includes(user.perfil)
  )

  const inicial = user.nome.charAt(0).toUpperCase()

  return (
    <>
      {/* Overlay mobile */}
      {mobileAberta && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onFecharMobile}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen flex flex-col
          bg-[#F8F9FA] dark:bg-[#222222] border-r border-gray-200 dark:border-gray-700
          transition-all duration-300
          ${expandida ? 'w-60' : 'w-16'}
          ${mobileAberta ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:relative
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-center h-16 border-b border-gray-200 dark:border-gray-700 px-4">
          <span className="text-[#C9A84C] font-bold tracking-[0.15em] text-xl whitespace-nowrap overflow-hidden">
            {expandida ? 'JH TEAM' : 'JH'}
          </span>
        </div>

        {/* Avatar do usuario */}
        <div className={`px-4 py-4 border-b border-gray-200 dark:border-gray-700 ${expandida ? '' : 'flex justify-center'}`}>
          <div className={`flex items-center gap-3 ${expandida ? '' : 'flex-col'}`}>
            <div className="w-10 h-10 rounded-full bg-[#C9A84C] flex items-center justify-center flex-shrink-0">
              <span className="text-black font-bold text-sm">{inicial}</span>
            </div>
            {expandida && (
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-[#1A1A1A] dark:text-white truncate">
                  {user.nome}
                </p>
                <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-[#C9A84C]/20 text-[#C9A84C]">
                  {PERFIL_LABELS[user.perfil]}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Menu de navegacao */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {itensVisiveis.map((item) => {
            const ativo = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onFecharMobile}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                  ${expandida ? '' : 'justify-center'}
                  ${
                    ativo
                      ? 'bg-[#C9A84C]/10 text-[#C9A84C]'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-[#1A1A1A] dark:hover:text-white'
                  }
                `}
                title={expandida ? undefined : item.label}
              >
                <Icon size={20} className="flex-shrink-0" />
                {expandida && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Botao toggle expandir/recolher */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-2">
          <button
            type="button"
            onClick={() => setExpandida(!expandida)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-[#1A1A1A] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            {expandida ? (
              <>
                <ChevronLeft size={18} />
                <span className="text-xs">Recolher</span>
              </>
            ) : (
              <ChevronRight size={18} />
            )}
          </button>
        </div>
      </aside>
    </>
  )
}
