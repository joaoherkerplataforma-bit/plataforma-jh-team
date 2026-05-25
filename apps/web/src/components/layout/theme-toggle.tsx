'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

const STORAGE_KEY = 'jh-team-theme'

type Tema = 'light' | 'dark'

function aplicarTema(tema: Tema) {
  document.documentElement.classList.toggle('light', tema === 'light')
  document.documentElement.classList.toggle('dark', tema === 'dark')
  document.documentElement.style.colorScheme = tema
}

export function ThemeToggle() {
  const [tema, setTema] = useState<Tema>('dark')
  const [montado, setMontado] = useState(false)

  useEffect(() => {
    const salvo = window.localStorage.getItem(STORAGE_KEY) as Tema | null
    const inicial: Tema =
      salvo === 'light' || salvo === 'dark'
        ? salvo
        : window.matchMedia('(prefers-color-scheme: light)').matches
          ? 'light'
          : 'dark'

    setTema(inicial)
    aplicarTema(inicial)
    setMontado(true)
  }, [])

  function alternarTema() {
    const proximo = tema === 'dark' ? 'light' : 'dark'
    setTema(proximo)
    aplicarTema(proximo)
    window.localStorage.setItem(STORAGE_KEY, proximo)
  }

  const claro = tema === 'light'
  const Icone = claro ? Moon : Sun

  return (
    <button
      type="button"
      onClick={alternarTema}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#C9A84C] text-[#F5F0E8] hover:bg-[#1A1500] transition-colors"
      aria-label={claro ? 'Ativar tema escuro' : 'Ativar tema claro'}
      title={claro ? 'Tema escuro' : 'Tema claro'}
      suppressHydrationWarning
    >
      {montado ? <Icone size={16} /> : <Sun size={16} />}
    </button>
  )
}
