'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Link2, Check, Pencil, FileText, Loader2 } from 'lucide-react'

import type { FormularioResumo } from '@/types/formulario-builder'
import { ACAO_LABELS } from '@/types/formulario-builder'

export function FormulariosLista({ formularios }: { formularios: FormularioResumo[] }) {
  const router = useRouter()
  const [criando, setCriando] = useState(false)
  const [copiado, setCopiado] = useState<string | null>(null)

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
          <p className="text-sm text-[#8A7A5A] mt-1">
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
              <p className="text-xs text-[#8A7A5A] mt-1">
                {ACAO_LABELS[f.acao]} · {f.total_campos} campos · {f.total_respostas} respostas
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => copiarLink(f)}
                className="flex items-center gap-1.5 text-xs text-[#C9C4BA] border border-[#2A2209] rounded-lg px-3 py-2 hover:border-[#C9A84C]/50 transition-colors"
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
          <div className="text-center py-16 text-[#8A7A5A] text-sm">
            Nenhum formulário ainda. Clique em <span className="text-[#F5F0E8]">Novo</span> para começar.
          </div>
        )}
      </div>
    </div>
  )
}
