'use client'

import { useEffect, useMemo } from 'react'
import { X } from 'lucide-react'
import type { FormularioRecebido } from '@/types/formularios'
import { LABELS_FORMULARIO, isFotoUrl, parseDadosRaw } from '@/lib/formularios'
import { formatarData } from '@/lib/pacientes'
import { FormularioFoto } from '@/app/(protected)/pacientes/[id]/formulario-foto'

interface FormularioModalProps {
  formulario: FormularioRecebido
  aberto: boolean
  onFechar: () => void
}

const TIPOS_FOTO = new Set(['fotos_iniciais', 'fotos_30dias'])

export function FormularioModal({
  formulario,
  aberto,
  onFechar,
}: FormularioModalProps) {
  const respostas = useMemo(
    () => parseDadosRaw(formulario.dados_raw),
    [formulario.dados_raw],
  )

  // Esc fecha o modal
  useEffect(() => {
    if (!aberto) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onFechar()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [aberto, onFechar])

  // Trava scroll do body enquanto modal aberto
  useEffect(() => {
    if (!aberto) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [aberto])

  if (!aberto) return null

  const titulo = LABELS_FORMULARIO[formulario.tipo_formulario]
  const dataLabel = formatarData(formulario.criado_em.slice(0, 10))
  const modoFoto = TIPOS_FOTO.has(formulario.tipo_formulario)

  const corpo = renderCorpo(respostas, modoFoto, titulo)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="formulario-modal-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      <button
        type="button"
        aria-label="Fechar"
        onClick={onFechar}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-default"
      />

      <div className="relative w-full max-w-3xl max-h-[90vh] bg-[#0D0D0D] border border-[#2A2209] rounded-xl shadow-2xl flex flex-col">
        <div className="flex items-start justify-between gap-4 p-5 border-b border-[#2A2209]">
          <div className="space-y-1">
            <h2
              id="formulario-modal-titulo"
              className="text-base sm:text-lg font-semibold text-[#F5F0E8] tracking-wide"
            >
              {titulo}
            </h2>
            <p className="text-xs text-[#8A7A5A]">Recebido em {dataLabel}</p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="p-1.5 rounded-md text-[#8A7A5A] hover:text-[#F5F0E8] hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">{corpo}</div>
      </div>
    </div>
  )
}

function renderCorpo(
  respostas: ReturnType<typeof parseDadosRaw>,
  modoFoto: boolean,
  alt: string,
) {
  if (respostas.length === 0) {
    return (
      <p className="text-sm text-[#8A7A5A]">
        Sem respostas detalhadas — confira diretamente no Google Forms.
      </p>
    )
  }

  if (modoFoto) {
    // No modo foto, prioriza respostas que parecem URL de foto. Se nenhuma
    // passar no regex, mostra todas (assumindo que são URLs do Drive).
    const fotosDetectadas = respostas.filter((r) => isFotoUrl(r.resposta))
    const lista = fotosDetectadas.length > 0 ? fotosDetectadas : respostas

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {lista.map((r, idx) => (
          <FormularioFoto
            key={`${r.pergunta}-${idx}`}
            url={r.resposta}
            alt={`${alt} — ${r.pergunta}`}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {respostas.map((r, idx) => (
        <div
          key={`${r.pergunta}-${idx}`}
          className="border border-[#2A2209] rounded-md p-3 bg-[#111111]"
        >
          <p className="text-xs font-semibold text-[#C9A84C] mb-1">
            {r.pergunta}
          </p>
          <p className="text-sm text-[#F5F0E8] whitespace-pre-wrap break-words">
            {r.resposta}
          </p>
        </div>
      ))}
    </div>
  )
}
