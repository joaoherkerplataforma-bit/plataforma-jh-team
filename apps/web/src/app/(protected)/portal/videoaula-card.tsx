import Link from 'next/link'
import { Check, Lock, Play } from 'lucide-react'
import type { VideoaulaComProgresso } from '@/types/videoaulas'

interface VideoaulaCardProps {
  videoaula: VideoaulaComProgresso
}

function formatarDuracao(seg: number | null): string | null {
  if (!seg || seg <= 0) return null
  const mm = Math.floor(seg / 60)
  const ss = seg % 60
  return `${mm}:${ss.toString().padStart(2, '0')}`
}

export function VideoaulaCard({ videoaula }: VideoaulaCardProps) {
  const { id, titulo, descricao, ordem, duracao_seg, assistida, desbloqueada } =
    videoaula
  const duracao = formatarDuracao(duracao_seg)

  // Estilo base + variantes por estado
  const baseCard =
    'group relative bg-[#111111] border rounded-xl p-5 sm:p-6 transition-all'

  const estadoClasses = !desbloqueada
    ? 'border-[#1F1F1F] opacity-60 cursor-not-allowed'
    : assistida
      ? 'border-[#2A2209] hover:border-[#C9A84C]/50 hover:bg-[#1A1500]/20'
      : 'border-[#C9A84C]/40 hover:border-[#C9A84C] hover:bg-[#1A1500]/30 hover:shadow-[0_0_0_1px_#C9A84C40]'

  const cardClasses = `${baseCard} ${estadoClasses}`

  const conteudo = (
    <div className="flex items-start gap-4 sm:gap-5">
      {/* Número/ordem em destaque */}
      <div
        className={`shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg flex items-center justify-center text-lg sm:text-xl font-serif border ${
          !desbloqueada
            ? 'bg-[#0D0D0D] border-[#1F1F1F] text-[#F5F0E8]'
            : assistida
              ? 'bg-[#1A1500] border-[#C9A84C]/40 text-[#F5F0E8]'
              : 'bg-[#1A1500] border-[#C9A84C] text-[#F5F0E8]'
        }`}
      >
        {ordem}
      </div>

      {/* Texto */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <h3
            className={`text-base sm:text-lg font-medium ${
              !desbloqueada ? 'text-[#F5F0E8]' : 'text-[#F5F0E8]'
            }`}
          >
            {titulo}
          </h3>
          {renderBadge({ assistida, desbloqueada })}
        </div>

        {descricao && (
          <p
            className={`mt-1.5 text-sm leading-relaxed line-clamp-2 ${
              !desbloqueada ? 'text-[#F5F0E8]/70' : 'text-[#F5F0E8]'
            }`}
          >
            {descricao}
          </p>
        )}

        <div className="mt-3 flex items-center gap-3 text-xs text-[#F5F0E8]">
          {duracao && <span>{duracao}</span>}
          {desbloqueada && !assistida && (
            <span className="inline-flex items-center gap-1.5 text-[#F5F0E8]">
              <Play size={12} />
              Assistir
            </span>
          )}
        </div>
      </div>
    </div>
  )

  if (!desbloqueada) {
    // Card não clicável
    return (
      <div className={cardClasses} aria-disabled="true">
        {conteudo}
      </div>
    )
  }

  return (
    <Link href={`/portal/videoaula/${id}`} className={cardClasses}>
      {conteudo}
    </Link>
  )
}

function renderBadge({
  assistida,
  desbloqueada,
}: {
  assistida: boolean
  desbloqueada: boolean
}) {
  if (assistida) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-emerald-900/30 text-emerald-400 border border-emerald-700/40 whitespace-nowrap">
        <Check size={12} />
        Assistido
      </span>
    )
  }
  if (!desbloqueada) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-[#1A1A1A] text-[#F5F0E8] border border-[#2A2209] whitespace-nowrap">
        <Lock size={12} />
        Bloqueado
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-[#1A1500] text-[#F5F0E8] border border-[#C9A84C]/40 whitespace-nowrap">
      Pendente
    </span>
  )
}
