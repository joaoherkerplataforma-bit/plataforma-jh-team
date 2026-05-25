import type { VideoaulaComProgresso } from '@/types/videoaulas'
import { VideoaulaCard } from '@/app/(protected)/portal/videoaula-card'

interface VideoaulasListProps {
  videoaulas: VideoaulaComProgresso[]
}

export function VideoaulasList({ videoaulas }: VideoaulasListProps) {
  if (videoaulas.length === 0) {
    return (
      <div className="bg-[#111111] border border-[#2A2209] rounded-xl p-8 text-center">
        <p className="text-[#F5F0E8] text-sm">
          Nenhuma videoaula disponível no momento.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:gap-4">
      {videoaulas.map((v) => (
        <VideoaulaCard key={v.id} videoaula={v} />
      ))}
    </div>
  )
}
