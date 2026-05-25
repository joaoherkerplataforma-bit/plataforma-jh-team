import { Eye } from 'lucide-react'
import type { VideoaulaComProgresso } from '@/types/videoaulas'
import type { Paciente } from '@/types/pacientes'
import type { FormularioRecebido } from '@/types/formularios'
import type { ProtocoloAtivo } from '@/lib/protocolos'
import { VideoaulasList } from '@/app/(protected)/portal/videoaulas-list'
import { AreaPersonalizada } from '@/app/(protected)/portal/area-personalizada'

interface PortalContentProps {
  videoaulasComProgresso: VideoaulaComProgresso[]
  acessoLiberado: boolean
  modoPreview?: boolean
  paciente: Paciente | null
  protocolo: ProtocoloAtivo | null
  formularios: FormularioRecebido[]
}

/**
 * Server Component. Renderiza a árvore do Portal do Aluno aplicando o gating
 * server-side: enquanto houver videoaulas pendentes, a área personalizada
 * NÃO é incluída no HTML.
 */
export function PortalContent({
  videoaulasComProgresso,
  acessoLiberado,
  modoPreview = false,
  paciente,
  protocolo,
  formularios,
}: PortalContentProps) {
  return (
    <div className="max-w-3xl mx-auto">
      {modoPreview && (
        <div className="mb-6 px-4 py-3 bg-[#1A1500] border border-[#C9A84C]/40 rounded-lg flex items-center gap-2 text-sm text-[#F5F0E8]">
          <Eye size={16} />
          <span>Modo preview — você está vendo a visão do aluno.</span>
        </div>
      )}

      {/* Header */}
      <header className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-serif text-[#F5F0E8] tracking-wide">
          Portal do Aluno
        </h1>
        <div className="h-px w-32 mt-2 bg-gradient-to-r from-[#C9A84C] to-transparent" />
      </header>

      {acessoLiberado && paciente ? (
        // Acesso liberado: mostra área personalizada real e mantém a trilha de
        // videoaulas como referência (todas assistidas).
        <>
          <AreaPersonalizada
            paciente={paciente}
            protocolo={protocolo}
            formularios={formularios}
          />

          {videoaulasComProgresso.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm uppercase tracking-wider text-[#8A7A5A] mb-3">
                Videoaulas concluídas
              </h2>
              <VideoaulasList videoaulas={videoaulasComProgresso} />
            </section>
          )}
        </>
      ) : (
        // Bloqueado: somente trilha de videoaulas. A área personalizada NÃO é
        // renderizada — não vaza no HTML.
        <>
          <section className="mb-6">
            <p className="text-[#F5F0E8] text-sm sm:text-base leading-relaxed">
              Antes de acessar sua área personalizada, assista as videoaulas
              obrigatórias na ordem.
            </p>
            <p className="mt-2 text-xs text-[#8A7A5A]">
              Cada videoaula é desbloqueada após você concluir a anterior.
            </p>
          </section>

          <VideoaulasList videoaulas={videoaulasComProgresso} />
        </>
      )}
    </div>
  )
}
