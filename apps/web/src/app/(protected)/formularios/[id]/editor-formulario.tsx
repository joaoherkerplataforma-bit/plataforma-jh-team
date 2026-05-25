'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Link2,
  Check,
  ExternalLink,
  Loader2,
  Save,
  RefreshCw,
} from 'lucide-react'

import type {
  Formulario,
  CampoFormulario,
  TipoCampo,
  AcaoFormulario,
  MapeiaPara,
} from '@/types/formulario-builder'
import {
  TIPO_CAMPO_LABELS,
  ACAO_LABELS,
  TIPOS_COM_OPCOES,
  MAPEAMENTOS,
  MAPEAMENTO_LABELS,
} from '@/types/formulario-builder'

// key é opcional na edição: o servidor deriva/normaliza a key ao salvar.
interface CampoEdit extends Omit<CampoFormulario, 'key'> {
  _id: string
  key?: string
}

const TIPOS = Object.keys(TIPO_CAMPO_LABELS) as TipoCampo[]
const ACOES = Object.keys(ACAO_LABELS) as AcaoFormulario[]

let uidCounter = 0
const novoUid = () => `c${Date.now()}_${uidCounter++}`

export function EditorFormulario({ form }: { form: Formulario }) {
  const router = useRouter()

  const [titulo, setTitulo] = useState(form.titulo)
  const [descricao, setDescricao] = useState(form.descricao ?? '')
  const [acao, setAcao] = useState<AcaoFormulario>(form.acao)
  const [ativo, setAtivo] = useState(form.ativo)
  const [campos, setCampos] = useState<CampoEdit[]>(
    form.campos.map((c) => ({ ...c, _id: novoUid() }))
  )

  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)
  const [copiado, setCopiado] = useState(false)

  const linkPublico =
    typeof window !== 'undefined'
      ? `${window.location.origin}/f/${form.slug}?t=${form.share_token}`
      : ''

  function patchCampo(id: string, patch: Partial<CampoEdit>) {
    setCampos((cs) => cs.map((c) => (c._id === id ? { ...c, ...patch } : c)))
  }
  function addCampo() {
    setCampos((cs) => [
      ...cs,
      { _id: novoUid(), tipo: 'texto_curto', label: '', obrigatorio: false },
    ])
  }
  function removeCampo(id: string) {
    setCampos((cs) => cs.filter((c) => c._id !== id))
  }
  function mover(id: string, dir: -1 | 1) {
    setCampos((cs) => {
      const i = cs.findIndex((c) => c._id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= cs.length) return cs
      const copia = [...cs]
      ;[copia[i], copia[j]] = [copia[j], copia[i]]
      return copia
    })
  }

  async function salvar() {
    setSalvando(true)
    setErro(null)
    setSalvo(false)
    try {
      const payload = {
        titulo,
        descricao,
        acao,
        ativo,
        campos: campos.map(({ _id, ...c }) => {
          void _id
          return c
        }),
      }
      const resp = await fetch(`/api/admin/formularios/${form.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await resp.json()
      if (!resp.ok) throw new Error(json.error ?? 'Falha ao salvar')
      setSalvo(true)
      router.refresh()
      setTimeout(() => setSalvo(false), 2500)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  async function rotacionarToken() {
    if (!confirm('Gerar um novo link invalida o link antigo. Continuar?')) return
    const resp = await fetch(`/api/admin/formularios/${form.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rotacionar_token: true }),
    })
    // Reload completo para refletir o novo token vindo do servidor.
    if (resp.ok) window.location.reload()
  }

  async function excluir() {
    if (!confirm('Excluir este formulário? As respostas já recebidas são preservadas.')) return
    const resp = await fetch(`/api/admin/formularios/${form.id}`, { method: 'DELETE' })
    if (resp.ok) router.push('/formularios')
  }

  function copiarLink() {
    navigator.clipboard.writeText(linkPublico)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const inputBase =
    'w-full bg-[#141414] border border-[#2A2209] rounded-lg px-3 py-2 text-sm text-[#F5F0E8] outline-none focus:border-[#C9A84C]/60'

  return (
    <div className="max-w-3xl mx-auto pb-24">
      {/* Topo */}
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={() => router.push('/formularios')}
          className="flex items-center gap-1.5 text-sm text-[#8A7A5A] hover:text-[#F5F0E8]"
        >
          <ArrowLeft size={16} /> Formulários
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={excluir}
            className="text-xs text-red-400/80 hover:text-red-400 px-2 py-1"
          >
            Excluir
          </button>
          <button
            type="button"
            onClick={salvar}
            disabled={salvando}
            className="flex items-center gap-2 bg-[#C9A84C] text-[#0A0A0A] font-semibold text-sm rounded-lg px-4 py-2 disabled:opacity-60"
          >
            {salvando ? <Loader2 size={16} className="animate-spin" /> : salvo ? <Check size={16} /> : <Save size={16} />}
            {salvo ? 'Salvo' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Link publico */}
      <div className="bg-[#111111] border border-[#2A2209] rounded-xl p-4 mb-5">
        <p className="text-xs uppercase tracking-wide text-[#8A7A5A] mb-2">Link para o paciente</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <code className="flex-1 text-xs text-[#C9C4BA] bg-[#0A0A0A] border border-[#2A2209] rounded-lg px-3 py-2 truncate">
            {linkPublico}
          </code>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={copiarLink}
              className="flex items-center gap-1.5 text-xs text-[#0A0A0A] bg-[#C9A84C]/90 hover:bg-[#C9A84C] rounded-lg px-3 py-2"
            >
              {copiado ? <Check size={14} /> : <Link2 size={14} />}
              {copiado ? 'Copiado' : 'Copiar'}
            </button>
            <a
              href={linkPublico}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-[#C9C4BA] border border-[#2A2209] rounded-lg px-3 py-2 hover:border-[#C9A84C]/50"
            >
              <ExternalLink size={14} /> Abrir
            </a>
            <button
              type="button"
              onClick={rotacionarToken}
              title="Gerar novo link (invalida o anterior)"
              className="flex items-center gap-1.5 text-xs text-[#8A7A5A] border border-[#2A2209] rounded-lg px-3 py-2 hover:text-[#F5F0E8]"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Meta do formulario */}
      <div className="bg-[#111111] border border-[#2A2209] rounded-xl p-4 mb-5 space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-wide text-[#8A7A5A] mb-1.5">Título</label>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={inputBase} />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wide text-[#8A7A5A] mb-1.5">Descrição</label>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={2}
            className={`${inputBase} resize-y`}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wide text-[#8A7A5A] mb-1.5">Ação no envio</label>
            <select value={acao} onChange={(e) => setAcao(e.target.value as AcaoFormulario)} className={inputBase}>
              {ACOES.map((a) => (
                <option key={a} value={a}>
                  {ACAO_LABELS[a]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-[#C9C4BA] cursor-pointer">
              <input
                type="checkbox"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
                className="accent-[#C9A84C] w-4 h-4"
              />
              Formulário ativo (link funciona)
            </label>
          </div>
        </div>
        {acao !== 'nenhuma' && (
          <p className="text-xs text-[#8A7A5A] bg-[#1A1500]/50 border border-[#2A2209] rounded-lg p-2.5">
            Dica: para esta ação funcionar, mapeie os campos certos (ex.: anamnese precisa de{' '}
            <span className="text-[#F5F0E8]">Nome</span>, <span className="text-[#F5F0E8]">E-mail</span> e{' '}
            <span className="text-[#F5F0E8]">Plano</span>) usando o seletor &quot;Alimenta&quot; em cada campo.
          </p>
        )}
      </div>

      {/* Campos */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[#F5F0E8]">Campos ({campos.length})</h2>
        <button
          type="button"
          onClick={addCampo}
          className="flex items-center gap-1.5 text-xs text-[#F5F0E8] border border-[#C9A84C]/40 rounded-lg px-3 py-1.5 hover:bg-[#1A1500]"
        >
          <Plus size={14} /> Adicionar campo
        </button>
      </div>

      <div className="space-y-3">
        {campos.map((campo, i) => (
          <div key={campo._id} className="bg-[#111111] border border-[#2A2209] rounded-xl p-3">
            <div className="flex items-start gap-2">
              <div className="flex flex-col gap-1 pt-1">
                <button
                  type="button"
                  onClick={() => mover(campo._id, -1)}
                  disabled={i === 0}
                  className="text-[#8A7A5A] hover:text-[#F5F0E8] disabled:opacity-30"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => mover(campo._id, 1)}
                  disabled={i === campos.length - 1}
                  className="text-[#8A7A5A] hover:text-[#F5F0E8] disabled:opacity-30"
                >
                  <ChevronDown size={16} />
                </button>
              </div>

              <div className="flex-1 space-y-2.5">
                <input
                  value={campo.label}
                  onChange={(e) => patchCampo(campo._id, { label: e.target.value })}
                  placeholder="Pergunta / rótulo do campo"
                  className={inputBase}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <select
                    value={campo.tipo}
                    onChange={(e) => patchCampo(campo._id, { tipo: e.target.value as TipoCampo })}
                    className={inputBase}
                  >
                    {TIPOS.map((t) => (
                      <option key={t} value={t}>
                        {TIPO_CAMPO_LABELS[t]}
                      </option>
                    ))}
                  </select>

                  <select
                    value={campo.mapeia_para ?? ''}
                    onChange={(e) =>
                      patchCampo(campo._id, {
                        mapeia_para: e.target.value ? (e.target.value as MapeiaPara) : null,
                      })
                    }
                    className={inputBase}
                  >
                    <option value="">Alimenta: (nada)</option>
                    {MAPEAMENTOS.map((m) => (
                      <option key={m} value={m}>
                        Alimenta: {MAPEAMENTO_LABELS[m]}
                      </option>
                    ))}
                  </select>
                </div>

                {TIPOS_COM_OPCOES.includes(campo.tipo) && (
                  <textarea
                    value={(campo.opcoes ?? []).join('\n')}
                    onChange={(e) =>
                      patchCampo(campo._id, {
                        opcoes: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    rows={3}
                    placeholder="Uma opção por linha"
                    className={`${inputBase} resize-y`}
                  />
                )}

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-[#C9C4BA] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={campo.obrigatorio}
                      onChange={(e) => patchCampo(campo._id, { obrigatorio: e.target.checked })}
                      className="accent-[#C9A84C] w-4 h-4"
                    />
                    Obrigatório
                  </label>
                  <button
                    type="button"
                    onClick={() => removeCampo(campo._id)}
                    className="flex items-center gap-1 text-xs text-red-400/70 hover:text-red-400"
                  >
                    <Trash2 size={14} /> Remover
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {campos.length === 0 && (
          <div className="text-center py-10 text-[#8A7A5A] text-sm border border-dashed border-[#2A2209] rounded-xl">
            Sem campos. Clique em <span className="text-[#F5F0E8]">Adicionar campo</span>.
          </div>
        )}
      </div>

      {erro && (
        <div className="mt-4 bg-red-950/40 border border-red-800/50 rounded-lg p-3 text-red-300 text-sm">
          {erro}
        </div>
      )}
    </div>
  )
}
