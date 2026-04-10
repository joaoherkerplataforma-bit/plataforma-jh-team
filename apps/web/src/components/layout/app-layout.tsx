'use client'

import { useState } from 'react'
import type { UserProfile } from '@/types/auth'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

interface AppLayoutProps {
  user: UserProfile
  children: React.ReactNode
}

export function AppLayout({ user, children }: AppLayoutProps) {
  const [sidebarMobileAberta, setSidebarMobileAberta] = useState(false)

  return (
    <div className="flex h-screen bg-white dark:bg-[#1A1A1A]">
      <Sidebar
        user={user}
        mobileAberta={sidebarMobileAberta}
        onFecharMobile={() => setSidebarMobileAberta(false)}
      />

      <div className="flex-1 flex flex-col min-h-screen overflow-auto">
        <Header
          user={user}
          onToggleSidebar={() => setSidebarMobileAberta(!sidebarMobileAberta)}
        />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  )
}
