'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw, X } from 'lucide-react'
import { renovarPaciente } from '@/app/(protected)/pacientes/actions'

interface RenovarModalProps {
  pacienteId: string
  pacienteNome: string
  onClose: () => void
}

type TipoPlano = 'dieta' | 'completo'
type DuracaoPlano = 'trimestral' | 'semestral' | 'anual'

export function RenovarModal({ pacienteId, pacienteNome, onClose }: RenovarModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [tipoPlano, setTipoPlano] = useState<TipoPlano>('dieta')
  const [duracaoPlano, setDuracaoPlano] = useState<DuracaoPlano>('trimestral')
  const [erro, setErro] = useState<string | null>(null)

  function handleConfirmar() {
    setErro(null)
    startTransition(async () => {
      try {
        await renovarPaciente(pacienteId, tipoPlano, duracaoPlano)
        router.refresh()
        onClose()
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao renovar')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-xl border border-white/10 bg-[#1A1A1A] p-6 shadow-2xl mx-4">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#F5F0E8]">Renovar Plano</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mb-5 text-sm text-white/60">
          Renovando plano de{' '}
          <span className="font-medium text-[#C9A84C]">{pacienteNome}</span>.
          A data de início será <span className="font-medium text-white/80">hoje</span> e uma nova
          tarefa de protocolo será criada automaticamente.
        </p>

        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">
            Tipo do Plano
          </label>
          <div className="flex gap-3">
            {(['dieta', 'completo'] as TipoPlano[]).map((tipo) => (
              <button
                key={tipo}
                type="button"
                onClick={() => setTipoPlano(tipo)}
                className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                  tipoPlano === tipo
                    ? 'border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]'
                    : 'border-white/10 text-white/50 hover:border-white/20 hover:text-white/70'
                }`}
              >
                {tipo === 'dieta' ? 'Dieta' : 'Completo'}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">
            Duração
          </label>
          <div className="flex gap-3">
            {(['trimestral', 'semestral', 'anual'] as DuracaoPlano[]).map((dur) => (
              <button
                key={dur}
                type="button"
                onClick={() => setDuracaoPlano(dur)}
                className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium capitalize transition ${
                  duracaoPlano === dur
                    ? 'border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]'
                    : 'border-white/10 text-white/50 hover:border-white/20 hover:text-white/70'
                }`}
              >
                {dur}
              </button>
            ))}
          </div>
        </div>

        {erro && (
          <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{erro}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isPending}
            type="button"
            className="flex-1 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-white/60 transition hover:bg-white/5 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={isPending}
            type="button"
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#C9A84C] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#E8C97A] disabled:opacity-50"
          >
            <RotateCcw size={15} className={isPending ? 'animate-spin' : ''} />
            {isPending ? 'Renovando...' : 'Confirmar Renovação'}
          </button>
        </div>
      </div>
    </div>
  )
}
