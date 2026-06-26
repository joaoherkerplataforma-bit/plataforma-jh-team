'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, X } from 'lucide-react'
import { atualizarDatasPaciente } from '@/app/(protected)/pacientes/actions'

interface EditarDatasModalProps {
  paciente: {
    id: string
    nome_completo: string
    data_inicio: string
    data_vencimento_plano: string
    proximo_retorno: string
  }
  onClose: () => void
}

export function EditarDatasModal({ paciente, onClose }: EditarDatasModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [dataInicio, setDataInicio] = useState(paciente.data_inicio)
  const [dataVencimento, setDataVencimento] = useState(paciente.data_vencimento_plano)
  const [proximoRetorno, setProximoRetorno] = useState(paciente.proximo_retorno)
  const [erro, setErro] = useState<string | null>(null)

  function handleSalvar() {
    setErro(null)

    // Validacao client-side: vencimento > inicio (formato YYYY-MM-DD).
    if (dataInicio && dataVencimento && dataVencimento <= dataInicio) {
      setErro('A data de vencimento do plano deve ser posterior a data de início.')
      return
    }

    startTransition(async () => {
      const resultado = await atualizarDatasPaciente(paciente.id, {
        data_inicio: dataInicio || undefined,
        data_vencimento_plano: dataVencimento || undefined,
        proximo_retorno: proximoRetorno || undefined,
      })

      if (!resultado.success) {
        setErro(resultado.error ?? 'Erro ao salvar as datas')
        return
      }

      router.refresh()
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-xl border border-white/10 bg-[#1A1A1A] p-6 shadow-2xl mx-4">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#F5F0E8]">Editar Datas</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mb-5 text-sm text-white/60">
          Editando as datas do plano de{' '}
          <span className="font-medium text-[#C9A84C]">{paciente.nome_completo}</span>.
        </p>

        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">
            Data de Início
          </label>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#111111] px-3 py-2.5 text-sm text-[#F5F0E8] focus:border-[#C9A84C] focus:outline-none"
          />
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">
            Vencimento do Plano
          </label>
          <input
            type="date"
            value={dataVencimento}
            onChange={(e) => setDataVencimento(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#111111] px-3 py-2.5 text-sm text-[#F5F0E8] focus:border-[#C9A84C] focus:outline-none"
          />
        </div>

        <div className="mb-6">
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">
            Próximo Retorno
          </label>
          <input
            type="date"
            value={proximoRetorno}
            onChange={(e) => setProximoRetorno(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#111111] px-3 py-2.5 text-sm text-[#F5F0E8] focus:border-[#C9A84C] focus:outline-none"
          />
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
            onClick={handleSalvar}
            disabled={isPending}
            type="button"
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#C9A84C] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#E8C97A] disabled:opacity-50"
          >
            <CalendarDays size={15} className={isPending ? 'animate-pulse' : ''} />
            {isPending ? 'Salvando...' : 'Salvar Datas'}
          </button>
        </div>
      </div>
    </div>
  )
}
