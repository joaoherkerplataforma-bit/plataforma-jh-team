'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, MessageSquare } from 'lucide-react'
import type { Tarefa, ModuloTarefa, StatusTarefa } from '@/types/tarefas'
import {
  STATUS_LABELS,
  STATUS_BADGE_CLASS,
  TIPO_PLANO_LABELS,
} from '@/types/tarefas'
import type { PerfilAcesso } from '@/types/auth'

/* ─────────────────── Props ─────────────────── */

interface TarefasTabsProps {
  tarefasB: Tarefa[]
  tarefasC: Tarefa[]
  tarefasD: Tarefa[]
  perfil: PerfilAcesso
}

type TabId = 'pendencias' | 'fotos' | 'retornos' | 'alteracoes'

/* ─────────────────── Helpers ─────────────────── */

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

/** Returns how many days past the deadline. Negative = days remaining. */
function diasAteOuDesde(dataPrazo: string): number {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const prazo = new Date(dataPrazo + 'T00:00:00')
  return Math.floor((hoje.getTime() - prazo.getTime()) / (1000 * 60 * 60 * 24))
}

/** Color class for data_prazo column based on urgency. */
function corPrazo(tarefa: Tarefa): string {
  if (tarefa.status === 'entregue') return 'text-[#8A7A5A]'
  const diff = diasAteOuDesde(tarefa.data_prazo)
  if (diff > 0) return 'text-red-400'       // vencido
  if (diff >= -1) return 'text-orange-400'   // faltando 1 dia ou no dia
  return 'text-[#8A7A5A]'                   // normal
}

function linhaAtrasada(tarefa: Tarefa): boolean {
  if (tarefa.status === 'entregue' || tarefa.status === 'bloqueada') return false
  return diasAteOuDesde(tarefa.data_prazo) > 0
}

/* ─────────────────── Style constants ─────────────────── */

const thClass =
  'text-left px-4 py-3 text-[#8A7A5A] font-medium text-xs uppercase tracking-wider'
const thCenter =
  'text-center px-4 py-3 text-[#8A7A5A] font-medium text-xs uppercase tracking-wider'
const tdClass = 'px-4 py-3 text-sm text-[#8A7A5A] whitespace-nowrap'

/* ─────────────────── ObservacoesCell ─────────────────── */

interface ObservacoesCellProps {
  tarefaId: string
  valor: string | null
  perfil: PerfilAcesso
}

function ObservacoesCell({ tarefaId, valor, perfil }: ObservacoesCellProps) {
  const [texto, setTexto] = useState(valor ?? '')
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isAdmin = perfil === 'joao_admin'

  const salvar = useCallback(async () => {
    if (texto === (valor ?? '')) {
      setEditando(false)
      return
    }
    setSalvando(true)
    try {
      const res = await fetch(`/api/tarefas/${tarefaId}/observacoes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observacoes_joao: texto || null }),
      })
      if (!res.ok) {
        console.error('Erro ao salvar observacao')
      }
    } catch (error) {
      console.error('Falha ao salvar observacao:', error)
    } finally {
      setSalvando(false)
      setEditando(false)
    }
  }, [tarefaId, texto, valor])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        salvar()
      }
      if (e.key === 'Escape') {
        setTexto(valor ?? '')
        setEditando(false)
      }
    },
    [salvar, valor]
  )

  const temObs = !!(valor && valor.trim())

  // Editable inline for admin
  if (isAdmin && editando) {
    return (
      <textarea
        ref={textareaRef}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={salvar}
        onKeyDown={handleKeyDown}
        disabled={salvando}
        autoFocus
        rows={2}
        className="w-full min-w-[140px] bg-[#1A1500] border border-[#C9A84C]/30 rounded px-2 py-1 text-sm text-[#F5F0E8] focus:outline-none focus:border-[#C9A84C] resize-none disabled:opacity-50"
      />
    )
  }

  if (isAdmin) {
    return (
      <button
        type="button"
        onClick={() => setEditando(true)}
        className={`text-left text-sm cursor-pointer min-w-[80px] max-w-[200px] transition-colors block truncate ${
          temObs
            ? 'px-2 py-1 rounded border border-[#C9A84C]/40 bg-[#1A1500] text-[#C9A84C]'
            : 'text-[#8A7A5A]/60 hover:text-[#8A7A5A]'
        }`}
        title={temObs ? valor! : 'Clique para adicionar observacao'}
      >
        {temObs ? valor! : '-'}
      </button>
    )
  }

  // Non-admin: read-only display
  if (temObs) {
    return (
      <span
        className="block truncate max-w-[200px] px-2 py-1 rounded border border-[#C9A84C]/40 bg-[#1A1500] text-[#C9A84C] text-sm"
        title={valor!}
      >
        <MessageSquare size={12} className="inline mr-1 -mt-0.5" />
        {valor}
      </span>
    )
  }

  return <span className="text-sm text-[#8A7A5A]/40">-</span>
}

/* ─────────────────── StatusButton ─────────────────── */

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
        <span className="hidden sm:inline">Aguardando gravacao</span>
      </div>
    )
  }

  if (tarefa.status === 'entregue') {
    return (
      <span className="text-green-400 text-xs font-medium">
        Feito
      </span>
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

/* ─────────────────── Tabela Pendencias (B) ─────────────────── */

interface TabelaBProps {
  tarefas: Tarefa[]
  perfil: PerfilAcesso
  onUpdate: (id: string, status: StatusTarefa) => void
  atualizando: string | null
}

function TabelaPendencias({ tarefas, perfil, onUpdate, atualizando }: TabelaBProps) {
  return (
    <div className="bg-[#111111] border border-[#2A2209] rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#0D0D0D] border-b border-[#2A2209]">
            <th className={thClass}>Nome</th>
            <th className={thClass}>Email</th>
            <th className={thClass}>Responsavel</th>
            <th className={thClass}>Plano</th>
            <th className={thClass}>Data Envio</th>
            <th className={thClass}>Data Entrega</th>
            <th className={thClass}>Obs. Joao</th>
            <th className={thCenter}>Status</th>
            <th className={thCenter}>Acao</th>
          </tr>
        </thead>
        <tbody>
          {tarefas.length === 0 ? (
            <tr>
              <td colSpan={9} className="text-center py-12 text-[#8A7A5A]/60">
                Nenhuma pendencia de protocolo novo.
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
                  <td className="px-4 py-3 font-medium whitespace-nowrap text-[#F5F0E8]">
                    {t.paciente?.nome ?? '-'}
                  </td>
                  <td className={tdClass}>{t.paciente?.email ?? '-'}</td>
                  <td className={tdClass}>
                    {t.responsavel?.nome.split(' ')[0] ?? '-'}
                  </td>
                  <td className={tdClass}>
                    {t.paciente ? TIPO_PLANO_LABELS[t.paciente.tipo_plano] : '-'}
                  </td>
                  <td className={tdClass}>{formatarData(t.data_criacao)}</td>
                  <td className={`px-4 py-3 text-sm whitespace-nowrap ${corPrazo(t)}`}>
                    {formatarData(t.data_prazo)}
                  </td>
                  <td className="px-4 py-3">
                    <ObservacoesCell tarefaId={t.id} valor={t.observacoes_joao} perfil={perfil} />
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs ${STATUS_BADGE_CLASS[t.status]}`}>
                      {STATUS_LABELS[t.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <StatusButton tarefa={t} perfil={perfil} onUpdate={onUpdate} atualizando={atualizando} />
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

/* ─────────────────── Tabela Fotos 30 Dias (C) ─────────────────── */

interface TabelaCProps {
  tarefas: Tarefa[]
  perfil: PerfilAcesso
  onUpdate: (id: string, status: StatusTarefa) => void
  atualizando: string | null
}

function TabelaFotos({ tarefas, perfil, onUpdate, atualizando }: TabelaCProps) {
  return (
    <div className="bg-[#111111] border border-[#2A2209] rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#0D0D0D] border-b border-[#2A2209]">
            <th className={thClass}>Nome</th>
            <th className={thClass}>Novo/Antigo</th>
            <th className={thClass}>Data Envio</th>
            <th className={thClass}>Data Entrega</th>
            <th className={thClass}>Obs. Joao</th>
            <th className={thCenter}>Status</th>
            <th className={thCenter}>Acao</th>
          </tr>
        </thead>
        <tbody>
          {tarefas.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center py-12 text-[#8A7A5A]/60">
                Nenhuma tarefa de fotos antes/depois.
              </td>
            </tr>
          ) : (
            tarefas.map((t, idx) => {
              const atrasada = linhaAtrasada(t)
              const bgAlt = idx % 2 === 1 ? 'bg-[#0D0D0D]' : ''
              const bgAtrasada = atrasada ? 'border-l-2 border-l-orange-500/60' : ''

              // Display observacoes_joao prefix as-is for novo/antigo info
              const novoAntigo = t.observacoes_joao
                ? t.observacoes_joao.startsWith('NOVO:') || t.observacoes_joao.startsWith('ANTIGO:')
                  ? t.observacoes_joao.split(':')[0]
                  : '-'
                : '-'

              return (
                <tr
                  key={t.id}
                  className={`border-b border-[#1A1A1A] hover:bg-[#1A1500]/30 transition-colors ${bgAlt} ${bgAtrasada}`}
                >
                  <td className="px-4 py-3 font-medium whitespace-nowrap text-[#F5F0E8]">
                    {t.paciente?.nome ?? '-'}
                  </td>
                  <td className={tdClass}>{novoAntigo}</td>
                  <td className={tdClass}>{formatarData(t.data_criacao)}</td>
                  <td className={`px-4 py-3 text-sm whitespace-nowrap ${corPrazo(t)}`}>
                    {formatarData(t.data_prazo)}
                  </td>
                  <td className="px-4 py-3">
                    <ObservacoesCell tarefaId={t.id} valor={t.observacoes_joao} perfil={perfil} />
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs ${STATUS_BADGE_CLASS[t.status]}`}>
                      {STATUS_LABELS[t.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <StatusButton tarefa={t} perfil={perfil} onUpdate={onUpdate} atualizando={atualizando} />
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

/* ─────────────────── Tabela Retornos de Dieta (D) ─────────────────── */

interface TabelaDProps {
  tarefas: Tarefa[]
  perfil: PerfilAcesso
  onUpdate: (id: string, status: StatusTarefa) => void
  atualizando: string | null
}

function TabelaRetornos({ tarefas, perfil, onUpdate, atualizando }: TabelaDProps) {
  const isAdmin = perfil === 'joao_admin'

  // For Pablo: filter out bloqueadas. For admin: show all.
  const tarefasVisiveis = isAdmin
    ? tarefas
    : tarefas.filter((t) => t.status !== 'bloqueada')

  return (
    <div className="bg-[#111111] border border-[#2A2209] rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#0D0D0D] border-b border-[#2A2209]">
            <th className={thClass}>Nome</th>
            <th className={thClass}>Data Envio</th>
            <th className={thClass}>Data Entrega</th>
            <th className={thClass}>Obs. Joao</th>
            <th className={thCenter}>Status</th>
            <th className={thCenter}>Acao</th>
          </tr>
        </thead>
        <tbody>
          {tarefasVisiveis.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center py-12 text-[#8A7A5A]/60">
                Nenhuma tarefa de retorno dietetico.
              </td>
            </tr>
          ) : (
            tarefasVisiveis.map((t, idx) => {
              const atrasada = linhaAtrasada(t)
              const bgAlt = idx % 2 === 1 ? 'bg-[#0D0D0D]' : ''
              const bgAtrasada = atrasada ? 'border-l-2 border-l-orange-500/60' : ''
              const bloqueada = t.status === 'bloqueada'

              return (
                <tr
                  key={t.id}
                  className={`border-b border-[#1A1A1A] hover:bg-[#1A1500]/30 transition-colors ${bgAlt} ${bgAtrasada} ${bloqueada ? 'opacity-60' : ''}`}
                >
                  <td className={`px-4 py-3 font-medium whitespace-nowrap ${bloqueada ? 'text-[#555]' : 'text-[#F5F0E8]'}`}>
                    {bloqueada && <Lock size={13} className="inline mr-1.5 -mt-0.5 text-[#555]" />}
                    {t.paciente?.nome ?? '-'}
                  </td>
                  <td className={tdClass}>{formatarData(t.data_criacao)}</td>
                  <td className={`px-4 py-3 text-sm whitespace-nowrap ${bloqueada ? 'text-[#555]' : corPrazo(t)}`}>
                    {formatarData(t.data_prazo)}
                  </td>
                  <td className="px-4 py-3">
                    <ObservacoesCell tarefaId={t.id} valor={t.observacoes_joao} perfil={perfil} />
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs ${STATUS_BADGE_CLASS[t.status]}`}>
                      {STATUS_LABELS[t.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <StatusButton tarefa={t} perfil={perfil} onUpdate={onUpdate} atualizando={atualizando} />
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

/* ─────────────────── Main Tabs Component ─────────────────── */

export function TarefasTabs({ tarefasB, tarefasC, tarefasD, perfil }: TarefasTabsProps) {
  const router = useRouter()
  const [tabAtiva, setTabAtiva] = useState<TabId>('pendencias')
  const [atualizando, setAtualizando] = useState<string | null>(null)

  const isAdmin = perfil === 'joao_admin'
  const isPablo = perfil === 'pablo'

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'pendencias', label: 'Pendencias', count: tarefasB.length },
    ...(isPablo || isAdmin
      ? [{ id: 'fotos' as TabId, label: 'Fotos 30 Dias', count: tarefasC.length }]
      : []),
    ...(isPablo || isAdmin
      ? [{ id: 'retornos' as TabId, label: 'Retornos de Dieta', count: tarefasD.filter((t) => isPablo ? t.status !== 'bloqueada' : true).length }]
      : []),
    ...(isAdmin ? [{ id: 'alteracoes' as TabId, label: 'Alteracoes' }] : []),
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
      <div className="flex items-center gap-1 bg-[#0A0A0A] border border-[#2A2209] rounded-lg p-1 mb-4 w-fit overflow-x-auto">
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
      {tabAtiva === 'pendencias' && (
        <TabelaPendencias
          tarefas={tarefasB}
          perfil={perfil}
          onUpdate={handleUpdate}
          atualizando={atualizando}
        />
      )}

      {tabAtiva === 'fotos' && (isPablo || isAdmin) && (
        <TabelaFotos
          tarefas={tarefasC}
          perfil={perfil}
          onUpdate={handleUpdate}
          atualizando={atualizando}
        />
      )}

      {tabAtiva === 'retornos' && (isPablo || isAdmin) && (
        <TabelaRetornos
          tarefas={tarefasD}
          perfil={perfil}
          onUpdate={handleUpdate}
          atualizando={atualizando}
        />
      )}

      {tabAtiva === 'alteracoes' && isAdmin && (
        <div className="bg-[#111111] border border-[#2A2209] rounded-xl px-6 py-16 text-center">
          <p className="text-[#8A7A5A] text-sm">Em breve -- Modulo E</p>
        </div>
      )}
    </>
  )
}
