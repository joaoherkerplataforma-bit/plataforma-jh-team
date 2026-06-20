'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Link2, Check, Pencil, FileText, Loader2, Table2, X } from 'lucide-react'

import type { FormularioResumo } from '@/types/formulario-builder'
import { ACAO_LABELS } from '@/types/formulario-builder'

interface RespostaFormulario {
  id: string
  criado_em: string
  nome: string | null
  email: string | null
  respostas: Record<string, string>
}

interface FormularioComRespostas extends FormularioResumo {
  campos: { key: string; label: string }[]
  respostas: RespostaFormulario[]
}

export function FormulariosLista({ formularios }: { formularios: FormularioComRespostas[] }) {
  const router = useRouter()
  const [criando, setCriando] = useState(false)
  const [copiado, setCopiado] = useState<string | null>(null)
  const [formularioRespostas, setFormularioRespostas] = useState<FormularioComRespostas | null>(null)

  async function criar() {
    setCriando(true)
    try {
      const resp = await fetch('/api/admin/formularios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: 'Novo formulário', acao: 'nenhuma' }),
      })
      const json = await resp.json()
      if (resp.ok) router.push(`/formularios/${json.id}`)
    } finally {
      setCriando(false)
    }
  }

  function copiarLink(f: FormularioResumo) {
    const url = `${window.location.origin}/f/${f.slug}?t=${f.share_token}`
    navigator.clipboard.writeText(url)
    setCopiado(f.id)
    setTimeout(() => setCopiado((c) => (c === f.id ? null : c)), 2000)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#F5F0E8]">Formulários</h1>
          <p className="text-sm text-[#F5F0E8] mt-1">
            Links nativos para enviar aos pacientes pelo WhatsApp — sem Google Forms.
          </p>
        </div>
        <button
          type="button"
          onClick={criar}
          disabled={criando}
          className="flex items-center gap-2 bg-[#C9A84C] text-[#0A0A0A] font-semibold text-sm rounded-lg px-4 py-2.5 disabled:opacity-60"
        >
          {criando ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Novo
        </button>
      </div>

      <div className="space-y-3">
        {formularios.map((f) => (
          <div
            key={f.id}
            className="bg-[#111111] border border-[#2A2209] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-[#F5F0E8] flex-shrink-0" />
                <span className="text-[#F5F0E8] font-medium truncate">{f.titulo}</span>
                {!f.ativo && (
                  <span className="text-[10px] uppercase tracking-wide bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                    Inativo
                  </span>
                )}
              </div>
              <p className="text-xs text-[#F5F0E8] mt-1">
                {ACAO_LABELS[f.acao]} · {f.total_campos} campos · {f.total_respostas} respostas
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFormularioRespostas(f)}
                className="flex items-center gap-1.5 text-xs text-[#F5F0E8] border border-[#2A2209] rounded-lg px-3 py-2 hover:border-[#C9A84C]/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={f.total_respostas === 0}
              >
                <Table2 size={14} />
                Ver respostas
              </button>
              <button
                type="button"
                onClick={() => copiarLink(f)}
                className="flex items-center gap-1.5 text-xs text-[#F5F0E8] border border-[#2A2209] rounded-lg px-3 py-2 hover:border-[#C9A84C]/50 transition-colors"
              >
                {copiado === f.id ? (
                  <>
                    <Check size={14} className="text-[#F5F0E8]" /> Copiado
                  </>
                ) : (
                  <>
                    <Link2 size={14} /> Copiar link
                  </>
                )}
              </button>
              <Link
                href={`/formularios/${f.id}`}
                className="flex items-center gap-1.5 text-xs text-[#0A0A0A] bg-[#C9A84C]/90 rounded-lg px-3 py-2 hover:bg-[#C9A84C] transition-colors"
              >
                <Pencil size={14} /> Editar
              </Link>
            </div>
          </div>
        ))}

        {formularios.length === 0 && (
          <div className="text-center py-16 text-[#F5F0E8] text-sm">
            Nenhum formulário ainda. Clique em <span className="text-[#F5F0E8]">Novo</span> para começar.
          </div>
        )}
      </div>

      {formularioRespostas && (
        <RespostasModal
          formulario={formularioRespostas}
          onFechar={() => setFormularioRespostas(null)}
        />
      )}
    </div>
  )
}

function RespostasModal({
  formulario,
  onFechar,
}: {
  formulario: FormularioComRespostas
  onFechar: () => void
}) {
  const colunas = formulario.campos.length > 0
    ? formulario.campos.map((campo) => campo.label)
    : coletarColunasDasRespostas(formulario.respostas)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="respostas-modal-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      <button
        type="button"
        aria-label="Fechar"
        onClick={onFechar}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-default"
      />

      <div className="relative w-full max-w-6xl max-h-[88vh] bg-[#0D0D0D] border border-[#2A2209] rounded-xl shadow-2xl flex flex-col">
        <div className="flex items-start justify-between gap-4 p-5 border-b border-[#2A2209]">
          <div>
            <h2
              id="respostas-modal-titulo"
              className="text-base sm:text-lg font-semibold text-[#F5F0E8] tracking-wide"
            >
              {formulario.titulo}
            </h2>
            <p className="text-xs text-[#F5F0E8] mt-1">
              {formulario.total_respostas} respostas recebidas
            </p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="p-1.5 rounded-md text-[#F5F0E8] hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          <table className="min-w-full border-separate border-spacing-0">
            <thead className="sticky top-0 z-10">
              <tr>
                <Th>Recebido em</Th>
                <Th>Nome</Th>
                <Th>E-mail</Th>
                {colunas.map((coluna) => (
                  <Th key={coluna}>{coluna}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {formulario.respostas.map((resposta) => (
                <tr key={resposta.id} className="border-b border-[#2A2209]">
                  <Td>{formatarDataHora(resposta.criado_em)}</Td>
                  <Td>{resposta.nome ?? '-'}</Td>
                  <Td>{resposta.email ?? '-'}</Td>
                  {colunas.map((coluna) => (
                    <Td key={`${resposta.id}-${coluna}`}>
                      <ValorResposta valor={resposta.respostas[coluna]} />
                    </Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {formulario.respostas.length === 0 && (
            <div className="py-12 text-center text-sm text-[#F5F0E8]">
              Nenhuma resposta recebida.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Th({ children }: { children: ReactNode }) {
  return (
    <th className="bg-[#111111] border-b border-[#2A2209] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[#F5F0E8] whitespace-nowrap">
      {children}
    </th>
  )
}

function Td({ children }: { children: ReactNode }) {
  return (
    <td className="border-b border-[#2A2209] px-3 py-2 text-sm text-[#F5F0E8] align-top max-w-[260px]">
      {children}
    </td>
  )
}

function ValorResposta({ valor }: { valor: string | undefined }) {
  if (!valor) return <span className="text-[#F5F0E8]/50">-</span>
  if (/^https?:\/\//.test(valor)) {
    return (
      <a
        href={valor}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#C9A84C] hover:underline whitespace-nowrap"
      >
        Abrir arquivo
      </a>
    )
  }
  return <span className="break-words whitespace-pre-wrap">{valor}</span>
}

function coletarColunasDasRespostas(respostas: RespostaFormulario[]): string[] {
  const colunas = new Set<string>()
  for (const resposta of respostas) {
    for (const pergunta of Object.keys(resposta.respostas)) colunas.add(pergunta)
  }
  return [...colunas]
}

function formatarDataHora(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}
