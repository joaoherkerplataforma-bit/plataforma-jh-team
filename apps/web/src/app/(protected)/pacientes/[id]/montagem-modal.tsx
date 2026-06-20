'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  X,
  ArrowUp,
  ArrowDown,
  Crosshair,
  ZoomIn,
  ZoomOut,
  Loader2,
  AlertTriangle,
  ImageOff,
  Download,
} from 'lucide-react'

interface AjusteImagem {
  y: number
  zoom: number
}

type ImagemKey = 'frente' | 'lado' | 'costas'
type PeriodoKey = 'antes' | 'depois'
type IdImagem = `${PeriodoKey}_${ImagemKey}`

interface DadosMontagem {
  antes: Record<ImagemKey, string>
  depois: Record<ImagemKey, string>
}

interface MontagemModalProps {
  pacienteId: string
  retornoFormId: string
  aberto: boolean
  onFechar: () => void
}

const STEP_MOVE = 5
const STEP_ZOOM = 0.1
const LIMITE_MOVE = 75
const ZOOM_MIN = 1
const ZOOM_MAX = 2.5

const LABEL_POSE: Record<ImagemKey, string> = {
  frente: 'Frente',
  lado: 'Lado',
  costas: 'Costas',
}

function criarEstadoInicial(): Record<IdImagem, AjusteImagem> {
  return {
    antes_frente: { y: 0, zoom: 1 },
    antes_lado: { y: 0, zoom: 1 },
    antes_costas: { y: 0, zoom: 1 },
    depois_frente: { y: 0, zoom: 1 },
    depois_lado: { y: 0, zoom: 1 },
    depois_costas: { y: 0, zoom: 1 },
  }
}

export function MontagemModal({
  pacienteId,
  retornoFormId,
  aberto,
  onFechar,
}: MontagemModalProps) {
  const [dados, setDados] = useState<DadosMontagem | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [ajustes, setAjustes] =
    useState<Record<IdImagem, AjusteImagem>>(criarEstadoInicial)
  const [selecionada, setSelecionada] = useState<IdImagem | null>(null)
  const [imagensComErro, setImagensComErro] = useState<Set<string>>(new Set())
  const [imagensProntas, setImagensProntas] = useState<Set<string>>(new Set())
  const [gerando, setGerando] = useState(false)
  const ajustesRef = useRef(ajustes)
  ajustesRef.current = ajustes

  useEffect(() => {
    if (!aberto) {
      setDados(null)
      setErro(null)
      setAjustes(criarEstadoInicial())
      setSelecionada(null)
      setImagensComErro(new Set())
      setImagensProntas(new Set())
      return
    }

    let cancelado = false

    async function carregar() {
      setCarregando(true)
      setErro(null)
      try {
        const res = await fetch(
          `/api/pacientes/${pacienteId}/montagem-fotos/dados?retorno=${retornoFormId}`,
        )
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? 'Falha ao carregar dados da montagem')
        }
        const json: DadosMontagem = await res.json()
        if (!cancelado) setDados(json)
      } catch (err) {
        if (!cancelado)
          setErro(err instanceof Error ? err.message : 'Erro inesperado')
      } finally {
        if (!cancelado) setCarregando(false)
      }
    }

    carregar()
    return () => {
      cancelado = true
    }
  }, [aberto, pacienteId, retornoFormId])

  useEffect(() => {
    if (!dados) return
    const urls = [...Object.values(dados.antes), ...Object.values(dados.depois)]
    urls.forEach((url) => {
      const img = new Image()
      img.onload = () => setImagensProntas((prev) => new Set(prev).add(url))
      img.onerror = () => setImagensComErro((prev) => new Set(prev).add(url))
      img.src = url
    })
  }, [dados])

  useEffect(() => {
    if (!aberto) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onFechar()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [aberto, onFechar])

  useEffect(() => {
    if (!aberto) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [aberto])

  const handleAjuste = useCallback(
    (id: IdImagem, tipo: 'up' | 'down' | 'center' | 'zoomin' | 'zoomout') => {
      setAjustes((prev) => {
        const atual = prev[id]
        let novoY = atual.y
        let novoZoom = atual.zoom

        switch (tipo) {
          case 'up':
            novoY = Math.max(-LIMITE_MOVE, atual.y - STEP_MOVE)
            break
          case 'down':
            novoY = Math.min(LIMITE_MOVE, atual.y + STEP_MOVE)
            break
          case 'center':
            novoY = 0
            novoZoom = 1
            break
          case 'zoomin':
            novoZoom = Math.min(ZOOM_MAX, atual.zoom + STEP_ZOOM)
            break
          case 'zoomout':
            novoZoom = Math.max(ZOOM_MIN, atual.zoom - STEP_ZOOM)
            break
        }

        return { ...prev, [id]: { y: novoY, zoom: novoZoom } }
      })
    },
    [],
  )

  async function gerarMontagemFinal() {
    setGerando(true)
    try {
      const res = await fetch(
        `/api/pacientes/${pacienteId}/montagem-fotos/gerar`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ retornoFormId, ajustes: ajustesRef.current }),
        },
      )

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Falha ao gerar montagem final')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, `montagem-${pacienteId}-${Date.now()}`)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setGerando(false)
    }
  }

  if (!aberto) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="montagem-modal-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      <button
        type="button"
        aria-label="Fechar"
        onClick={onFechar}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-default"
      />

      <div className="relative w-full max-w-4xl max-h-[95vh] bg-[#0D0D0D] border border-[#2A2209] rounded-xl shadow-2xl flex flex-col">
        <div className="flex items-center justify-between gap-4 p-5 border-b border-[#2A2209]">
          <h2
            id="montagem-modal-titulo"
            className="text-base sm:text-lg font-semibold text-[#F5F0E8] tracking-wide"
          >
            Ajustar montagem
          </h2>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="p-1.5 rounded-md text-[#F5F0E8] hover:text-[#F5F0E8] hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {carregando && (
            <div className="flex items-center justify-center py-16 gap-2 text-[#F5F0E8]">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm">Carregando fotos...</span>
            </div>
          )}

          {erro && !carregando && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertTriangle size={24} className="text-red-400" />
              <p className="text-sm text-red-400 text-center">{erro}</p>
            </div>
          )}

          {dados && !carregando && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 sm:gap-6">
                <h3 className="text-center text-xs font-semibold text-[#F5F0E8] uppercase tracking-wider">
                  Antes
                </h3>
                <h3 className="text-center text-xs font-semibold text-[#F5F0E8] uppercase tracking-wider">
                  Depois
                </h3>

                {(['frente', 'lado', 'costas'] as ImagemKey[]).map((pose) =>
                  (['antes', 'depois'] as PeriodoKey[]).map((periodo) => {
                    const id: IdImagem = `${periodo}_${pose}`
                    const url = dados[periodo][pose]
                    const ajuste = ajustes[id]
                    const temErro = imagensComErro.has(url)

                    return (
                      <div
                        key={id}
                        className={`rounded-lg border transition-all ${
                          selecionada === id
                            ? 'border-[#C9A84C] ring-1 ring-[#C9A84C]/50'
                            : 'border-[#2A2209]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelecionada(id)}
                          className="w-full text-left"
                        >
                          <div className="aspect-square bg-[#1A1A1A] rounded-t-lg overflow-hidden relative">
                            {temErro ? (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageOff size={20} className="text-[#F5F0E8]/40" />
                              </div>
                            ) : (
                              <div
                                className="w-full h-full"
                                role="img"
                                aria-label={`${periodo === 'antes' ? 'Antes' : 'Depois'} — ${LABEL_POSE[pose]}`}
                                style={{
                                  backgroundImage: `url(${url})`,
                                  backgroundSize: `${ajuste.zoom * 100}%`,
                                  backgroundPosition: `50% calc(50% + ${ajuste.y}px)`,
                                  backgroundRepeat: 'no-repeat',
                                }}
                              />
                            )}
                          </div>
                        </button>

                        <div className="p-2 border-t border-[#2A2209]">
                          <p className="text-[11px] text-[#F5F0E8]/60 text-center mb-2">
                            {LABEL_POSE[pose]}
                          </p>
                          <div className="flex items-center justify-center gap-1">
                            <ControleBtn
                              icon={ArrowUp}
                              label="Mover para cima"
                              onClick={() => handleAjuste(id, 'up')}
                            />
                            <ControleBtn
                              icon={ArrowDown}
                              label="Mover para baixo"
                              onClick={() => handleAjuste(id, 'down')}
                            />
                            <div className="w-px h-4 bg-[#2A2209] mx-0.5" />
                            <ControleBtn
                              icon={Crosshair}
                              label="Centralizar"
                              onClick={() => handleAjuste(id, 'center')}
                            />
                            <div className="w-px h-4 bg-[#2A2209] mx-0.5" />
                            <ControleBtn
                              icon={ZoomIn}
                              label="Aumentar zoom"
                              onClick={() => handleAjuste(id, 'zoomin')}
                            />
                            <ControleBtn
                              icon={ZoomOut}
                              label="Diminuir zoom"
                              onClick={() => handleAjuste(id, 'zoomout')}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  }),
                )}
              </div>

              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={gerarMontagemFinal}
                  disabled={gerando}
                  className="inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-medium bg-[#C9A84C]/15 text-[#F5F0E8] border border-[#C9A84C]/30 hover:bg-[#C9A84C]/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {gerando ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Download size={16} />
                  )}
                  {gerando ? 'Gerando...' : 'Gerar montagem final'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface ControleBtnProps {
  icon: React.ComponentType<{ size?: number }>
  label: string
  onClick: () => void
}

function ControleBtn({ icon: Icon, label, onClick }: ControleBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="p-1 rounded text-[#F5F0E8]/60 hover:text-[#F5F0E8] hover:bg-white/10 transition-colors"
    >
      <Icon size={14} />
    </button>
  )
}
