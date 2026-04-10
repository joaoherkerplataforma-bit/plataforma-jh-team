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

      // Calcular data de vencimento com base no tempo do plano
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
          tempo_plano: tempoplano,
          data_inicio: dataInicio,
          data_vencimento_plano: dataVencimento,
          proximo_retorno: proximoRetorno,
          ativo: true,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#242424] border border-white/10 rounded-xl w-full max-w-lg mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-gold tracking-wide">
            Adicionar Paciente
          </h2>
          <button
            type="button"
            onClick={onFechar}
            className="text-white/40 hover:text-white transition-colors text-xl leading-none"
          >
            x
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Nome */}
          <div>
            <label htmlFor="nome" className="block text-sm text-white/60 mb-1">
              Nome completo *
            </label>
            <input
              id="nome"
              name="nome"
              type="text"
              required
              className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold transition-colors"
            />
          </div>

          {/* Telefone + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="telefone" className="block text-sm text-white/60 mb-1">
                Telefone
              </label>
              <input
                id="telefone"
                name="telefone"
                type="text"
                className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold transition-colors"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm text-white/60 mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold transition-colors"
              />
            </div>
          </div>

          {/* Tipo + Tempo do plano */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="tipo_plano" className="block text-sm text-white/60 mb-1">
                Tipo de plano
              </label>
              <select
                id="tipo_plano"
                name="tipo_plano"
                defaultValue="completo"
                className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold transition-colors"
              >
                <option value="dieta">Dieta</option>
                <option value="completo">Completo</option>
              </select>
            </div>
            <div>
              <label htmlFor="tempo_plano" className="block text-sm text-white/60 mb-1">
                Tempo do plano
              </label>
              <select
                id="tempo_plano"
                name="tempo_plano"
                defaultValue="trimestral"
                className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold transition-colors"
              >
                <option value="trimestral">Trimestral</option>
                <option value="semestral">Semestral</option>
                <option value="anual">Anual</option>
              </select>
            </div>
          </div>

          {/* Data inicio + Proximo retorno */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="data_inicio" className="block text-sm text-white/60 mb-1">
                Data de inicio *
              </label>
              <input
                id="data_inicio"
                name="data_inicio"
                type="date"
                required
                className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold transition-colors"
              />
            </div>
            <div>
              <label htmlFor="proximo_retorno" className="block text-sm text-white/60 mb-1">
                Proximo retorno
              </label>
              <input
                id="proximo_retorno"
                name="proximo_retorno"
                type="date"
                className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold transition-colors"
              />
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
              className="px-4 py-2 text-sm text-white/60 hover:text-white border border-white/10 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="px-4 py-2 text-sm bg-gold hover:bg-gold-light text-black font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {salvando ? 'Salvando...' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
