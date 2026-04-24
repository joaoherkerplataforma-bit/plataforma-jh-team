'use client'

import type { PacienteComCalculos } from '@/types/pacientes'
import { TIPO_PLANO_LABELS, TEMPO_PLANO_LABELS } from '@/types/pacientes'
import {
  formatarData,
  badgeStatusRetorno,
  badgeStatusPlano,
} from '@/lib/pacientes'

interface TimelineProps {
  paciente: PacienteComCalculos
  responsavelNome: string | null
}

function diasEntre(dataInicioISO: string, dataFimISO: string): number {
  const inicio = new Date(dataInicioISO + 'T00:00:00')
  const fim = new Date(dataFimISO + 'T00:00:00')
  return Math.round((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
}

export function Timeline({ paciente, responsavelNome }: TimelineProps) {
  const diasTotais = diasEntre(
    paciente.data_inicio,
    paciente.data_vencimento_plano,
  )
  const hojeISO = new Date().toISOString().slice(0, 10)
  const diasDecorridos = diasEntre(paciente.data_inicio, hojeISO)
  const percentualPlano =
    diasTotais > 0
      ? Math.max(0, Math.min(100, Math.round((diasDecorridos / diasTotais) * 100)))
      : 0

  const diasAtivosLabel =
    paciente.dias_ativos >= 0
      ? `${paciente.dias_ativos} dias`
      : `Vencido há ${Math.abs(paciente.dias_ativos)}d`

  const diasRestantesClasse =
    paciente.dias_ativos >= 0 ? 'text-[#C9A84C]' : 'text-red-400'

  const statusRetorno = badgeStatusRetorno(paciente.dias_para_retorno)
  const statusPlano = badgeStatusPlano(paciente.dias_ativos)

  const exibeStatusPlanoSaida =
    paciente.status !== 'cancelado' && paciente.status !== 'pausado'

  return (
    <div className="relative flex flex-col md:flex-row md:items-stretch gap-6 md:gap-0">
      {/* Bloco 1 — Entrada */}
      <div className="flex-1 bg-[#111111] border border-[#2A2209] rounded-xl p-5 space-y-4 md:rounded-r-none">
        <h3 className="text-xs uppercase tracking-wider text-[#C9A84C] font-medium">
          Entrada
        </h3>
        <div>
          <p className="text-[#8A7A5A] text-xs uppercase tracking-wider mb-1">
            Início
          </p>
          <p className="text-[#F5F0E8] text-sm">
            {formatarData(paciente.data_inicio)}
          </p>
        </div>
        <div>
          <p className="text-[#8A7A5A] text-xs uppercase tracking-wider mb-1">
            Plano
          </p>
          <p className="text-[#F5F0E8] text-sm">
            {TIPO_PLANO_LABELS[paciente.tipo_plano]}
            {' · '}
            {TEMPO_PLANO_LABELS[paciente.duracao_plano]}
          </p>
        </div>
        <div>
          <p className="text-[#8A7A5A] text-xs uppercase tracking-wider mb-1">
            Responsável
          </p>
          <p className="text-[#F5F0E8] text-sm">{responsavelNome ?? '—'}</p>
        </div>
      </div>

      {/* Conector dourado em desktop */}
      <div
        aria-hidden="true"
        className="hidden md:flex items-center justify-center w-6 bg-[#111111] border-y border-[#2A2209]"
      >
        <div className="h-0.5 w-full bg-[#C9A84C]" />
      </div>

      {/* Bloco 2 — Progresso */}
      <div className="flex-1 bg-[#111111] border border-[#2A2209] rounded-xl p-5 space-y-4 md:rounded-none">
        <h3 className="text-xs uppercase tracking-wider text-[#C9A84C] font-medium">
          Progresso
        </h3>
        <div>
          <p className="text-[#8A7A5A] text-xs uppercase tracking-wider mb-1">
            Dias ativos
          </p>
          <p className="text-[#F5F0E8] text-sm">
            {paciente.dias_ativos >= 0
              ? `${paciente.dias_ativos} dias`
              : `Vencido há ${Math.abs(paciente.dias_ativos)} dias`}
          </p>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[#8A7A5A] text-xs uppercase tracking-wider">
              % do plano
            </p>
            <span className="text-[#C9A84C] text-xs font-medium">
              {percentualPlano}%
            </span>
          </div>
          <div className="w-full h-2 bg-[#2A2209] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#C9A84C] rounded-full transition-all"
              style={{ width: `${percentualPlano}%` }}
            />
          </div>
        </div>
        <div>
          <p className="text-[#8A7A5A] text-xs uppercase tracking-wider mb-1">
            Próximo retorno
          </p>
          <p className="text-[#F5F0E8] text-sm">
            {formatarData(paciente.proximo_retorno)}
          </p>
        </div>
        <div>
          <p className="text-[#8A7A5A] text-xs uppercase tracking-wider mb-1">
            Status retorno
          </p>
          <span
            className={`inline-block px-2 py-0.5 rounded text-xs ${statusRetorno.classe}`}
          >
            {statusRetorno.texto}
          </span>
        </div>
      </div>

      {/* Conector dourado em desktop */}
      <div
        aria-hidden="true"
        className="hidden md:flex items-center justify-center w-6 bg-[#111111] border-y border-[#2A2209]"
      >
        <div className="h-0.5 w-full bg-[#C9A84C]" />
      </div>

      {/* Bloco 3 — Saída */}
      <div className="flex-1 bg-[#111111] border border-[#2A2209] rounded-xl p-5 space-y-4 md:rounded-l-none">
        <h3 className="text-xs uppercase tracking-wider text-[#C9A84C] font-medium">
          Saída
        </h3>
        <div>
          <p className="text-[#8A7A5A] text-xs uppercase tracking-wider mb-1">
            Vencimento
          </p>
          <p className="text-[#F5F0E8] text-sm">
            {formatarData(paciente.data_vencimento_plano)}
          </p>
        </div>
        <div>
          <p className="text-[#8A7A5A] text-xs uppercase tracking-wider mb-1">
            Dias restantes
          </p>
          <p className={`text-sm font-medium ${diasRestantesClasse}`}>
            {diasAtivosLabel}
          </p>
        </div>
        {exibeStatusPlanoSaida && (
          <div>
            <p className="text-[#8A7A5A] text-xs uppercase tracking-wider mb-1">
              Status
            </p>
            <span
              className={`inline-block px-2 py-0.5 rounded text-xs ${statusPlano.classe}`}
            >
              {statusPlano.texto}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
