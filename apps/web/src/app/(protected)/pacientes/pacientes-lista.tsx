'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Ban, RotateCcw } from 'lucide-react'
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

type TabKey = 'ativos' | 'vencidos' | 'cancelados'
type Acao = 'cancelar' | 'reativar'

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

export function PacientesLista({ pacientes, perfilAtual }: PacientesListaProps) {
  const router = useRouter()
  const [tabAtiva, setTabAtiva] = useState<TabKey>('ativos')
  const [query, setQuery] = useState('')
  const [modalAdicionarAberto, setModalAdicionarAberto] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmState>(CONFIRM_INICIAL)
  const [erroAcao, setErroAcao] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

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
    if (!q) return listaAtiva
    return listaAtiva.filter((p) => {
      const nome = p.nome.toLowerCase()
      const email = p.email?.toLowerCase() ?? ''
      const telefone = p.telefone?.toLowerCase() ?? ''
      return nome.includes(q) || email.includes(q) || telefone.includes(q)
    })
  }, [listaAtiva, query])

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
        : 'text-[#8A7A5A] hover:text-[#F5F0E8]'
    }`

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

        <button
          type="button"
          onClick={() => setModalAdicionarAberto(true)}
          className="px-4 py-2 text-sm bg-[#C9A84C] hover:bg-[#E2BC6A] text-[#0A0A0A] font-semibold rounded-lg transition-colors whitespace-nowrap"
        >
          + Adicionar Paciente
        </button>
      </div>

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
              <th className="text-left px-4 py-3 text-[#8A7A5A] font-medium text-xs uppercase tracking-wider">
                Nome
              </th>
              <th className="text-left px-4 py-3 text-[#8A7A5A] font-medium text-xs uppercase tracking-wider">
                Data Inicio
              </th>
              <th className="text-left px-4 py-3 text-[#8A7A5A] font-medium text-xs uppercase tracking-wider">
                Prox. Retorno
              </th>
              {colunasRetorno && (
                <>
                  <th className="text-center px-4 py-3 text-[#8A7A5A] font-medium text-xs uppercase tracking-wider">
                    Dias p/ Retorno
                  </th>
                  <th className="text-center px-4 py-3 text-[#8A7A5A] font-medium text-xs uppercase tracking-wider">
                    Status Retorno
                  </th>
                </>
              )}
              <th className="text-left px-4 py-3 text-[#8A7A5A] font-medium text-xs uppercase tracking-wider">
                Tipo
              </th>
              <th className="text-left px-4 py-3 text-[#8A7A5A] font-medium text-xs uppercase tracking-wider">
                Tempo
              </th>
              {colunasPlano && (
                <>
                  <th className="text-left px-4 py-3 text-[#8A7A5A] font-medium text-xs uppercase tracking-wider">
                    Vencimento
                  </th>
                  <th className="text-center px-4 py-3 text-[#8A7A5A] font-medium text-xs uppercase tracking-wider">
                    Dias Ativos
                  </th>
                  <th className="text-center px-4 py-3 text-[#8A7A5A] font-medium text-xs uppercase tracking-wider">
                    Status Plano
                  </th>
                </>
              )}
              <th className="text-left px-4 py-3 text-[#8A7A5A] font-medium text-xs uppercase tracking-wider">
                Obs.
              </th>
              {colunasAcao && (
                <th className="text-center px-4 py-3 text-[#8A7A5A] font-medium text-xs uppercase tracking-wider">
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
                  className="text-center py-12 text-[#8A7A5A]/60"
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
                    ? 'text-[#8A7A5A] line-through'
                    : corNomePaciente(p.dias_ativos)

                return (
                  <tr
                    key={p.id}
                    className={`border-b border-[#1A1A1A] hover:bg-[#1A1500]/30 transition-colors ${bgAlt} ${linhaClasse}`}
                  >
                    <td className={`px-4 py-3 whitespace-nowrap ${nomeClasse}`}>
                      <Link
                        href={`/pacientes/${p.id}`}
                        className="hover:text-[#F5F0E8] hover:underline transition-colors"
                      >
                        {p.nome}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[#8A7A5A] whitespace-nowrap">
                      {formatarData(p.data_inicio)}
                    </td>
                    <td className="px-4 py-3 text-[#8A7A5A] whitespace-nowrap">
                      {formatarData(p.proximo_retorno)}
                    </td>
                    {colunasRetorno && (
                      <>
                        <td className="px-4 py-3 text-center text-[#8A7A5A] whitespace-nowrap">
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
                    <td className="px-4 py-3 text-[#8A7A5A] whitespace-nowrap">
                      {TIPO_PLANO_LABELS[p.tipo_plano]}
                    </td>
                    <td className="px-4 py-3 text-[#8A7A5A] whitespace-nowrap">
                      {TEMPO_PLANO_LABELS[p.duracao_plano]}
                    </td>
                    {colunasPlano && (
                      <>
                        <td className="px-4 py-3 text-[#8A7A5A] whitespace-nowrap">
                          {formatarData(p.data_vencimento_plano)}
                        </td>
                        <td className="px-4 py-3 text-center text-[#8A7A5A] whitespace-nowrap">
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
                className="px-4 py-2 text-sm text-[#8A7A5A] hover:text-[#F5F0E8] border border-[#2A2209] hover:border-[#C9A84C] rounded-lg transition-colors disabled:opacity-50"
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
