'use client'

import { useState } from 'react'
import type { PacienteComCalculos, TabAtiva } from '@/types/pacientes'
import { TIPO_PLANO_LABELS, TEMPO_PLANO_LABELS } from '@/types/pacientes'
import type { ResumoCards } from '@/types/pacientes'
import {
  formatarData,
  corDaLinhaRetorno,
  badgeStatusRetorno,
  badgeStatusPlano,
  corNomePaciente,
} from '@/lib/pacientes'
import { ObservacoesInline } from '@/app/dashboard/observacoes-inline'
import { AdicionarPacienteModal } from '@/app/dashboard/adicionar-paciente-modal'

interface PacientesTableProps {
  ativos: PacienteComCalculos[]
  vencidos: PacienteComCalculos[]
  resumo: ResumoCards
}

export function PacientesTable({ ativos, vencidos, resumo }: PacientesTableProps) {
  const [tabAtiva, setTabAtiva] = useState<TabAtiva>('ativos')
  const [modalAberto, setModalAberto] = useState(false)

  const pacientesVisiveis = tabAtiva === 'ativos' ? ativos : vencidos

  return (
    <>
      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#242424] border border-white/10 rounded-xl px-5 py-4">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Total Ativos</p>
          <p className="text-3xl font-bold text-white">{resumo.total_ativos}</p>
        </div>
        <div className="bg-[#242424] border border-white/10 rounded-xl px-5 py-4">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Vencidos</p>
          <p className="text-3xl font-bold text-red-400">{resumo.total_vencidos}</p>
        </div>
        <div className="bg-[#242424] border border-white/10 rounded-xl px-5 py-4">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Vencendo em breve</p>
          <p className="text-3xl font-bold text-yellow-400">{resumo.vencendo_em_breve}</p>
        </div>
      </div>

      {/* Tabs + Botao Adicionar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-[#1A1A1A] rounded-lg p-1">
          <button
            type="button"
            onClick={() => setTabAtiva('ativos')}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              tabAtiva === 'ativos'
                ? 'bg-[#242424] text-gold font-medium'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            Ativos ({ativos.length})
          </button>
          <button
            type="button"
            onClick={() => setTabAtiva('vencidos')}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              tabAtiva === 'vencidos'
                ? 'bg-[#242424] text-gold font-medium'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            Vencidos ({vencidos.length})
          </button>
        </div>

        <button
          type="button"
          onClick={() => setModalAberto(true)}
          className="px-4 py-2 text-sm bg-gold hover:bg-gold-light text-black font-medium rounded-lg transition-colors"
        >
          + Adicionar Paciente
        </button>
      </div>

      {/* Tabela */}
      <div className="bg-[#242424] border border-white/10 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-4 py-3 text-white/40 font-medium text-xs uppercase tracking-wider">Nome</th>
              <th className="text-left px-4 py-3 text-white/40 font-medium text-xs uppercase tracking-wider">Data Inicio</th>
              <th className="text-left px-4 py-3 text-white/40 font-medium text-xs uppercase tracking-wider">Prox. Retorno</th>
              {tabAtiva === 'ativos' && (
                <>
                  <th className="text-center px-4 py-3 text-white/40 font-medium text-xs uppercase tracking-wider">Dias p/ Retorno</th>
                  <th className="text-center px-4 py-3 text-white/40 font-medium text-xs uppercase tracking-wider">Status Retorno</th>
                </>
              )}
              <th className="text-left px-4 py-3 text-white/40 font-medium text-xs uppercase tracking-wider">Tipo</th>
              <th className="text-left px-4 py-3 text-white/40 font-medium text-xs uppercase tracking-wider">Tempo</th>
              <th className="text-left px-4 py-3 text-white/40 font-medium text-xs uppercase tracking-wider">Vencimento</th>
              <th className="text-center px-4 py-3 text-white/40 font-medium text-xs uppercase tracking-wider">Dias Ativos</th>
              <th className="text-center px-4 py-3 text-white/40 font-medium text-xs uppercase tracking-wider">Status Plano</th>
              <th className="text-left px-4 py-3 text-white/40 font-medium text-xs uppercase tracking-wider">Obs.</th>
            </tr>
          </thead>
          <tbody>
            {pacientesVisiveis.length === 0 ? (
              <tr>
                <td
                  colSpan={tabAtiva === 'ativos' ? 11 : 9}
                  className="text-center py-12 text-white/30"
                >
                  {tabAtiva === 'ativos'
                    ? 'Nenhum paciente ativo.'
                    : 'Nenhum paciente com plano vencido.'}
                </td>
              </tr>
            ) : (
              pacientesVisiveis.map((p, idx) => {
                const linhaClasse = tabAtiva === 'ativos'
                  ? corDaLinhaRetorno(p.dias_para_retorno)
                  : ''
                const bgAlt = idx % 2 === 1 ? 'bg-[#1E1E1E]' : ''
                const statusRetorno = badgeStatusRetorno(p.dias_para_retorno)
                const statusPlano = badgeStatusPlano(p.dias_ativos)
                const nomeClasse = corNomePaciente(p.dias_ativos)

                return (
                  <tr
                    key={p.id}
                    className={`border-b border-white/5 hover:bg-white/5 transition-colors ${bgAlt} ${linhaClasse}`}
                  >
                    <td className={`px-4 py-3 whitespace-nowrap ${nomeClasse}`}>
                      {p.nome}
                    </td>
                    <td className="px-4 py-3 text-white/60 whitespace-nowrap">
                      {formatarData(p.data_inicio)}
                    </td>
                    <td className="px-4 py-3 text-white/60 whitespace-nowrap">
                      {formatarData(p.proximo_retorno)}
                    </td>
                    {tabAtiva === 'ativos' && (
                      <>
                        <td className="px-4 py-3 text-center text-white/60 whitespace-nowrap">
                          {p.dias_para_retorno !== null ? p.dias_para_retorno : '-'}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs ${statusRetorno.classe}`}>
                            {statusRetorno.texto}
                          </span>
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3 text-white/60 whitespace-nowrap">
                      {TIPO_PLANO_LABELS[p.tipo_plano]}
                    </td>
                    <td className="px-4 py-3 text-white/60 whitespace-nowrap">
                      {TEMPO_PLANO_LABELS[p.tempo_plano]}
                    </td>
                    <td className="px-4 py-3 text-white/60 whitespace-nowrap">
                      {formatarData(p.data_vencimento_plano)}
                    </td>
                    <td className="px-4 py-3 text-center text-white/60 whitespace-nowrap">
                      {p.dias_ativos}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs ${statusPlano.classe}`}>
                        {statusPlano.texto}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ObservacoesInline
                        pacienteId={p.id}
                        valor={p.observacoes}
                      />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <AdicionarPacienteModal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
      />
    </>
  )
}
