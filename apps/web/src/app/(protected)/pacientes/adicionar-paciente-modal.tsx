'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface AdicionarPacienteModalProps {
  aberto: boolean
  onFechar: () => void
}

export function AdicionarPacienteModal({ aberto, onFechar }: AdicionarPacienteModalProps) {
  const router = useRouter()
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setSalvando(true)
      setErro(null)

      const form = new FormData(e.currentTarget)
      const nome = (form.get('nome') as string).trim()
      const telefone = (form.get('telefone') as string).trim() || null
      const email = (form.get('email') as string).trim() || null
      const tipoplano = form.get('tipo_plano') as 'dieta' | 'completo'
      const tempoplano = form.get('tempo_plano') as 'trimestral' | 'semestral' | 'anual'
      const dataInicio = form.get('data_inicio') as string
      const proximoRetorno = (form.get('proximo_retorno') as string) || null

      if (!nome || !dataInicio) {
        setErro('Nome e data de inicio sao obrigatorios.')
        setSalvando(false)
        return
      }

      const inicio = new Date(dataInicio + 'T00:00:00')
      let mesesAdicionais = 3
      if (tempoplano === 'semestral') mesesAdicionais = 6
      if (tempoplano === 'anual') mesesAdicionais = 12
      const vencimento = new Date(inicio)
      vencimento.setMonth(vencimento.getMonth() + mesesAdicionais)
      const dataVencimento = vencimento.toISOString().split('T')[0]

      try {
        const supabase = createClient()
        const { error } = await supabase.from('pacientes').insert({
          nome,
          telefone,
          email,
          tipo_plano: tipoplano,
          duracao_plano: tempoplano,
          data_inicio: dataInicio,
          data_vencimento_plano: dataVencimento,
          proximo_retorno: proximoRetorno,
          // status omitido — banco usa default 'ativo'
        })

        if (error) {
          setErro(`Erro ao salvar: ${error.message}`)
          setSalvando(false)
          return
        }

        onFechar()
        router.refresh()
      } catch (error) {
        setErro(
          `Falha ao adicionar paciente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        )
      } finally {
        setSalvando(false)
      }
    },
    [onFechar, router]
  )

  if (!aberto) return null

  const inputClass =
    'w-full bg-[#0A0A0A] border border-[#2A2209] rounded-lg px-3 py-2 text-[#F5F0E8] text-sm focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C] transition-colors placeholder-[#F5F0E8]/50'
  const labelClass = 'block text-sm text-[#F5F0E8] mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111111] border border-[#2A2209] rounded-xl w-full max-w-lg mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2209]">
          <h2 className="text-lg font-semibold text-[#F5F0E8] tracking-wide">
            Adicionar Paciente
          </h2>
          <button
            type="button"
            onClick={onFechar}
            className="text-[#F5F0E8] hover:text-[#F5F0E8] transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Nome */}
          <div>
            <label htmlFor="nome" className={labelClass}>
              Nome completo *
            </label>
            <input id="nome" name="nome" type="text" required className={inputClass} />
          </div>

          {/* Telefone + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="telefone" className={labelClass}>Telefone</label>
              <input id="telefone" name="telefone" type="text" className={inputClass} />
            </div>
            <div>
              <label htmlFor="email" className={labelClass}>Email</label>
              <input id="email" name="email" type="email" className={inputClass} />
            </div>
          </div>

          {/* Tipo + Tempo do plano */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="tipo_plano" className={labelClass}>Tipo de plano</label>
              <select id="tipo_plano" name="tipo_plano" defaultValue="completo" className={inputClass}>
                <option value="dieta">Dieta</option>
                <option value="completo">Completo</option>
              </select>
            </div>
            <div>
              <label htmlFor="tempo_plano" className={labelClass}>Tempo do plano</label>
              <select id="tempo_plano" name="tempo_plano" defaultValue="trimestral" className={inputClass}>
                <option value="trimestral">Trimestral</option>
                <option value="semestral">Semestral</option>
                <option value="anual">Anual</option>
              </select>
            </div>
          </div>

          {/* Data inicio + Proximo retorno */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="data_inicio" className={labelClass}>Data de inicio *</label>
              <input id="data_inicio" name="data_inicio" type="date" required className={inputClass} />
            </div>
            <div>
              <label htmlFor="proximo_retorno" className={labelClass}>Proximo retorno</label>
              <input id="proximo_retorno" name="proximo_retorno" type="date" className={inputClass} />
            </div>
          </div>

          {/* Erro */}
          {erro && (
            <p className="text-red-400 text-sm">{erro}</p>
          )}

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
              {salvando ? 'Salvando...' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
