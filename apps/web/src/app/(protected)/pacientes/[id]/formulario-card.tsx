'use client'

import { useState } from 'react'
import type { CardFormulario } from '@/types/formularios'
import { formatarData } from '@/lib/pacientes'
import { FormularioModal } from '@/app/(protected)/pacientes/[id]/formulario-modal'

interface FormularioCardProps {
  card: CardFormulario
}

export function FormularioCard({ card }: FormularioCardProps) {
  const [modalAberto, setModalAberto] = useState(false)
  const respondido = card.status === 'respondido'

  const titulo = card.cicloNumero
    ? `${card.titulo} — ciclo ${card.cicloNumero}`
    : card.titulo

  const dataLabel = respondido && card.data
    ? formatarData(card.data.slice(0, 10))
    : null

  const badge = respondido
    ? {
        texto: 'Respondido',
        classe:
          'bg-green-900/30 text-green-300 border border-green-600/40',
      }
    : {
        texto: 'Aguardando',
        classe: 'bg-white/5 text-[#F5F0E8] border border-white/10',
      }

  return (
    <div className="bg-[#111111] border border-[#2A2209] rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-medium text-[#F5F0E8] leading-snug">
          {titulo}
        </h3>
        <span
          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap ${badge.classe}`}
        >
          {badge.texto}
        </span>
      </div>

      <div className="text-xs text-[#F5F0E8]">
        {dataLabel ? (
          <span>Recebido em {dataLabel}</span>
        ) : (
          <span>Sem registro</span>
        )}
      </div>

      <button
        type="button"
        disabled={!respondido}
        onClick={() => respondido && setModalAberto(true)}
        className={`mt-auto inline-flex items-center justify-center rounded-md px-3 py-2 text-xs font-medium transition-colors ${
          respondido
            ? 'bg-[#C9A84C]/15 text-[#F5F0E8] border border-[#C9A84C]/30 hover:bg-[#C9A84C]/25'
            : 'bg-white/5 text-[#F5F0E8]/60 border border-white/10 cursor-not-allowed'
        }`}
      >
        Ver respostas
      </button>

      {card.formulario && (
        <FormularioModal
          formulario={card.formulario}
          aberto={modalAberto}
          onFechar={() => setModalAberto(false)}
        />
      )}
    </div>
  )
}
