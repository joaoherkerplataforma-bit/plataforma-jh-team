'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Check, Eye } from 'lucide-react'
import type { Videoaula } from '@/types/videoaulas'

interface PlayerProps {
  videoaula: Videoaula
  signedUrl: string
  jaAssistida: boolean
  modoPreview: boolean
}

export function Player({
  videoaula,
  signedUrl,
  jaAssistida,
  modoPreview,
}: PlayerProps) {
  const router = useRouter()
  const [marcando, setMarcando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleMarcarAssistida() {
    setMarcando(true)
    setErro(null)
    try {
      const res = await fetch('/api/portal/progresso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoaula_id: videoaula.id }),
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string
        }
        setErro(data.error ?? 'Falha ao marcar como assistida.')
        setMarcando(false)
        return
      }

      // Sucesso: revalida cache (revalidatePath ja foi chamado no servidor)
      // e volta para o Portal — proxima videoaula ja desbloqueada.
      router.refresh()
      router.push('/portal')
    } catch (err) {
      console.error('[player] handleMarcarAssistida falhou', err)
      setErro('Erro de conexao. Tente novamente.')
      setMarcando(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Modo preview banner */}
      {modoPreview && (
        <div className="mb-6 px-4 py-3 bg-[#1A1500] border border-[#C9A84C]/40 rounded-lg flex items-center gap-2 text-sm text-[#F5F0E8]">
          <Eye size={16} />
          <span>
            Modo preview — voce esta vendo a visao do aluno. O botao de marcar
            como assistida fica desabilitado.
          </span>
        </div>
      )}

      {/* Header com voltar */}
      <header className="mb-6">
        <Link
          href="/portal"
          className="inline-flex items-center gap-2 text-sm text-[#8A7A5A] hover:text-[#F5F0E8] transition-colors"
        >
          <ArrowLeft size={16} />
          Voltar para o Portal
        </Link>

        <h1 className="mt-4 text-2xl sm:text-3xl font-serif text-[#F5F0E8] tracking-wide">
          {videoaula.titulo}
        </h1>
        <div className="h-px w-32 mt-2 bg-gradient-to-r from-[#C9A84C] to-transparent" />
      </header>

      {/* Player */}
      <div className="bg-black border border-[#2A2209] rounded-xl overflow-hidden mb-6">
        <video
          controls
          src={signedUrl}
          controlsList="nodownload"
          className="w-full aspect-video bg-black"
        >
          Seu navegador nao suporta reproducao de video.
        </video>
      </div>

      {/* Descricao */}
      {videoaula.descricao && (
        <section className="mb-6">
          <p className="text-[#F5F0E8] text-sm sm:text-base leading-relaxed whitespace-pre-line">
            {videoaula.descricao}
          </p>
        </section>
      )}

      {/* Acao: marcar como assistida */}
      <section className="mt-8">
        {jaAssistida ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm bg-emerald-900/30 text-emerald-400 border border-emerald-700/40">
              <Check size={14} />
              Videoaula assistida
            </span>
            <Link
              href="/portal"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm bg-[#1A1500] border border-[#C9A84C]/40 text-[#F5F0E8] hover:bg-[#1A1500]/70 hover:border-[#C9A84C] transition-colors"
            >
              Voltar para a lista
            </Link>
          </div>
        ) : modoPreview ? (
          <button
            type="button"
            disabled
            title="Modo preview — apenas alunos podem marcar como assistida"
            className="px-4 py-2 rounded-md text-sm bg-[#1F1F1F] border border-[#2A2209] text-[#5A5040] cursor-not-allowed"
          >
            Marcar como assistida
          </button>
        ) : (
          <button
            type="button"
            onClick={handleMarcarAssistida}
            disabled={marcando}
            className="px-5 py-2.5 rounded-md text-sm font-medium bg-[#C9A84C] text-black hover:bg-[#E8C97A] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {marcando ? 'Marcando...' : 'Marcar como assistida'}
          </button>
        )}

        {erro && (
          <p className="mt-3 text-sm text-red-400" role="alert">
            {erro}
          </p>
        )}
      </section>
    </div>
  )
}
