'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Ban, RotateCcw, ArrowUpDown, ArrowUp, ArrowDown, X, CalendarDays } from 'lucide-react'
import type { Paciente, PacienteComCalculos } from '@/types/pacientes'
import {
  TIPO_PLANO_LABELS,
  TEMPO_PLANO_LABELS,
} from '@/types/pacientes'
import {
  calcularCamposPaciente,
  separarPacientes,
  formatarData,
  corDaLinhaRetorno,
  badgeStatusRetorno,
  badgeStatusPlano,
  corNomePaciente,
} from '@/lib/pacientes'
import { AdicionarPacienteModal } from '@/app/(protected)/pacientes/adicionar-paciente-modal'
import { ObservacoesInline } from '@/app/(protected)/pacientes/observacoes-inline'
import {
  cancelarPaciente,
  reativarPaciente,
} from '@/app/(protected)/pacientes/actions'
import { RenovarModal } from '@/app/(protected)/pacientes/renovar-modal'
import { EditarDatasModal } from '@/app/(protected)/pacientes/editar-datas-modal'

type TabKey = 'ativos' | 'vencidos' | 'cancelados'
type Acao = 'cancelar' | 'reativar'
type SortDirection = 'asc' | 'desc'
type ColumnKey =
  | 'nome'
  | 'data_inicio'
  | 'proximo_retorno'
  | 'dias_para_retorno'
  | 'status_retorno'
  | 'tipo_plano'
  | 'duracao_plano'
  | 'data_vencimento_plano'
  | 'dias_ativos'
  | 'status_plano'
  | 'observacoes'

interface ConfirmState {
  aberto: boolean
  pacienteId: string
  pacienteNome: string
  acao: Acao
}

interface PacientesListaProps {
  pacientes: Paciente[]
  perfilAtual: string
}

const CONFIRM_INICIAL: ConfirmState = {
  aberto: false,
  pacienteId: '',
  pacienteNome: '',
  acao: 'cancelar',
}

type ColumnFilters = Partial<Record<ColumnKey, string>>

interface SortState {
  key: ColumnKey
  direction: SortDirection
}

function HeaderFiltravel({
  label,
  columnKey,
  sort,
  filtro,
  align = 'left',
  onSort,
  onFilter,
}: {
  label: string
  columnKey: ColumnKey
  sort: SortState
  filtro: string
  align?: 'left' | 'center'
  onSort: (key: ColumnKey) => void
  onFilter: (key: ColumnKey, value: string) => void
}) {
  const ativo = sort.key === columnKey
  const Icon = !ativo ? ArrowUpDown : sort.direction === 'asc' ? ArrowUp : ArrowDown

  return (
    <th
      className={`px-4 py-3 text-[#F5F0E8] font-medium text-xs uppercase tracking-wider min-w-[150px] ${
        align === 'center' ? 'text-center' : 'text-left'
      }`}
    >
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={`inline-flex items-center gap-1.5 transition-colors ${
          ativo ? 'text-[#C9A84C]' : 'text-[#F5F0E8] hover:text-[#C9A84C]'
        } ${align === 'center' ? 'justify-center' : ''}`}
      >
        {label}
        <Icon size={13} />
      </button>
      <input
        type="text"
        value={filtro}
        onChange={(e) => onFilter(columnKey, e.target.value)}
        placeholder="Filtrar"
        className="mt-2 w-full min-w-[120px] rounded-md border border-[#2A2209] bg-[#111111] px-2 py-1.5 text-xs normal-case tracking-normal text-[#F5F0E8] placeholder-[#F5F0E8]/45 focus:border-[#C9A84C] focus:outline-none"
      />
    </th>
  )
}

function valorColunaTexto(paciente: PacienteComCalculos, key: ColumnKey): string {
  switch (key) {
    case 'nome':
      return `${paciente.nome} ${paciente.email ?? ''} ${paciente.telefone ?? ''}`
    case 'data_inicio':
      return formatarData(paciente.data_inicio)
    case 'proximo_retorno':
      return formatarData(paciente.proximo_retorno)
    case 'dias_para_retorno':
      return paciente.dias_para_retorno === null ? '-' : String(paciente.dias_para_retorno)
    case 'status_retorno':
      return badgeStatusRetorno(paciente.dias_para_retorno).texto
    case 'tipo_plano':
      return TIPO_PLANO_LABELS[paciente.tipo_plano]
    case 'duracao_plano':
      return TEMPO_PLANO_LABELS[paciente.duracao_plano]
    case 'data_vencimento_plano':
      return formatarData(paciente.data_vencimento_plano)
    case 'dias_ativos':
      return String(paciente.dias_ativos)
    case 'status_plano':
      return badgeStatusPlano(paciente.dias_ativos).texto
    case 'observacoes':
      return paciente.observacoes ?? ''
  }
}

function valorColunaSort(paciente: PacienteComCalculos, key: ColumnKey): string | number {
  switch (key) {
    case 'data_inicio':
      return paciente.data_inicio
    case 'proximo_retorno':
      return paciente.proximo_retorno ?? ''
    case 'data_vencimento_plano':
      return paciente.data_vencimento_plano
    case 'dias_para_retorno':
      return paciente.dias_para_retorno ?? Number.POSITIVE_INFINITY
    case 'dias_ativos':
      return paciente.dias_ativos
    default:
      return valorColunaTexto(paciente, key).toLowerCase()
  }
}

function compararPacientes(
  a: PacienteComCalculos,
  b: PacienteComCalculos,
  sort: SortState,
): number {
  const av = valorColunaSort(a, sort.key)
  const bv = valorColunaSort(b, sort.key)
  let resultado = 0

  if (typeof av === 'number' && typeof bv === 'number') {
    resultado = av - bv
  } else {
    resultado = String(av).localeCompare(String(bv), 'pt-BR', {
      numeric: true,
      sensitivity: 'base',
    })
  }

  return sort.direction === 'asc' ? resultado : -resultado
}

function colunaVisivelNaTab(key: ColumnKey, tabAtiva: TabKey): boolean {
  if (key === 'dias_para_retorno' || key === 'status_retorno') {
    return tabAtiva === 'ativos'
  }
  if (
    key === 'data_vencimento_plano' ||
    key === 'dias_ativos' ||
    key === 'status_plano'
  ) {
    return tabAtiva !== 'cancelados'
  }
  return true
}

export function PacientesLista({ pacientes, perfilAtual }: PacientesListaProps) {
  const router = useRouter()
  const [tabAtiva, setTabAtiva] = useState<TabKey>('ativos')
  const [query, setQuery] = useState('')
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({})
  const [sort, setSort] = useState<SortState>({ key: 'nome', direction: 'asc' })
  const [modalAdicionarAberto, setModalAdicionarAberto] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmState>(CONFIRM_INICIAL)
  const [erroAcao, setErroAcao] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [renovarState, setRenovarState] = useState<{
    aberto: boolean
    pacienteId: string
    pacienteNome: string
  }>({ aberto: false, pacienteId: '', pacienteNome: '' })
  const [pacienteEditandoDatas, setPacienteEditandoDatas] = useState<{
    id: string
    nome_completo: string
    data_inicio: string
    data_vencimento_plano: string
    proximo_retorno: string
  } | null>(null)

  const isAdmin = perfilAtual === 'joao_admin'

  const { ativos, vencidos, cancelados } = useMemo(() => {
    const calculados: PacienteComCalculos[] = pacientes.map(calcularCamposPaciente)
    return separarPacientes(calculados)
  }, [pacientes])

  const listaAtiva = useMemo(() => {
    if (tabAtiva === 'ativos') return ativos
    if (tabAtiva === 'vencidos') return vencidos
    return cancelados
  }, [tabAtiva, ativos, vencidos, cancelados])

  const pacientesFiltrados = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filters = Object.entries(columnFilters).filter(
      ([key, value]) => value.trim() !== '' && colunaVisivelNaTab(key as ColumnKey, tabAtiva),
    ) as [ColumnKey, string][]

    const filtrados = listaAtiva.filter((p) => {
      const nome = p.nome.toLowerCase()
      const email = p.email?.toLowerCase() ?? ''
      const telefone = p.telefone?.toLowerCase() ?? ''
      const passaBuscaGlobal = !q || nome.includes(q) || email.includes(q) || telefone.includes(q)
      if (!passaBuscaGlobal) return false

      return filters.every(([key, value]) =>
        valorColunaTexto(p, key).toLowerCase().includes(value.trim().toLowerCase()),
      )
    })

    const sortEfetivo = colunaVisivelNaTab(sort.key, tabAtiva)
      ? sort
      : { key: 'nome' as const, direction: 'asc' as const }

    return [...filtrados].sort((a, b) => compararPacientes(a, b, sortEfetivo))
  }, [listaAtiva, query, columnFilters, sort, tabAtiva])

  const alterarFiltroColuna = (key: ColumnKey, value: string) => {
    setColumnFilters((prev) => ({ ...prev, [key]: value }))
  }

  const limparFiltrosColunas = () => setColumnFilters({})

  const ordenarPor = (key: ColumnKey) => {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    )
  }

  const abrirConfirm = (paciente: PacienteComCalculos, acao: Acao) => {
    setErroAcao(null)
    setConfirm({
      aberto: true,
      pacienteId: paciente.id,
      pacienteNome: paciente.nome,
      acao,
    })
  }

  const fecharConfirm = () => setConfirm(CONFIRM_INICIAL)

  const executarConfirm = () => {
    const { pacienteId, acao } = confirm
    setErroAcao(null)
    startTransition(async () => {
      try {
        if (acao === 'cancelar') {
          await cancelarPaciente(pacienteId)
        } else {
          await reativarPaciente(pacienteId)
        }
        fecharConfirm()
        router.refresh()
      } catch (error) {
        setErroAcao(
          error instanceof Error ? error.message : 'Falha ao executar acao.',
        )
      }
    })
  }

  const tabButtonClass = (key: TabKey) =>
    `px-4 py-2 text-sm rounded-md transition-colors ${
      tabAtiva === key
        ? 'bg-[#111111] text-[#F5F0E8] font-medium'
        : 'text-[#F5F0E8] hover:text-[#F5F0E8]'
    }`

  const temFiltrosColuna = Object.values(columnFilters).some((value) => value?.trim())

  const colunasRetorno = tabAtiva === 'ativos'
  const colunasPlano = tabAtiva !== 'cancelados'
  const colunasAcao = isAdmin
  const colunasObs = true

  const totalColunas =
    5 /* nome, inicio, retorno, tipo, tempo */ +
    (colunasRetorno ? 2 : 0) /* dias_p_retorno + status_retorno */ +
    (colunasPlano ? 3 : 0) /* vencimento + dias_ativos + status_plano */ +
    (colunasObs ? 1 : 0) +
    (colunasAcao ? 1 : 0)

  return (
    <>
      {/* Header: botao adicionar + busca */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="relative max-w-xl flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F5F0E8]"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, e-mail ou telefone..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#111111] border border-[#2A2209] rounded-lg text-[#F5F0E8] text-sm placeholder-[#F5F0E8]/60 focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C] transition-colors"
          />
        </div>

        <button
          type="button"
          onClick={() => setModalAdicionarAberto(true)}
          className="px-4 py-2 text-sm bg-[#C9A84C] hover:bg-[#E2BC6A] text-[#0A0A0A] font-semibold rounded-lg transition-colors whitespace-nowrap"
        >
          + Adicionar Paciente
        </button>
      </div>

      {temFiltrosColuna && (
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={limparFiltrosColunas}
            className="inline-flex items-center gap-1.5 text-xs text-[#F5F0E8] border border-[#2A2209] rounded-lg px-3 py-2 hover:border-[#C9A84C]/50 transition-colors"
          >
            <X size={14} />
            Limpar filtros das colunas
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0A0A0A] border border-[#2A2209] rounded-lg p-1 mb-4 w-fit">
        <button
          type="button"
          onClick={() => setTabAtiva('ativos')}
          className={tabButtonClass('ativos')}
        >
          Ativos ({ativos.length})
        </button>
        <button
          type="button"
          onClick={() => setTabAtiva('vencidos')}
          className={tabButtonClass('vencidos')}
        >
          Vencidos ({vencidos.length})
        </button>
        <button
          type="button"
          onClick={() => setTabAtiva('cancelados')}
          className={tabButtonClass('cancelados')}
        >
          Cancelados ({cancelados.length})
        </button>
      </div>

      {/* Tabela */}
      <div className="bg-[#111111] border border-[#2A2209] rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#0D0D0D] border-b border-[#2A2209]">
              <HeaderFiltravel label="Nome" columnKey="nome" sort={sort} filtro={columnFilters.nome ?? ''} onSort={ordenarPor} onFilter={alterarFiltroColuna} />
              <HeaderFiltravel label="Data Inicio" columnKey="data_inicio" sort={sort} filtro={columnFilters.data_inicio ?? ''} onSort={ordenarPor} onFilter={alterarFiltroColuna} />
              <HeaderFiltravel label="Prox. Retorno" columnKey="proximo_retorno" sort={sort} filtro={columnFilters.proximo_retorno ?? ''} onSort={ordenarPor} onFilter={alterarFiltroColuna} />
              {colunasRetorno && (
                <>
                  <HeaderFiltravel label="Dias p/ Retorno" columnKey="dias_para_retorno" align="center" sort={sort} filtro={columnFilters.dias_para_retorno ?? ''} onSort={ordenarPor} onFilter={alterarFiltroColuna} />
                  <HeaderFiltravel label="Status Retorno" columnKey="status_retorno" align="center" sort={sort} filtro={columnFilters.status_retorno ?? ''} onSort={ordenarPor} onFilter={alterarFiltroColuna} />
                </>
              )}
              <HeaderFiltravel label="Tipo" columnKey="tipo_plano" sort={sort} filtro={columnFilters.tipo_plano ?? ''} onSort={ordenarPor} onFilter={alterarFiltroColuna} />
              <HeaderFiltravel label="Tempo" columnKey="duracao_plano" sort={sort} filtro={columnFilters.duracao_plano ?? ''} onSort={ordenarPor} onFilter={alterarFiltroColuna} />
              {colunasPlano && (
                <>
                  <HeaderFiltravel label="Vencimento" columnKey="data_vencimento_plano" sort={sort} filtro={columnFilters.data_vencimento_plano ?? ''} onSort={ordenarPor} onFilter={alterarFiltroColuna} />
                  <HeaderFiltravel label="Dias Ativos" columnKey="dias_ativos" align="center" sort={sort} filtro={columnFilters.dias_ativos ?? ''} onSort={ordenarPor} onFilter={alterarFiltroColuna} />
                  <HeaderFiltravel label="Status Plano" columnKey="status_plano" align="center" sort={sort} filtro={columnFilters.status_plano ?? ''} onSort={ordenarPor} onFilter={alterarFiltroColuna} />
                </>
              )}
              <HeaderFiltravel label="Obs." columnKey="observacoes" sort={sort} filtro={columnFilters.observacoes ?? ''} onSort={ordenarPor} onFilter={alterarFiltroColuna} />
              {colunasAcao && (
                <th className="text-center px-4 py-3 text-[#F5F0E8] font-medium text-xs uppercase tracking-wider">
                  Acao
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {pacientesFiltrados.length === 0 ? (
              <tr>
                <td
                  colSpan={totalColunas}
                  className="text-center py-12 text-[#F5F0E8]/60"
                >
                  {tabAtiva === 'ativos' && 'Nenhum paciente ativo.'}
                  {tabAtiva === 'vencidos' && 'Nenhum paciente com plano vencido.'}
                  {tabAtiva === 'cancelados' && 'Nenhum paciente cancelado.'}
                </td>
              </tr>
            ) : (
              pacientesFiltrados.map((p, idx) => {
                const linhaClasse = colunasRetorno
                  ? corDaLinhaRetorno(p.dias_para_retorno)
                  : ''
                const bgAlt = idx % 2 === 1 ? 'bg-[#0D0D0D]' : ''
                const statusRetorno = badgeStatusRetorno(p.dias_para_retorno)
                const statusPlano = badgeStatusPlano(p.dias_ativos)
                const nomeClasse =
                  tabAtiva === 'cancelados'
                    ? 'text-[#F5F0E8] line-through'
                    : corNomePaciente(p.dias_ativos)

                return (
                  <tr
                    key={p.id}
                    className={`border-b border-[#1A1A1A] hover:bg-white/5 transition-colors ${bgAlt} ${linhaClasse}`}
                  >
                    <td className={`px-4 py-3 whitespace-nowrap ${nomeClasse}`}>
                      <Link
                        href={`/pacientes/${p.id}`}
                        className="hover:text-[#F5F0E8] hover:underline transition-colors"
                      >
                        {p.nome}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[#F5F0E8] whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span>{formatarData(p.data_inicio)}</span>
                        <button
                          type="button"
                          title="Editar datas"
                          onClick={() =>
                            setPacienteEditandoDatas({
                              id: p.id,
                              nome_completo: p.nome,
                              data_inicio: p.data_inicio,
                              data_vencimento_plano: p.data_vencimento_plano,
                              proximo_retorno: p.proximo_retorno ?? '',
                            })
                          }
                          className="text-[#F5F0E8]/40 transition-colors hover:text-[#C9A84C]"
                        >
                          <CalendarDays size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#F5F0E8] whitespace-nowrap">
                      {formatarData(p.proximo_retorno)}
                    </td>
                    {colunasRetorno && (
                      <>
                        <td className="px-4 py-3 text-center text-[#F5F0E8] whitespace-nowrap">
                          {p.dias_para_retorno !== null ? p.dias_para_retorno : '-'}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs ${statusRetorno.classe}`}
                          >
                            {statusRetorno.texto}
                          </span>
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3 text-[#F5F0E8] whitespace-nowrap">
                      {TIPO_PLANO_LABELS[p.tipo_plano]}
                    </td>
                    <td className="px-4 py-3 text-[#F5F0E8] whitespace-nowrap">
                      {TEMPO_PLANO_LABELS[p.duracao_plano]}
                    </td>
                    {colunasPlano && (
                      <>
                        <td className="px-4 py-3 text-[#F5F0E8] whitespace-nowrap">
                          {formatarData(p.data_vencimento_plano)}
                        </td>
                        <td className="px-4 py-3 text-center text-[#F5F0E8] whitespace-nowrap">
                          {p.dias_ativos}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs ${statusPlano.classe}`}
                          >
                            {statusPlano.texto}
                          </span>
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3">
                      <ObservacoesInline
                        pacienteId={p.id}
                        valor={p.observacoes}
                      />
                    </td>
                    {colunasAcao && (
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {tabAtiva === 'cancelados' ? (
                          <button
                            type="button"
                            onClick={() => abrirConfirm(p, 'reativar')}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-[#1A1500] hover:bg-[#2A2209] text-[#F5F0E8] border border-[#2A2209] hover:border-[#C9A84C] rounded transition-colors"
                          >
                            <RotateCcw size={12} />
                            Reativar
                          </button>
                        ) : tabAtiva === 'vencidos' ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => setRenovarState({ aberto: true, pacienteId: p.id, pacienteNome: p.nome })}
                              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-[#C9A84C] border border-[#C9A84C]/30 hover:bg-[#C9A84C]/10 rounded transition-colors"
                            >
                              <RotateCcw size={12} />
                              Renovar
                            </button>
                            <button
                              type="button"
                              onClick={() => abrirConfirm(p, 'cancelar')}
                              className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-transparent hover:bg-red-900/20 text-red-400 border border-red-900/40 hover:border-red-600/60 rounded transition-colors"
                            >
                              <Ban size={12} />
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => abrirConfirm(p, 'cancelar')}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-transparent hover:bg-red-900/20 text-red-400 border border-red-900/40 hover:border-red-600/60 rounded transition-colors"
                          >
                            <Ban size={12} />
                            Cancelar
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal adicionar */}
      <AdicionarPacienteModal
        aberto={modalAdicionarAberto}
        onFechar={() => setModalAdicionarAberto(false)}
      />

      {/* Modal renovar plano */}
      {renovarState.aberto && (
        <RenovarModal
          pacienteId={renovarState.pacienteId}
          pacienteNome={renovarState.pacienteNome}
          onClose={() => setRenovarState({ aberto: false, pacienteId: '', pacienteNome: '' })}
        />
      )}

      {/* Modal editar datas */}
      {pacienteEditandoDatas !== null && (
        <EditarDatasModal
          paciente={pacienteEditandoDatas}
          onClose={() => setPacienteEditandoDatas(null)}
        />
      )}

      {/* Modal confirmacao */}
      {confirm.aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111111] border border-[#2A2209] rounded-xl w-full max-w-md mx-4 shadow-2xl">
            <div className="px-6 py-4 border-b border-[#2A2209]">
              <h2 className="text-lg font-semibold text-[#F5F0E8] tracking-wide">
                {confirm.acao === 'cancelar'
                  ? 'Cancelar paciente'
                  : 'Reativar paciente'}
              </h2>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-[#F5F0E8] text-sm">
                {confirm.acao === 'cancelar' ? (
                  <>
                    Tem certeza que deseja cancelar{' '}
                    <span className="text-[#F5F0E8] font-semibold">
                      {confirm.pacienteNome}
                    </span>
                    ? O paciente sera movido para a aba Cancelados.
                  </>
                ) : (
                  <>
                    Tem certeza que deseja reativar{' '}
                    <span className="text-[#F5F0E8] font-semibold">
                      {confirm.pacienteNome}
                    </span>
                    ? O paciente voltara para a aba Ativos.
                  </>
                )}
              </p>
              {erroAcao && (
                <p className="text-red-400 text-sm">{erroAcao}</p>
              )}
            </div>
            <div className="px-6 pb-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={fecharConfirm}
                disabled={pending}
                className="px-4 py-2 text-sm text-[#F5F0E8] hover:text-[#F5F0E8] border border-[#2A2209] hover:border-[#C9A84C] rounded-lg transition-colors disabled:opacity-50"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={executarConfirm}
                disabled={pending}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 ${
                  confirm.acao === 'cancelar'
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : 'bg-[#C9A84C] hover:bg-[#E2BC6A] text-[#0A0A0A]'
                }`}
              >
                {pending
                  ? 'Processando...'
                  : confirm.acao === 'cancelar'
                    ? 'Confirmar cancelamento'
                    : 'Confirmar reativacao'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
