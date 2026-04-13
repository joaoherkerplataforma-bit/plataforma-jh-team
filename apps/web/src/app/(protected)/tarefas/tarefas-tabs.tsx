'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'
import type { Tarefa, ModuloTarefa, StatusTarefa } from '@/types/tarefas'
import {
  STATUS_LABELS,
  STATUS_BADGE_CLASS,
  TIPO_PLANO_LABELS,
} from '@/types/tarefas'
import type { PerfilAcesso } from '@/types/auth'

interface TarefasTabsProps {
  tarefasB: Tarefa[]
  tarefasC: Tarefa[]
  tarefasD: Tarefa[]
  perfil: PerfilAcesso
}

type TabAtiva = 'B' | 'C' | 'D' | 'E'

// Which status transition a perfil can trigger on a given modulo + current status
function proximoStatus(
  modulo: ModuloTarefa,
  status: StatusTarefa,
  perfil: PerfilAcesso
): StatusTarefa | null {
  if (status === 'bloqueada' || status === 'entregue') return null

  if (modulo === 'B') {
    if (status === 'pendente' && (perfil === 'pablo' || perfil === 'joao_estagiario')) return 'feito'
    if (status === 'feito' && perfil === 'joao_admin') return 'entregue'
  }
  if (modulo === 'C') {
    if (status === 'pendente' && perfil === 'pablo') return 'feito'
    if (status === 'feito' && perfil === 'joao_admin') return 'gravado'
    if (status === 'gravado' && perfil === 'joao_admin') return 'entregue'
  }
  if (modulo === 'D') {
    if (status === 'pendente' && perfil === 'pablo') return 'feito'
    if (status === 'feito' && perfil === 'joao_admin') return 'entregue'
  }
  return null
}

function labelProximoStatus(next: StatusTarefa): string {
  const labels: Record<StatusTarefa, string> = {
    feito: 'Marcar Feito',
    gravado: 'Marcar Gravado',
    entregue: 'Marcar Entregue',
    pendente: 'Reabrir',
    bloqueada: 'Bloquear',
  }
  return labels[next]
}

function formatarData(data: string | null): string {
  if (!data) return '-'
  const [ano, mes, dia] = data.split('-')
  return `${dia}/${mes}/${ano}`
}

function diasAtraso(dataPrazo: string): number {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const prazo = new Date(dataPrazo + 'T00:00:00')
  return Math.floor((hoje.getTime() - prazo.getTime()) / (1000 * 60 * 60 * 24))
}

function linhaAtrasada(tarefa: Tarefa): boolean {
  if (tarefa.status === 'entregue') return false
  if (tarefa.status === 'bloqueada') return false
  return diasAtraso(tarefa.data_prazo) > 0
}

const thClass =
  'text-left px-4 py-3 text-[#8A7A5A] font-medium text-xs uppercase tracking-wider'
const tdClass = 'px-4 py-3 text-sm text-[#8A7A5A] whitespace-nowrap'

interface StatusButtonProps {
  tarefa: Tarefa
  perfil: PerfilAcesso
  onUpdate: (id: string, status: StatusTarefa) => void
  atualizando: string | null
}

function StatusButton({ tarefa, perfil, onUpdate, atualizando }: StatusButtonProps) {
  const next = proximoStatus(tarefa.modulo, tarefa.status, perfil)
  const carregando = atualizando === tarefa.id

  if (tarefa.status === 'bloqueada') {
    return (
      <div className="flex items-center gap-1.5 text-[#555] text-xs">
        <Lock size={13} />
        <span className="hidden sm:inline">Aguardando gravação</span>
      </div>
    )
  }

  if (!next) return null

  return (
    <button
      type="button"
      disabled={carregando}
      onClick={() => onUpdate(tarefa.id, next)}
      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#C9A84C] hover:bg-[#E2BC6A] text-[#0A0A0A] transition-colors disabled:opacity-50 whitespace-nowrap"
    >
      {carregando ? '...' : labelProximoStatus(next)}
    </button>
  )
}

interface TabelaProps {
  tarefas: Tarefa[]
  perfil: PerfilAcesso
  modulo: ModuloTarefa
  onUpdate: (id: string, status: StatusTarefa) => void
  atualizando: string | null
  emptyMsg: string
}

function TabelaModulo({ tarefas, perfil, modulo, onUpdate, atualizando, emptyMsg }: TabelaProps) {
  const showEmail = modulo === 'B'
  const showResponsavel = modulo === 'B'
  const showTipo = modulo === 'B'

  return (
    <div className="bg-[#111111] border border-[#2A2209] rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#0D0D0D] border-b border-[#2A2209]">
            <th className={thClass}>Nome</th>
            {showEmail && <th className={thClass}>Email</th>}
            {showResponsavel && <th className={thClass}>Responsável</th>}
            {showTipo && <th className={thClass}>Plano</th>}
            <th className={thClass}>Criação</th>
            <th className={thClass}>Prazo</th>
            <th className={thClass}>Obs. João</th>
            <th className="text-center px-4 py-3 text-[#8A7A5A] font-medium text-xs uppercase tracking-wider">Status</th>
            <th className="text-center px-4 py-3 text-[#8A7A5A] font-medium text-xs uppercase tracking-wider">Ação</th>
          </tr>
        </thead>
        <tbody>
          {tarefas.length === 0 ? (
            <tr>
              <td
                colSpan={showEmail ? 9 : 7}
                className="text-center py-12 text-[#8A7A5A]/60"
              >
                {emptyMsg}
              </td>
            </tr>
          ) : (
            tarefas.map((t, idx) => {
              const atrasada = linhaAtrasada(t)
              const bgAlt = idx % 2 === 1 ? 'bg-[#0D0D0D]' : ''
              const bgAtrasada = atrasada ? 'border-l-2 border-l-orange-500/60' : ''

              return (
                <tr
                  key={t.id}
                  className={`border-b border-[#1A1A1A] hover:bg-[#1A1500]/30 transition-colors ${bgAlt} ${bgAtrasada}`}
                >
                  <td className={`px-4 py-3 font-medium whitespace-nowrap ${t.status === 'bloqueada' ? 'text-[#555]' : 'text-[#F5F0E8]'}`}>
                    {t.paciente?.nome ?? '-'}
                    {atrasada && (
                      <span className="ml-2 text-orange-400 text-xs font-normal">
                        +{diasAtraso(t.data_prazo)}d atrasado
                      </span>
                    )}
                  </td>
                  {showEmail && (
                    <td className={tdClass}>{t.paciente?.email ?? '-'}</td>
                  )}
                  {showResponsavel && (
                    <td className={tdClass}>
                      {t.responsavel?.nome.split(' ')[0] ?? '-'}
                    </td>
                  )}
                  {showTipo && (
                    <td className={tdClass}>
                      {t.paciente ? TIPO_PLANO_LABELS[t.paciente.tipo_plano] : '-'}
                    </td>
                  )}
                  <td className={tdClass}>{formatarData(t.data_criacao)}</td>
                  <td className={`px-4 py-3 text-sm whitespace-nowrap ${atrasada ? 'text-orange-400' : 'text-[#8A7A5A]'}`}>
                    {formatarData(t.data_prazo)}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#8A7A5A] max-w-[200px]">
                    <span
                      className="block truncate"
                      title={t.observacoes_joao ?? undefined}
                    >
                      {t.observacoes_joao || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs ${STATUS_BADGE_CLASS[t.status]}`}
                    >
                      {STATUS_LABELS[t.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <StatusButton
                      tarefa={t}
                      perfil={perfil}
                      onUpdate={onUpdate}
                      atualizando={atualizando}
                    />
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

export function TarefasTabs({ tarefasB, tarefasC, tarefasD, perfil }: TarefasTabsProps) {
  const router = useRouter()
  const [tabAtiva, setTabAtiva] = useState<TabAtiva>('B')
  const [atualizando, setAtualizando] = useState<string | null>(null)

  const isAdmin = perfil === 'joao_admin'
  const isPablo = perfil === 'pablo'

  const tabs: { id: TabAtiva; label: string; count?: number }[] = [
    { id: 'B', label: 'Módulo B', count: tarefasB.length },
    ...(isPablo || isAdmin ? [{ id: 'C' as TabAtiva, label: 'Módulo C', count: tarefasC.length }] : []),
    ...(isPablo || isAdmin ? [{ id: 'D' as TabAtiva, label: 'Módulo D', count: tarefasD.length }] : []),
    ...(isAdmin ? [{ id: 'E' as TabAtiva, label: 'Módulo E' }] : []),
  ]

  const handleUpdate = useCallback(
    async (id: string, status: StatusTarefa) => {
      setAtualizando(id)
      try {
        const res = await fetch(`/api/tarefas/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        })
        if (!res.ok) {
          const data = await res.json()
          console.error('Erro ao atualizar status:', data.error)
        } else {
          router.refresh()
        }
      } catch (err) {
        console.error('Falha ao atualizar status:', err)
      } finally {
        setAtualizando(null)
      }
    },
    [router]
  )

  return (
    <>
      {/* Tabs */}
      <div className="flex items-center gap-1 bg-[#0A0A0A] border border-[#2A2209] rounded-lg p-1 mb-4 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTabAtiva(tab.id)}
            className={`px-4 py-2 text-sm rounded-md transition-colors whitespace-nowrap ${
              tabAtiva === tab.id
                ? 'bg-[#111111] text-[#C9A84C] font-medium'
                : 'text-[#8A7A5A] hover:text-[#F5F0E8]'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1.5 text-xs opacity-70">({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {tabAtiva === 'B' && (
        <TabelaModulo
          tarefas={tarefasB}
          perfil={perfil}
          modulo="B"
          onUpdate={handleUpdate}
          atualizando={atualizando}
          emptyMsg="Nenhuma tarefa de protocolo novo."
        />
      )}

      {tabAtiva === 'C' && (isPablo || isAdmin) && (
        <TabelaModulo
          tarefas={tarefasC}
          perfil={perfil}
          modulo="C"
          onUpdate={handleUpdate}
          atualizando={atualizando}
          emptyMsg="Nenhuma tarefa de fotos antes/depois."
        />
      )}

      {tabAtiva === 'D' && (isPablo || isAdmin) && (
        <TabelaModulo
          tarefas={tarefasD}
          perfil={perfil}
          modulo="D"
          onUpdate={handleUpdate}
          atualizando={atualizando}
          emptyMsg="Nenhuma tarefa de retorno dietético."
        />
      )}

      {tabAtiva === 'E' && isAdmin && (
        <div className="bg-[#111111] border border-[#2A2209] rounded-xl px-6 py-16 text-center">
          <p className="text-[#8A7A5A] text-sm">Módulo E — Em breve</p>
        </div>
      )}
    </>
  )
}
