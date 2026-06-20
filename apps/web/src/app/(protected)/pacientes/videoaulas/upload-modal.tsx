'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Videoaula } from '@/types/videoaulas'

const TAMANHO_MAXIMO_BYTES = 1_073_741_824 // 1 GB
const MIME_PERMITIDOS: Readonly<string[]> = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
] as const
const EXT_PERMITIDAS: Readonly<string[]> = ['mp4', 'webm', 'mov'] as const

type Mode = 'create' | 'edit'

interface UploadModalProps {
  aberto: boolean
  onFechar: () => void
  mode: Mode
  videoaula?: Videoaula
  /** Próxima ordem sugerida (max + 1) usada apenas em modo 'create'. */
  proximaOrdemSugerida?: number
}

function extensaoDoArquivo(file: File): string {
  const partes = file.name.split('.')
  const ext = partes.length > 1 ? partes.pop() ?? '' : ''
  return ext.toLowerCase()
}

function formatarBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function UploadModal({
  aberto,
  onFechar,
  mode,
  videoaula,
  proximaOrdemSugerida,
}: UploadModalProps) {
  const router = useRouter()

  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [ordem, setOrdem] = useState<number>(1)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  // Reseta o form quando o modal abre
  useEffect(() => {
    if (!aberto) return

    if (mode === 'edit' && videoaula) {
      setTitulo(videoaula.titulo)
      setDescricao(videoaula.descricao ?? '')
      setOrdem(videoaula.ordem)
    } else {
      setTitulo('')
      setDescricao('')
      setOrdem(proximaOrdemSugerida ?? 1)
    }

    setArquivo(null)
    setErro(null)
    setStatusMsg(null)
    setSalvando(false)
  }, [aberto, mode, videoaula, proximaOrdemSugerida])

  const handleArquivoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setErro(null)
      const file = e.target.files?.[0] ?? null
      if (!file) {
        setArquivo(null)
        return
      }

      const ext = extensaoDoArquivo(file)
      const mimeOk = MIME_PERMITIDOS.includes(file.type)
      const extOk = EXT_PERMITIDAS.includes(ext)
      if (!mimeOk && !extOk) {
        setErro('Formato invalido. Envie um video MP4, WEBM ou MOV.')
        setArquivo(null)
        e.target.value = ''
        return
      }

      if (file.size > TAMANHO_MAXIMO_BYTES) {
        setErro(
          `Arquivo muito grande (${formatarBytes(file.size)}). Limite: 1 GB.`,
        )
        setArquivo(null)
        e.target.value = ''
        return
      }

      setArquivo(file)
    },
    [],
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setErro(null)
      setStatusMsg(null)

      const tituloLimpo = titulo.trim()
      if (!tituloLimpo) {
        setErro('O titulo e obrigatorio.')
        return
      }
      if (!Number.isFinite(ordem) || ordem < 1) {
        setErro('A ordem deve ser um numero inteiro maior ou igual a 1.')
        return
      }

      if (mode === 'create' && !arquivo) {
        setErro('Selecione um arquivo de video.')
        return
      }

      setSalvando(true)

      try {
        if (mode === 'create' && arquivo) {
          // 1) Upload direto para o bucket via supabase-js (chunked internamente).
          setStatusMsg('Enviando video... (pode levar alguns minutos para arquivos grandes)')
          const supabase = createClient()
          const ext = extensaoDoArquivo(arquivo) || 'mp4'
          const storagePath = `${crypto.randomUUID()}.${ext}`

          const { error: uploadError } = await supabase.storage
            .from('videoaulas')
            .upload(storagePath, arquivo, {
              cacheControl: '3600',
              upsert: false,
              contentType: arquivo.type || 'video/mp4',
            })

          if (uploadError) {
            setErro(`Falha no upload: ${uploadError.message}`)
            return
          }

          // 2) Cria o registro de metadados na tabela.
          setStatusMsg('Salvando metadados...')
          const respostaCreate = await fetch('/api/admin/videoaulas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              titulo: tituloLimpo,
              descricao: descricao.trim() || null,
              ordem,
              storage_path: storagePath,
            }),
          })

          if (!respostaCreate.ok) {
            // Rollback: remove o objeto do storage para nao deixar lixo.
            try {
              await supabase.storage.from('videoaulas').remove([storagePath])
            } catch {
              // Best-effort: se o rollback falhar, registra mas nao sobrescreve a mensagem original.
              console.error('[videoaulas] rollback do storage falhou', storagePath)
            }
            const payload = await respostaCreate.json().catch(() => ({}))
            setErro(payload?.error ?? `Falha ao salvar (HTTP ${respostaCreate.status}).`)
            return
          }
        } else if (mode === 'edit' && videoaula) {
          setStatusMsg('Atualizando metadados...')
          const respostaPatch = await fetch(
            `/api/admin/videoaulas/${videoaula.id}`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                titulo: tituloLimpo,
                descricao: descricao.trim() || null,
                ordem,
              }),
            },
          )

          if (!respostaPatch.ok) {
            const payload = await respostaPatch.json().catch(() => ({}))
            setErro(payload?.error ?? `Falha ao atualizar (HTTP ${respostaPatch.status}).`)
            return
          }
        }

        setStatusMsg(null)
        onFechar()
        router.refresh()
      } catch (err) {
        setErro(
          `Erro inesperado: ${err instanceof Error ? err.message : 'desconhecido'}`,
        )
      } finally {
        setSalvando(false)
      }
    },
    [arquivo, descricao, mode, onFechar, ordem, router, titulo, videoaula],
  )

  if (!aberto) return null

  const inputClass =
    'w-full bg-[#0A0A0A] border border-[#2A2209] rounded-lg px-3 py-2 text-[#F5F0E8] text-sm focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C] transition-colors placeholder-[#F5F0E8]/50 disabled:opacity-50'
  const labelClass = 'block text-sm text-[#F5F0E8] mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111111] border border-[#2A2209] rounded-xl w-full max-w-lg mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2209]">
          <h2 className="text-lg font-semibold text-[#F5F0E8] tracking-wide">
            {mode === 'create' ? 'Nova videoaula' : 'Editar videoaula'}
          </h2>
          <button
            type="button"
            onClick={onFechar}
            disabled={salvando}
            className="text-[#F5F0E8] hover:text-[#F5F0E8] transition-colors text-xl leading-none disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Titulo */}
          <div>
            <label htmlFor="titulo" className={labelClass}>
              Titulo *
            </label>
            <input
              id="titulo"
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
              maxLength={200}
              disabled={salvando}
              className={inputClass}
            />
          </div>

          {/* Descricao */}
          <div>
            <label htmlFor="descricao" className={labelClass}>
              Descricao
            </label>
            <textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              disabled={salvando}
              className={inputClass}
            />
          </div>

          {/* Ordem */}
          <div>
            <label htmlFor="ordem" className={labelClass}>
              Ordem na trilha *
            </label>
            <input
              id="ordem"
              type="number"
              min={1}
              step={1}
              value={ordem}
              onChange={(e) => setOrdem(parseInt(e.target.value, 10) || 0)}
              required
              disabled={salvando}
              className={inputClass}
            />
          </div>

          {/* Arquivo (apenas em modo create) */}
          {mode === 'create' && (
            <div>
              <label htmlFor="arquivo" className={labelClass}>
                Arquivo de video * (MP4, WEBM ou MOV - max 1 GB)
              </label>
              <input
                id="arquivo"
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={handleArquivoChange}
                disabled={salvando}
                className="block w-full text-sm text-[#F5F0E8] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#1A1500] file:text-[#F5F0E8] hover:file:bg-[#2A2209] file:cursor-pointer disabled:opacity-50"
              />
              {arquivo && (
                <p className="mt-1 text-xs text-[#F5F0E8]">
                  {arquivo.name} ({formatarBytes(arquivo.size)})
                </p>
              )}
            </div>
          )}

          {/* Status / Erro */}
          {statusMsg && !erro && (
            <p className="text-[#F5F0E8] text-sm">{statusMsg}</p>
          )}
          {erro && <p className="text-red-400 text-sm">{erro}</p>}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onFechar}
              disabled={salvando}
              className="px-4 py-2 text-sm text-[#F5F0E8] hover:text-[#F5F0E8] border border-[#2A2209] hover:border-[#C9A84C] rounded-lg transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="px-4 py-2 text-sm bg-[#C9A84C] hover:bg-[#E2BC6A] text-[#0A0A0A] font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {salvando
                ? mode === 'create'
                  ? 'Enviando...'
                  : 'Salvando...'
                : mode === 'create'
                  ? 'Enviar e criar'
                  : 'Salvar alteracoes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
