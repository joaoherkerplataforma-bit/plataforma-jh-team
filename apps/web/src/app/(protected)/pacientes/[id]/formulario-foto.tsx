'use client'

import { useState } from 'react'
import { ImageOff } from 'lucide-react'

interface FormularioFotoProps {
  url: string
  alt: string
}

export function FormularioFoto({ url, alt }: FormularioFotoProps) {
  const [erro, setErro] = useState(false)

  if (erro) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="aspect-square bg-[#1A1A1A] border border-[#2A2209] rounded-md flex flex-col items-center justify-center gap-2 p-3 text-[#F5F0E8] hover:text-[#F5F0E8] hover:border-[#C9A84C]/40 transition-colors"
      >
        <ImageOff size={20} />
        <span className="text-[11px] text-center leading-tight">
          Imagem indisponível — abrir no Forms
        </span>
      </a>
    )
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="aspect-square bg-[#1A1A1A] border border-[#2A2209] rounded-md overflow-hidden block hover:border-[#C9A84C]/40 transition-colors"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        loading="lazy"
        onError={() => setErro(true)}
        className="w-full h-full object-cover"
      />
    </a>
  )
}
