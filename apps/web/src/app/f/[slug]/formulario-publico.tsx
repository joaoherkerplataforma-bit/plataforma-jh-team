'use client'

import { useState } from 'react'
import { Camera, Check, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

import type { CampoFormulario } from '@/types/formulario-builder'
import { validarValor } from '@/lib/formulario-schema'

interface Props {
  slug: string
  titulo: string
  descricao: string | null
  campos: CampoFormulario[]
  token: string
}

type Valores = Record<string, unknown>
interface UploadState {
  enviando: boolean
  nome?: string
  erro?: string
}

export function FormularioPublico({ slug, titulo, descricao, campos, token }: Props) {
  const [valores, setValores] = useState<Valores>({})
  const [uploads, setUploads] = useState<Record<string, UploadState>>({})
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [hp, setHp] = useState('') // honeypot

  function setValor(key: string, v: unknown) {
    setValores((prev) => ({ ...prev, [key]: v }))
  }

  async function uploadFoto(campo: CampoFormulario, file: File) {
    setUploads((u) => ({ ...u, [campo.key]: { enviando: true } }))
    try {
      const fd = new FormData()
      fd.append('token', token)
      fd.append('file', file)
      const resp = await fetch(`/api/forms/${slug}/upload`, { method: 'POST', body: fd })
      const json = await resp.json()
      if (!resp.ok) throw new Error(json.error ?? 'Falha no upload')
      setValor(campo.key, json.url)
      setUploads((u) => ({ ...u, [campo.key]: { enviando: false, nome: file.name } }))
    } catch (e) {
      setUploads((u) => ({
        ...u,
        [campo.key]: { enviando: false, erro: e instanceof Error ? e.message : 'Falha no upload' },
      }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)

    if (hp.trim() !== '') return // bot

    // Validacao client-side (servidor revalida)
    for (const campo of campos) {
      const msg = validarValor(campo, valores[campo.key])
      if (msg) {
        setErro(msg)
        return
      }
    }
    if (Object.values(uploads).some((u) => u.enviando)) {
      setErro('Aguarde o envio das fotos terminar.')
      return
    }

    setEnviando(true)
    try {
      const resp = await fetch(`/api/forms/${slug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, valores, hp }),
      })
      const json = await resp.json()
      if (!resp.ok) throw new Error(json.error ?? 'Não foi possível enviar')
      setEnviado(true)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível enviar')
    } finally {
      setEnviando(false)
    }
  }

  if (enviado) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-5">
        <div className="max-w-md w-full text-center py-12">
          <CheckCircle2 size={56} className="text-[#C9A84C] mx-auto mb-5" />
          <p className="font-serif text-[#C9A84C] tracking-[0.25em] text-base mb-4">JH TEAM</p>
          <h1 className="text-[#F5F0E8] text-2xl font-semibold mb-2">Recebido! ✅</h1>
          <p className="text-[#8A7A5A] text-sm leading-relaxed">
            Suas respostas foram enviadas com sucesso. Pode fechar esta página.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] pb-24">
      <div className="max-w-lg mx-auto px-5">
        {/* Cabecalho */}
        <header className="pt-10 pb-6 text-center">
          <p className="font-serif text-[#C9A84C] tracking-[0.25em] text-sm mb-5">JH TEAM</p>
          <h1 className="text-[#F5F0E8] text-2xl font-semibold leading-tight">{titulo}</h1>
          {descricao && (
            <p className="text-[#8A7A5A] text-sm mt-3 leading-relaxed">{descricao}</p>
          )}
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Honeypot oculto */}
          <input
            type="text"
            value={hp}
            onChange={(e) => setHp(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="hidden"
          />

          {campos.map((campo) => (
            <CampoInput
              key={campo.key}
              campo={campo}
              valor={valores[campo.key]}
              upload={uploads[campo.key]}
              onChange={(v) => setValor(campo.key, v)}
              onUpload={(file) => uploadFoto(campo, file)}
            />
          ))}

          {erro && (
            <div className="flex items-start gap-2 bg-red-950/40 border border-red-800/50 rounded-lg p-3 text-red-300 text-sm">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}
        </form>
      </div>

      {/* Barra fixa de envio (mobile-first) */}
      <div className="fixed bottom-0 inset-x-0 bg-[#0A0A0A]/95 backdrop-blur border-t border-[#2A2209] px-5 py-3">
        <div className="max-w-lg mx-auto">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={enviando}
            className="w-full flex items-center justify-center gap-2 bg-[#C9A84C] text-[#0A0A0A] font-semibold text-base rounded-xl py-3.5 active:scale-[0.99] transition-transform disabled:opacity-60"
          >
            {enviando ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Enviando...
              </>
            ) : (
              'Enviar respostas'
            )}
          </button>
        </div>
      </div>
    </main>
  )
}

// =============================================================
// Campo individual
// =============================================================
function CampoInput({
  campo,
  valor,
  upload,
  onChange,
  onUpload,
}: {
  campo: CampoFormulario
  valor: unknown
  upload?: UploadState
  onChange: (v: unknown) => void
  onUpload: (file: File) => void
}) {
  const labelBlock = (
    <div className="mb-2">
      <label className="block text-[#F5F0E8] text-[15px] font-medium leading-snug">
        {campo.label}
        {campo.obrigatorio && <span className="text-[#C9A84C] ml-1">*</span>}
      </label>
      {campo.descricao && <p className="text-[#8A7A5A] text-xs mt-1">{campo.descricao}</p>}
    </div>
  )

  const inputBase =
    'w-full bg-[#141414] border border-[#2A2209] rounded-xl px-4 py-3 text-base text-[#F5F0E8] placeholder-[#5A5040] outline-none focus:border-[#C9A84C]/60 transition-colors'

  return (
    <div>
      {labelBlock}

      {campo.tipo === 'texto_longo' && (
        <textarea
          value={(valor as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className={`${inputBase} resize-y`}
        />
      )}

      {campo.tipo === 'texto_curto' && (
        <input type="text" value={(valor as string) ?? ''} onChange={(e) => onChange(e.target.value)} className={inputBase} />
      )}

      {campo.tipo === 'email' && (
        <input
          type="email"
          inputMode="email"
          autoCapitalize="none"
          value={(valor as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputBase}
        />
      )}

      {campo.tipo === 'telefone' && (
        <input
          type="tel"
          inputMode="tel"
          placeholder="(11) 99999-9999"
          value={(valor as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputBase}
        />
      )}

      {campo.tipo === 'numero' && (
        <input
          type="number"
          inputMode="numeric"
          value={(valor as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputBase}
        />
      )}

      {campo.tipo === 'data' && (
        <input type="date" value={(valor as string) ?? ''} onChange={(e) => onChange(e.target.value)} className={inputBase} />
      )}

      {campo.tipo === 'escolha_unica' && (
        <div className="space-y-2">
          {(campo.opcoes ?? []).map((op) => {
            const selecionado = valor === op
            return (
              <button
                key={op}
                type="button"
                onClick={() => onChange(op)}
                className={`w-full text-left px-4 py-3 rounded-xl border text-[15px] transition-colors flex items-center justify-between ${
                  selecionado
                    ? 'bg-[#1A1500] border-[#C9A84C] text-[#F5F0E8]'
                    : 'bg-[#141414] border-[#2A2209] text-[#C9C4BA] active:border-[#C9A84C]/50'
                }`}
              >
                {op}
                {selecionado && <Check size={18} className="text-[#C9A84C]" />}
              </button>
            )
          })}
        </div>
      )}

      {campo.tipo === 'escolha_multipla' && (
        <div className="space-y-2">
          {(campo.opcoes ?? []).map((op) => {
            const lista = Array.isArray(valor) ? (valor as string[]) : []
            const selecionado = lista.includes(op)
            return (
              <button
                key={op}
                type="button"
                onClick={() =>
                  onChange(selecionado ? lista.filter((x) => x !== op) : [...lista, op])
                }
                className={`w-full text-left px-4 py-3 rounded-xl border text-[15px] transition-colors flex items-center justify-between ${
                  selecionado
                    ? 'bg-[#1A1500] border-[#C9A84C] text-[#F5F0E8]'
                    : 'bg-[#141414] border-[#2A2209] text-[#C9C4BA] active:border-[#C9A84C]/50'
                }`}
              >
                {op}
                {selecionado && <Check size={18} className="text-[#C9A84C]" />}
              </button>
            )
          })}
        </div>
      )}

      {campo.tipo === 'escala_0_10' && (
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-11">
          {Array.from({ length: 11 }, (_, n) => {
            const selecionado = String(valor) === String(n)
            return (
              <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                className={`aspect-square rounded-lg border text-sm font-semibold transition-colors ${
                  selecionado
                    ? 'bg-[#C9A84C] border-[#C9A84C] text-[#0A0A0A]'
                    : 'bg-[#141414] border-[#2A2209] text-[#C9C4BA] active:border-[#C9A84C]/50'
                }`}
              >
                {n}
              </button>
            )
          })}
        </div>
      )}

      {campo.tipo === 'upload_foto' && (
        <label
          className={`flex items-center gap-3 px-4 py-4 rounded-xl border cursor-pointer transition-colors ${
            valor
              ? 'bg-[#1A1500] border-[#C9A84C]/60'
              : 'bg-[#141414] border-dashed border-[#2A2209] active:border-[#C9A84C]/50'
          }`}
        >
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onUpload(f)
            }}
          />
          {upload?.enviando ? (
            <Loader2 size={20} className="text-[#C9A84C] animate-spin flex-shrink-0" />
          ) : valor ? (
            <Check size={20} className="text-[#C9A84C] flex-shrink-0" />
          ) : (
            <Camera size={20} className="text-[#8A7A5A] flex-shrink-0" />
          )}
          <span className="text-sm text-[#C9C4BA] truncate">
            {upload?.enviando
              ? 'Enviando foto...'
              : valor
                ? upload?.nome ?? 'Foto enviada — toque para trocar'
                : 'Tocar para tirar/escolher foto'}
          </span>
        </label>
      )}

      {upload?.erro && <p className="text-red-400 text-xs mt-1.5">{upload.erro}</p>}
    </div>
  )
}
