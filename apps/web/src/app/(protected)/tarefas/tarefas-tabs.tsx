'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Plus, X } from 'lucide-react'
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
  tarefasE: Tarefa[]
  perfil: PerfilAcesso
  pacientes: { id: string; nome: string }[]
  usuarios: { id: string; nome: string; perfil: string }[]
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
    if (status === 'pendente') return 'feito'
    if (status === 'feito' && perfil === 'joao_admin') return 'entregue'
  }
  if (modulo === 'C') {
    if (status === 'pendente') return 'feito'
    if (status === 'feito' && perfil === 'joao_admin') return 'gravado'
    if (status === 'gravado' && perfil === 'joao_admin') return 'entregue'
  }
  if (modulo === 'D') {
    if (status === 'pendente') return 'feito'
    if (status === 'feito' && perfil === 'joao_admin') return 'entregue'
  }
  if (modulo === 'E') {
    if (status === 'pendente') return 'feito'
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
  if (tarefa.status === 'entregue') return 'text-[#F5F0E8]'
  const diff = diasAteOuDesde(tarefa.data_prazo)
  if (diff > 0) return 'text-red-400'       // vencido
  if (diff >= -1) return 'text-orange-400'   // faltando 1 dia ou no dia
  return 'text-[#F5F0E8]'                   // normal
}

function linhaAtrasada(tarefa: Tarefa): boolean {
  if (tarefa.status === 'entregue' || tarefa.status === 'bloqueada') return false
  return diasAteOuDesde(tarefa.data_prazo) > 0
}

/* ─────────────────── ResponsavelBadge ─────────────────── */

interface ResponsavelBadgeProps {
  nome: string | undefined
  perfil: string | undefined
}

function ResponsavelBadge({ nome, perfil }: ResponsavelBadgeProps) {
  if (!nome) return <span className="text-sm text-[#F5F0E8]">-</span>

  const primeiroNome = nome.split(' ')[0]

  let bg = '#2A2209'
  let textColor = '#F5F0E8'
  if (perfil === 'joao_estagiario') {
    bg = '#93C5FD'
    textColor = '#0F172A'
  } else if (perfil === 'pablo') {
    bg = '#7C3AED'
    textColor = '#FFFFFF'
  }

  return (
    <span
      className="inline-flex justify-center items-center text-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: bg, color: textColor }}
    >
      {primeiroNome}
    </span>
  )
}

/* ─────────────────── Style constants ─────────────────── */

const thClass =
  'text-left px-4 py-3 text-[#F5F0E8] font-medium text-xs uppercase tracking-wider'
const thCenter =
  'text-center px-4 py-3 text-[#F5F0E8] font-medium text-xs uppercase tracking-wider'
const tdClass = 'px-4 py-3 text-sm text-[#F5F0E8] whitespace-nowrap'

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
        className={`text-left text-sm cursor-pointer transition-colors ${
          temObs
            ? 'text-[#F5F0E8]'
            : 'text-[#F5F0E8]/60 hover:text-[#F5F0E8]'
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
      <span className="text-sm text-[#F5F0E8]" title={valor!}>
        {valor}
      </span>
    )
  }

  return <span className="text-sm text-[#F5F0E8]/40">-</span>
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
            <th className={thCenter}>Responsavel</th>
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
              <td colSpan={9} className="text-center py-12 text-[#F5F0E8]/60">
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
                  <td className={`${tdClass} text-center`}>
                    <ResponsavelBadge nome={t.responsavel?.nome} perfil={t.responsavel?.perfil} />
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
              <td colSpan={7} className="text-center py-12 text-[#F5F0E8]/60">
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
              <td colSpan={6} className="text-center py-12 text-[#F5F0E8]/60">
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

/* ─────────────────── Tabela Alteracoes (E) ─────────────────── */

interface TabelaEProps {
  tarefas: Tarefa[]
  perfil: PerfilAcesso
  onUpdate: (id: string, status: StatusTarefa) => void
  atualizando: string | null
}

function TabelaAlteracoes({ tarefas, perfil, onUpdate, atualizando }: TabelaEProps) {
  return (
    <div className="bg-[#111111] border border-[#2A2209] rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#0D0D0D] border-b border-[#2A2209]">
            <th className={thClass}>Nome do Aluno</th>
            <th className={thCenter}>Responsavel</th>
            <th className={thClass}>Data do Pedido</th>
            <th className={thClass}>Observacoes</th>
            <th className={thCenter}>Status</th>
            <th className={thCenter}>Acao</th>
          </tr>
        </thead>
        <tbody>
          {tarefas.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center py-12 text-[#F5F0E8]/60">
                Nenhuma alteracao de protocolo.
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
                  <td className={`${tdClass} text-center`}>
                    <ResponsavelBadge nome={t.responsavel?.nome} perfil={t.responsavel?.perfil} />
                  </td>
                  <td className={tdClass}>{formatarData(t.data_criacao)}</td>
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

/* ─────────────────── Modal Nova Alteracao ─────────────────── */

interface NovaAlteracaoModalProps {
  aberto: boolean
  onFechar: () => void
  pacientes: { id: string; nome: string }[]
  usuarios: { id: string; nome: string; perfil: string }[]
  onSalvo: () => void
}

function NovaAlteracaoModal({
  aberto,
  onFechar,
  pacientes,
  usuarios,
  onSalvo,
}: NovaAlteracaoModalProps) {
  const [pacienteId, setPacienteId] = useState('')
  const [responsavelId, setResponsavelId] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [buscaPaciente, setBuscaPaciente] = useState('')

  const pacientesFiltrados = buscaPaciente.trim()
    ? pacientes.filter((p) =>
        p.nome.toLowerCase().includes(buscaPaciente.toLowerCase())
      )
    : pacientes

  const handleSalvar = useCallback(async () => {
    if (!pacienteId || !responsavelId) {
      setErro('Selecione o aluno e o responsavel.')
      return
    }

    setSalvando(true)
    setErro(null)

    try {
      const res = await fetch('/api/tarefas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paciente_id: pacienteId,
          responsavel_id: responsavelId,
          observacoes_joao: observacoes || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setErro(data.error || 'Erro ao criar alteracao.')
        return
      }

      // Reset form
      setPacienteId('')
      setResponsavelId('')
      setObservacoes('')
      setBuscaPaciente('')
      onFechar()
      onSalvo()
    } catch (error) {
      console.error('Falha ao criar alteracao:', error)
      setErro('Erro de conexao. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }, [pacienteId, responsavelId, observacoes, onFechar, onSalvo])

  if (!aberto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70" onClick={onFechar} />

      {/* Modal */}
      <div className="relative bg-[#111111] border border-[#2A2209] rounded-xl w-full max-w-lg mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-[#F5F0E8]">Nova Alteracao</h2>
          <button
            type="button"
            onClick={onFechar}
            className="p-1 rounded-lg text-[#F5F0E8] hover:text-[#F5F0E8] hover:bg-[#1A1500]/60 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Nome do aluno */}
          <div>
            <label className="block text-sm font-medium text-[#F5F0E8] mb-1">
              Nome do Aluno
            </label>
            <input
              type="text"
              value={buscaPaciente}
              onChange={(e) => {
                setBuscaPaciente(e.target.value)
                setPacienteId('')
              }}
              placeholder="Buscar aluno..."
              className="w-full bg-[#0A0A0A] border border-[#2A2209] rounded-lg px-3 py-2 text-sm text-[#F5F0E8] placeholder-[#F5F0E8]/40 focus:outline-none focus:border-[#C9A84C]/60"
            />
            {buscaPaciente.trim() && !pacienteId && (
              <div className="mt-1 max-h-32 overflow-y-auto bg-[#0A0A0A] border border-[#2A2209] rounded-lg">
                {pacientesFiltrados.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-[#F5F0E8]/60">Nenhum aluno encontrado.</p>
                ) : (
                  pacientesFiltrados.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPacienteId(p.id)
                        setBuscaPaciente(p.nome)
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-[#F5F0E8] hover:bg-[#1A1500]/60 transition-colors"
                    >
                      {p.nome}
                    </button>
                  ))
                )}
              </div>
            )}
            {pacienteId && (
              <p className="mt-1 text-xs text-[#F5F0E8]">Selecionado: {buscaPaciente}</p>
            )}
          </div>

          {/* Responsavel */}
          <div>
            <label className="block text-sm font-medium text-[#F5F0E8] mb-1">
              Responsavel
            </label>
            <select
              value={responsavelId}
              onChange={(e) => setResponsavelId(e.target.value)}
              className="w-full bg-[#0A0A0A] border border-[#2A2209] rounded-lg px-3 py-2 text-sm text-[#F5F0E8] focus:outline-none focus:border-[#C9A84C]/60"
            >
              <option value="">Selecionar...</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Observacoes */}
          <div>
            <label className="block text-sm font-medium text-[#F5F0E8] mb-1">
              Observacoes
            </label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Detalhes da alteracao..."
              rows={3}
              className="w-full bg-[#0A0A0A] border border-[#2A2209] rounded-lg px-3 py-2 text-sm text-[#F5F0E8] placeholder-[#F5F0E8]/40 focus:outline-none focus:border-[#C9A84C]/60 resize-none"
            />
          </div>

          {/* Error */}
          {erro && (
            <p className="text-sm text-red-400">{erro}</p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onFechar}
              className="px-4 py-2 text-sm text-[#F5F0E8] hover:text-[#F5F0E8] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSalvar}
              disabled={salvando}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#C9A84C] hover:bg-[#E2BC6A] text-[#0A0A0A] transition-colors disabled:opacity-50"
            >
              {salvando ? 'Salvando...' : 'Criar Alteracao'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────── Main Tabs Component ─────────────────── */

export function TarefasTabs({
  tarefasB,
  tarefasC,
  tarefasD,
  tarefasE,
  perfil,
  pacientes,
  usuarios,
}: TarefasTabsProps) {
  const router = useRouter()
  const [tabAtiva, setTabAtiva] = useState<TabId>('pendencias')
  const [atualizando, setAtualizando] = useState<string | null>(null)
  const [modalAberto, setModalAberto] = useState(false)

  const isAdmin = perfil === 'joao_admin'
  const isPablo = perfil === 'pablo'
  const isEstagiario = perfil === 'joao_estagiario'
  const podeVerFotos = isPablo || isAdmin || isEstagiario

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'pendencias', label: 'Pendencias', count: tarefasB.length },
    ...(podeVerFotos
      ? [{ id: 'fotos' as TabId, label: 'Fotos 30 Dias', count: tarefasC.length }]
      : []),
    ...(isPablo || isAdmin
      ? [{ id: 'retornos' as TabId, label: 'Retornos de Dieta', count: tarefasD.filter((t) => isPablo ? t.status !== 'bloqueada' : true).length }]
      : []),
    ...(isAdmin ? [{ id: 'alteracoes' as TabId, label: 'Alteracoes', count: tarefasE.length }] : []),
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
      <div className="mb-5 overflow-x-auto">
        <div
          role="tablist"
          aria-label="Filtros de tarefas"
          className="inline-flex min-w-max items-center gap-1 bg-[#0A0A0A] border border-[#2A2209] rounded-lg p-1"
        >
          {tabs.map((tab) => {
            const ativo = tabAtiva === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={ativo}
                onClick={() => setTabAtiva(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-colors whitespace-nowrap border ${
                  ativo
                    ? 'bg-[#C9A84C] text-[#0A0A0A] border-[#C9A84C] font-semibold shadow-[0_0_0_1px_rgba(201,168,76,0.35)]'
                    : 'text-[#F5F0E8] border-transparent hover:bg-white/5 hover:border-[#2A2209]'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`inline-flex min-w-6 justify-center rounded-full px-2 py-0.5 text-xs ${
                      ativo
                        ? 'bg-[#0A0A0A]/15 text-[#0A0A0A]'
                        : 'bg-white/5 text-[#F5F0E8]'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
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

      {tabAtiva === 'fotos' && podeVerFotos && (
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
        <>
          {/* Button "+ Nova Alteracao" — above table, right-aligned */}
          <div className="flex justify-end mb-4">
            <button
              type="button"
              onClick={() => setModalAberto(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[#C9A84C] hover:bg-[#E2BC6A] text-[#0A0A0A] transition-colors"
            >
              <Plus size={16} />
              Nova Alteracao
            </button>
          </div>

          <TabelaAlteracoes
            tarefas={tarefasE}
            perfil={perfil}
            onUpdate={handleUpdate}
            atualizando={atualizando}
          />

          <NovaAlteracaoModal
            aberto={modalAberto}
            onFechar={() => setModalAberto(false)}
            pacientes={pacientes}
            usuarios={usuarios}
            onSalvo={() => router.refresh()}
          />
        </>
      )}
    </>
  )
}
