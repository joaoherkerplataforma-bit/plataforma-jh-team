'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import type { Paciente } from '@/types/pacientes'
import { TIPO_PLANO_LABELS } from '@/types/pacientes'
import { formatarData } from '@/lib/pacientes'

interface PacientesListaProps {
  pacientes: Paciente[]
}

export function PacientesLista({ pacientes }: PacientesListaProps) {
  const [query, setQuery] = useState('')

  const pacientesFiltrados = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return pacientes

    return pacientes.filter((paciente) => {
      const nome = paciente.nome.toLowerCase()
      const email = paciente.email?.toLowerCase() ?? ''
      const telefone = paciente.telefone?.toLowerCase() ?? ''
      return nome.includes(q) || email.includes(q) || telefone.includes(q)
    })
  }, [pacientes, query])

  return (
    <>
      {/* Barra de busca */}
      <div className="mb-6">
        <div className="relative max-w-xl">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A7A5A]"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, e-mail ou telefone..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#111111] border border-[#2A2209] rounded-lg text-[#F5F0E8] text-sm placeholder-[#8A7A5A]/60 focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C] transition-colors"
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-[#111111] border border-[#2A2209] rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#0D0D0D] border-b border-[#2A2209]">
              <th className="text-left px-4 py-3 text-[#8A7A5A] font-medium text-xs uppercase tracking-wider">
                Nome
              </th>
              <th className="text-left px-4 py-3 text-[#8A7A5A] font-medium text-xs uppercase tracking-wider">
                E-mail
              </th>
              <th className="text-left px-4 py-3 text-[#8A7A5A] font-medium text-xs uppercase tracking-wider">
                Telefone
              </th>
              <th className="text-left px-4 py-3 text-[#8A7A5A] font-medium text-xs uppercase tracking-wider">
                Tipo de Plano
              </th>
              <th className="text-left px-4 py-3 text-[#8A7A5A] font-medium text-xs uppercase tracking-wider">
                Vencimento
              </th>
            </tr>
          </thead>
          <tbody>
            {pacientesFiltrados.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-center py-12 text-[#8A7A5A]/60"
                >
                  {pacientes.length === 0
                    ? 'Nenhum paciente cadastrado.'
                    : 'Nenhum paciente encontrado.'}
                </td>
              </tr>
            ) : (
              pacientesFiltrados.map((p, idx) => {
                const bgAlt = idx % 2 === 1 ? 'bg-[#0D0D0D]' : ''
                return (
                  <tr
                    key={p.id}
                    className={`border-b border-[#1A1A1A] hover:bg-[#1A1500]/30 transition-colors ${bgAlt}`}
                  >
                    <td className="px-4 py-3 text-[#F5F0E8] whitespace-nowrap">
                      {p.nome}
                    </td>
                    <td className="px-4 py-3 text-[#8A7A5A] whitespace-nowrap">
                      {p.email || '-'}
                    </td>
                    <td className="px-4 py-3 text-[#8A7A5A] whitespace-nowrap">
                      {p.telefone || '-'}
                    </td>
                    <td className="px-4 py-3 text-[#8A7A5A] whitespace-nowrap">
                      {TIPO_PLANO_LABELS[p.tipo_plano]}
                    </td>
                    <td className="px-4 py-3 text-[#8A7A5A] whitespace-nowrap">
                      {formatarData(p.data_vencimento_plano)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
