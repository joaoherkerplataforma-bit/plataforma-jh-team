'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { ArrowLeft } from 'lucide-react'
import type { Paciente, PacienteComCalculos } from '@/types/pacientes'
import { TIPO_PLANO_LABELS, TEMPO_PLANO_LABELS } from '@/types/pacientes'
import type { FormularioRecebido } from '@/types/formularios'
import { calcularCamposPaciente, badgeStatusPlano } from '@/lib/pacientes'
import { Timeline } from '@/app/(protected)/pacientes/[id]/timeline'
import { FormulariosSection } from '@/app/(protected)/pacientes/[id]/formularios-section'
import { AnaliseIaPlaceholder } from '@/app/(protected)/pacientes/[id]/analise-ia-placeholder'

interface PacientePerfilProps {
  paciente: Paciente
  perfilAtual: string
  responsavelNome: string | null
  formularios: FormularioRecebido[]
}

function badgeStatusHeader(
  paciente: PacienteComCalculos,
): { texto: string; classe: string } {
  if (paciente.status === 'cancelado') {
    return {
      texto: 'Cancelado',
      classe: 'bg-red-600/20 text-red-400 border border-red-600/30',
    }
  }
  if (paciente.status === 'pausado') {
    return {
      texto: 'Pausado',
      classe: 'bg-white/10 text-white/70 border border-white/20',
    }
  }
  return badgeStatusPlano(paciente.dias_ativos)
}

export function PacientePerfil({
  paciente,
  perfilAtual: _perfilAtual,
  responsavelNome,
  formularios,
}: PacientePerfilProps) {
  const pacienteCalculado = useMemo(
    () => calcularCamposPaciente(paciente),
    [paciente],
  )

  const statusBadge = badgeStatusHeader(pacienteCalculado)

  return (
    <div className="space-y-6">
      <Link
        href="/pacientes"
        className="inline-flex items-center gap-2 text-sm text-[#8A7A5A] hover:text-[#F5F0E8] transition-colors"
      >
        <ArrowLeft size={16} />
        Pacientes
      </Link>

      {/* Header */}
      <div className="bg-[#111111] border border-[#2A2209] rounded-xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-semibold text-[#F5F0E8] tracking-wide">
              {paciente.nome}
            </h1>
            <p className="text-sm text-[#8A7A5A]">
              {TIPO_PLANO_LABELS[paciente.tipo_plano]}
              {' · '}
              {TEMPO_PLANO_LABELS[paciente.duracao_plano]}
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-md px-3 py-1 text-xs font-medium ${statusBadge.classe}`}
          >
            {statusBadge.texto}
          </span>
        </div>
      </div>

      <Timeline paciente={pacienteCalculado} responsavelNome={responsavelNome} />

      <FormulariosSection
        formularios={formularios}
        tipoPlano={paciente.tipo_plano}
      />

      <AnaliseIaPlaceholder />
    </div>
  )
}
