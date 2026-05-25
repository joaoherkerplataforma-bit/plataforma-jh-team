'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowDown,
  ArrowUp,
  Edit3,
  Eye,
  EyeOff,
  Plus,
} from 'lucide-react'
import type { Videoaula } from '@/types/videoaulas'
import { UploadModal } from '@/app/(protected)/pacientes/videoaulas/upload-modal'

interface ListaAdminProps {
  videoaulas: Videoaula[]
}

type Direcao = 'up' | 'down'

export function ListaAdmin({ videoaulas }: ListaAdminProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)
  const [modalUpload, setModalUpload] = useState<{
    aberto: boolean
    mode: 'create' | 'edit'
    videoaula?: Videoaula
  }>({ aberto: false, mode: 'create' })

  const proximaOrdemSugerida = useMemo(() => {
    const ativos = videoaulas.filter((v) => v.ativo)
    if (ativos.length === 0) return 1
    const max = ativos.reduce((acc, v) => (v.ordem > acc ? v.ordem : acc), 0)
    return max + 1
  }, [videoaulas])

  const ativos = useMemo(
    () => videoaulas.filter((v) => v.ativo).sort((a, b) => a.ordem - b.ordem),
    [videoaulas],
  )
  const arquivados = useMemo(
    () => videoaulas.filter((v) => !v.ativo).sort((a, b) => a.ordem - b.ordem),
    [videoaulas],
  )

  const abrirCriar = () => {
    setErro(null)
    setModalUpload({ aberto: true, mode: 'create' })
  }

  const abrirEditar = (v: Videoaula) => {
    setErro(null)
    setModalUpload({ aberto: true, mode: 'edit', videoaula: v })
  }

  const fecharModal = () =>
    setModalUpload({ aberto: false, mode: 'create' })

  const toggleAtivo = (v: Videoaula) => {
    setErro(null)
    startTransition(async () => {
      try {
        const resposta = await fetch(`/api/admin/videoaulas/${v.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ativo: !v.ativo }),
        })
        if (!resposta.ok) {
          const payload = await resposta.json().catch(() => ({}))
          throw new Error(payload?.error ?? `HTTP ${resposta.status}`)
        }
        router.refresh()
      } catch (e) {
        setErro(
          `Falha ao alternar visibilidade: ${
            e instanceof Error ? e.message : 'erro desconhecido'
          }`,
        )
      }
    })
  }

  const reordenar = (v: Videoaula, direction: Direcao) => {
    if (!v.ativo) return // reorder so faz sentido entre ativos
    setErro(null)
    startTransition(async () => {
      try {
        const resposta = await fetch('/api/admin/videoaulas/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: v.id, direction }),
        })
        if (!resposta.ok) {
          const payload = await resposta.json().catch(() => ({}))
          throw new Error(payload?.error ?? `HTTP ${resposta.status}`)
        }
        router.refresh()
      } catch (e) {
        setErro(
          `Falha ao reordenar: ${
            e instanceof Error ? e.message : 'erro desconhecido'
          }`,
        )
      }
    })
  }

  const renderLinha = (v: Videoaula, isFirstAtivo: boolean, isLastAtivo: boolean) => {
    return (
      <tr
        key={v.id}
        className="border-b border-[#1A1A1A] hover:bg-[#1A1500]/30 transition-colors"
      >
        <td className="px-4 py-3 text-center text-[#F5F0E8] whitespace-nowrap">
          {v.ordem}
        </td>
        <td className="px-4 py-3 text-[#F5F0E8]">
          {v.titulo}
        </td>
        <td className="px-4 py-3 text-[#F5F0E8] max-w-md">
          <span className="line-clamp-2">{v.descricao ?? '-'}</span>
        </td>
        <td className="px-4 py-3 text-center whitespace-nowrap">
          {v.ativo ? (
            <span className="inline-block px-2 py-0.5 rounded text-xs bg-[#1A1500] text-[#F5F0E8] border border-[#C9A84C]/40">
              Ativo
            </span>
          ) : (
            <span className="inline-block px-2 py-0.5 rounded text-xs bg-[#1A1A1A] text-[#F5F0E8] border border-[#2A2209]">
              Arquivado
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-center whitespace-nowrap">
          <div className="flex items-center justify-center gap-1.5">
            {/* Reordenar (apenas em ativos) */}
            {v.ativo && (
              <>
                <button
                  type="button"
                  title="Mover para cima"
                  onClick={() => reordenar(v, 'up')}
                  disabled={pending || isFirstAtivo}
                  className="p-1.5 rounded text-[#F5F0E8] hover:text-[#F5F0E8] hover:bg-[#1A1500] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  title="Mover para baixo"
                  onClick={() => reordenar(v, 'down')}
                  disabled={pending || isLastAtivo}
                  className="p-1.5 rounded text-[#F5F0E8] hover:text-[#F5F0E8] hover:bg-[#1A1500] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowDown size={14} />
                </button>
              </>
            )}

            {/* Editar */}
            <button
              type="button"
              title="Editar metadados"
              onClick={() => abrirEditar(v)}
              disabled={pending}
              className="p-1.5 rounded text-[#F5F0E8] hover:text-[#F5F0E8] hover:bg-[#1A1500] transition-colors disabled:opacity-30"
            >
              <Edit3 size={14} />
            </button>

            {/* Ativar/Desativar */}
            <button
              type="button"
              title={v.ativo ? 'Arquivar' : 'Reativar'}
              onClick={() => toggleAtivo(v)}
              disabled={pending}
              className="p-1.5 rounded text-[#F5F0E8] hover:text-[#F5F0E8] hover:bg-[#1A1500] transition-colors disabled:opacity-30"
            >
              {v.ativo ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-serif text-[#F5F0E8] tracking-wide">
            Videoaulas
          </h1>
          <p className="text-sm text-[#F5F0E8] mt-1">
            Catalogo da trilha de videoaulas do Portal do Aluno.
          </p>
        </div>

        <button
          type="button"
          onClick={abrirCriar}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-[#C9A84C] hover:bg-[#E2BC6A] text-[#0A0A0A] font-semibold rounded-lg transition-colors whitespace-nowrap"
        >
          <Plus size={16} />
          Nova videoaula
        </button>
      </div>

      {erro && (
        <div className="mb-4 px-4 py-3 bg-red-900/20 border border-red-900/40 rounded-lg text-red-400 text-sm">
          {erro}
        </div>
      )}

      {/* Tabela ATIVOS */}
      <section className="mb-8">
        <h2 className="text-sm uppercase tracking-wider text-[#F5F0E8] mb-2">
          Ativos ({ativos.length})
        </h2>
        <div className="bg-[#111111] border border-[#2A2209] rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0D0D0D] border-b border-[#2A2209]">
                <th className="text-center px-4 py-3 text-[#F5F0E8] font-medium text-xs uppercase tracking-wider w-20">
                  Ordem
                </th>
                <th className="text-left px-4 py-3 text-[#F5F0E8] font-medium text-xs uppercase tracking-wider">
                  Titulo
                </th>
                <th className="text-left px-4 py-3 text-[#F5F0E8] font-medium text-xs uppercase tracking-wider">
                  Descricao
                </th>
                <th className="text-center px-4 py-3 text-[#F5F0E8] font-medium text-xs uppercase tracking-wider w-32">
                  Status
                </th>
                <th className="text-center px-4 py-3 text-[#F5F0E8] font-medium text-xs uppercase tracking-wider w-44">
                  Acoes
                </th>
              </tr>
            </thead>
            <tbody>
              {ativos.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-12 text-[#F5F0E8]/60"
                  >
                    Nenhuma videoaula ativa. Clique em &quot;Nova videoaula&quot; para comecar.
                  </td>
                </tr>
              ) : (
                ativos.map((v, idx) =>
                  renderLinha(v, idx === 0, idx === ativos.length - 1),
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Tabela ARQUIVADOS */}
      {arquivados.length > 0 && (
        <section>
          <h2 className="text-sm uppercase tracking-wider text-[#F5F0E8] mb-2">
            Arquivados ({arquivados.length})
          </h2>
          <div className="bg-[#111111] border border-[#2A2209] rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#0D0D0D] border-b border-[#2A2209]">
                  <th className="text-center px-4 py-3 text-[#F5F0E8] font-medium text-xs uppercase tracking-wider w-20">
                    Ordem
                  </th>
                  <th className="text-left px-4 py-3 text-[#F5F0E8] font-medium text-xs uppercase tracking-wider">
                    Titulo
                  </th>
                  <th className="text-left px-4 py-3 text-[#F5F0E8] font-medium text-xs uppercase tracking-wider">
                    Descricao
                  </th>
                  <th className="text-center px-4 py-3 text-[#F5F0E8] font-medium text-xs uppercase tracking-wider w-32">
                    Status
                  </th>
                  <th className="text-center px-4 py-3 text-[#F5F0E8] font-medium text-xs uppercase tracking-wider w-44">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody>
                {arquivados.map((v) => renderLinha(v, true, true))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Modal upload/edit */}
      <UploadModal
        aberto={modalUpload.aberto}
        onFechar={fecharModal}
        mode={modalUpload.mode}
        videoaula={modalUpload.videoaula}
        proximaOrdemSugerida={proximaOrdemSugerida}
      />
    </>
  )
}
