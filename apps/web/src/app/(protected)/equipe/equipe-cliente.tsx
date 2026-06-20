'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  UserPlus,
  Loader2,
  Copy,
  Check,
  KeyRound,
  Power,
  X,
  ShieldCheck,
  Lock,
} from 'lucide-react'

export interface MembroEquipe {
  id: string
  nome: string
  email: string
  perfil: 'joao_admin' | 'pablo' | 'joao_estagiario'
  ativo: boolean
}

const PERFIL_LABEL: Record<MembroEquipe['perfil'], string> = {
  joao_admin: 'Admin',
  pablo: 'Pablo',
  joao_estagiario: 'Estagiário',
}

const PERFIS_NOVOS: { valor: MembroEquipe['perfil']; label: string }[] = [
  { valor: 'pablo', label: 'Pablo (Módulos B, C, D)' },
  { valor: 'joao_estagiario', label: 'Estagiário (Módulo B)' },
  { valor: 'joao_admin', label: 'Admin (acesso total)' },
]

interface Credencial {
  nome: string
  email: string
  senha: string
}

export function EquipeCliente({
  membros,
  currentUserId,
  ehAdmin,
}: {
  membros: MembroEquipe[]
  currentUserId: string
  ehAdmin: boolean
}) {
  const router = useRouter()
  const [modalAberto, setModalAberto] = useState(false)
  const [credencial, setCredencial] = useState<Credencial | null>(null)
  const [acaoEmCurso, setAcaoEmCurso] = useState<string | null>(null)
  const [resetSenhaId, setResetSenhaId] = useState<string | null>(null)

  const exibidos = ehAdmin ? membros : membros.filter((m) => m.id === currentUserId)

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#F5F0E8]">Equipe</h1>
          <p className="text-sm text-[#F5F0E8] mt-1">
            {ehAdmin
              ? 'Adicione Pablo e o Estagiário. Eles recebem e-mail + senha temporária para acessar.'
              : 'Gerencie sua senha de acesso.'}
          </p>
        </div>
        {ehAdmin && (
          <button
            type="button"
            onClick={() => setModalAberto(true)}
            className="flex items-center gap-2 bg-[#C9A84C] text-[#0A0A0A] font-semibold text-sm rounded-lg px-4 py-2.5"
          >
            <UserPlus size={16} /> Adicionar
          </button>
        )}
      </div>

      <div className="space-y-2">
        {exibidos.map((m) => (
          <MembroRow
            key={m.id}
            membro={m}
            ehVoceMesmo={m.id === currentUserId}
            ocupado={acaoEmCurso === m.id}
            onReset={() => resetarSenha(m)}
            onToggle={() => toggleAtivo(m)}
            onRedefinir={() => setResetSenhaId(m.id)}
          />
        ))}
      </div>

      {modalAberto && (
        <ModalAdicionar
          onClose={() => setModalAberto(false)}
          onCriado={(c) => {
            setModalAberto(false)
            setCredencial(c)
            router.refresh()
          }}
        />
      )}

      {credencial && (
        <ModalCredencial credencial={credencial} onClose={() => setCredencial(null)} />
      )}

      {resetSenhaId && (
        <ModalRedefinirSenha
          key={resetSenhaId}
          membro={membros.find((m) => m.id === resetSenhaId)!}
          onClose={() => setResetSenhaId(null)}
          onSucesso={() => {
            setResetSenhaId(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )

  async function resetarSenha(m: MembroEquipe) {
    if (!confirm(`Gerar nova senha temporária para ${m.nome}?`)) return
    setAcaoEmCurso(m.id)
    try {
      const resp = await fetch(`/api/admin/equipe/${m.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset_senha: true }),
      })
      const json = await resp.json()
      if (resp.ok) {
        setCredencial({ nome: m.nome, email: m.email, senha: json.senha_temporaria })
      } else {
        alert(json.error ?? 'Falha ao redefinir senha')
      }
    } finally {
      setAcaoEmCurso(null)
    }
  }

  async function toggleAtivo(m: MembroEquipe) {
    setAcaoEmCurso(m.id)
    try {
      const resp = await fetch(`/api/admin/equipe/${m.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !m.ativo }),
      })
      const json = await resp.json()
      if (resp.ok) router.refresh()
      else alert(json.error ?? 'Falha ao atualizar')
    } finally {
      setAcaoEmCurso(null)
    }
  }
}

function MembroRow({
  membro,
  ehVoceMesmo,
  ocupado,
  onReset,
  onToggle,
  onRedefinir,
}: {
  membro: MembroEquipe
  ehVoceMesmo: boolean
  ocupado: boolean
  onReset: () => void
  onToggle: () => void
  onRedefinir: () => void
}) {
  return (
    <div className="bg-[#111111] border border-[#2A2209] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[#F5F0E8] font-medium truncate">{membro.nome}</span>
          <span className="text-[10px] uppercase tracking-wide bg-[#1A1500] text-[#F5F0E8] border border-[#C9A84C]/30 px-1.5 py-0.5 rounded">
            {PERFIL_LABEL[membro.perfil]}
          </span>
          {!membro.ativo && (
            <span className="text-[10px] uppercase tracking-wide bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
              Inativo
            </span>
          )}
        </div>
        <p className="text-xs text-[#F5F0E8] mt-1 truncate">{membro.email}</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onRedefinir}
          disabled={ocupado}
          className="flex items-center gap-1.5 text-xs text-[#F5F0E8] border border-[#2A2209] rounded-lg px-3 py-2 hover:border-[#C9A84C]/50 disabled:opacity-50"
        >
          {ocupado ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
          Redefinir senha
        </button>
        {ehVoceMesmo && (
          <button
            type="button"
            onClick={onReset}
            disabled={ocupado}
            className="flex items-center gap-1.5 text-xs text-[#F5F0E8] border border-[#2A2209] rounded-lg px-3 py-2 hover:border-[#C9A84C]/50 disabled:opacity-50"
          >
            {ocupado ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
            Nova senha
          </button>
        )}
        {!ehVoceMesmo && (
          <button
            type="button"
            onClick={onToggle}
            disabled={ocupado}
            className={`flex items-center gap-1.5 text-xs rounded-lg px-3 py-2 border disabled:opacity-50 ${
              membro.ativo
                ? 'text-red-400/80 border-red-900/40 hover:border-red-700/60'
                : 'text-green-400/80 border-green-900/40 hover:border-green-700/60'
            }`}
          >
            <Power size={14} /> {membro.ativo ? 'Desativar' : 'Reativar'}
          </button>
        )}
      </div>
    </div>
  )
}

function ModalRedefinirSenha({
  membro,
  onClose,
  onSucesso,
}: {
  membro: MembroEquipe
  onClose: () => void
  onSucesso: () => void
}) {
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)

  const inputBase =
    'w-full bg-[#141414] border border-[#2A2209] rounded-lg px-3 py-2.5 text-sm text-[#F5F0E8] outline-none focus:border-[#C9A84C]/60'

  async function salvar() {
    setErro(null)
    if (senha.length < 6) {
      setErro('A senha deve ter no mínimo 6 caracteres')
      return
    }
    if (senha !== confirmacao) {
      setErro('As senhas não conferem')
      return
    }
    setSalvando(true)
    try {
      const resp = await fetch('/api/auth/redefinir-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha }),
      })
      const json = await resp.json()
      if (!resp.ok) throw new Error(json.error ?? 'Falha ao redefinir senha')
      setSucesso(true)
      setTimeout(onSucesso, 1500)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao redefinir senha')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Overlay onClose={onClose}>
      <h2 className="text-lg font-semibold text-[#F5F0E8] mb-1 flex items-center gap-2">
        <Lock size={18} className="text-[#F5F0E8]" /> Redefinir senha
      </h2>
      <p className="text-xs text-[#F5F0E8] mb-4">
        {membro.nome} — {membro.email}
      </p>

      {sucesso ? (
        <div className="text-center py-6">
          <Check size={40} className="mx-auto text-green-400 mb-3" />
          <p className="text-[#F5F0E8] font-medium">Senha redefinida com sucesso!</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-xs uppercase tracking-wide text-[#F5F0E8] mb-1.5">
              Nova senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className={inputBase}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-[#F5F0E8] mb-1.5">
              Confirmar nova senha
            </label>
            <input
              type="password"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              className={inputBase}
            />
          </div>
          {erro && <p className="text-red-400 text-sm">{erro}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-[#F5F0E8] px-4 py-2 hover:text-[#F5F0E8]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={salvar}
              disabled={salvando}
              className="flex items-center gap-2 bg-[#C9A84C] text-[#0A0A0A] font-semibold text-sm rounded-lg px-4 py-2 disabled:opacity-60"
            >
              {salvando ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
              Salvar nova senha
            </button>
          </div>
        </div>
      )}
    </Overlay>
  )
}

function ModalAdicionar({
  onClose,
  onCriado,
}: {
  onClose: () => void
  onCriado: (c: Credencial) => void
}) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [perfil, setPerfil] = useState<MembroEquipe['perfil']>('pablo')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const inputBase =
    'w-full bg-[#141414] border border-[#2A2209] rounded-lg px-3 py-2.5 text-sm text-[#F5F0E8] outline-none focus:border-[#C9A84C]/60'

  async function salvar() {
    setErro(null)
    setSalvando(true)
    try {
      const resp = await fetch('/api/admin/equipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, perfil }),
      })
      const json = await resp.json()
      if (!resp.ok) throw new Error(json.error ?? 'Falha ao criar membro')
      onCriado({ nome: json.nome, email: json.email, senha: json.senha_temporaria })
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao criar membro')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Overlay onClose={onClose}>
      <h2 className="text-lg font-semibold text-[#F5F0E8] mb-4 flex items-center gap-2">
        <UserPlus size={18} className="text-[#F5F0E8]" /> Adicionar membro
      </h2>
      <div className="space-y-3">
        <div>
          <label className="block text-xs uppercase tracking-wide text-[#F5F0E8] mb-1.5">Nome</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)} className={inputBase} />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wide text-[#F5F0E8] mb-1.5">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputBase}
            autoCapitalize="none"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wide text-[#F5F0E8] mb-1.5">Perfil</label>
          <select
            value={perfil}
            onChange={(e) => setPerfil(e.target.value as MembroEquipe['perfil'])}
            className={inputBase}
          >
            {PERFIS_NOVOS.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        {erro && <p className="text-red-400 text-sm">{erro}</p>}
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button type="button" onClick={onClose} className="text-sm text-[#F5F0E8] px-4 py-2 hover:text-[#F5F0E8]">
          Cancelar
        </button>
        <button
          type="button"
          onClick={salvar}
          disabled={salvando}
          className="flex items-center gap-2 bg-[#C9A84C] text-[#0A0A0A] font-semibold text-sm rounded-lg px-4 py-2 disabled:opacity-60"
        >
          {salvando ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
          Criar e gerar senha
        </button>
      </div>
    </Overlay>
  )
}

function ModalCredencial({ credencial, onClose }: { credencial: Credencial; onClose: () => void }) {
  const [copiado, setCopiado] = useState(false)
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const loginUrl = `${origin}/login`
  const mensagem = `Olá, ${credencial.nome}! Seu acesso à plataforma JH TEAM:\n\nLink: ${loginUrl}\nE-mail: ${credencial.email}\nSenha temporária: ${credencial.senha}\n\nTroque a senha após o primeiro acesso.`

  function copiar() {
    navigator.clipboard.writeText(mensagem)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <Overlay onClose={onClose}>
      <h2 className="text-lg font-semibold text-[#F5F0E8] mb-1 flex items-center gap-2">
        <ShieldCheck size={18} className="text-[#F5F0E8]" /> Acesso criado
      </h2>
      <p className="text-xs text-[#F5F0E8] mb-4">
        Copie e envie a mensagem abaixo (WhatsApp/e-mail). A senha não será mostrada de novo.
      </p>

      <div className="bg-[#0A0A0A] border border-[#2A2209] rounded-lg p-3 space-y-1.5 text-sm">
        <Linha label="Link" valor={loginUrl} />
        <Linha label="E-mail" valor={credencial.email} />
        <Linha label="Senha temporária" valor={credencial.senha} destaque />
      </div>

      <button
        type="button"
        onClick={copiar}
        className="w-full mt-4 flex items-center justify-center gap-2 bg-[#C9A84C] text-[#0A0A0A] font-semibold text-sm rounded-lg py-2.5"
      >
        {copiado ? <Check size={16} /> : <Copy size={16} />}
        {copiado ? 'Mensagem copiada' : 'Copiar mensagem pronta'}
      </button>
      <button type="button" onClick={onClose} className="w-full mt-2 text-sm text-[#F5F0E8] py-2 hover:text-[#F5F0E8]">
        Fechar
      </button>
    </Overlay>
  )
}

function Linha({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[#F5F0E8] text-xs">{label}</span>
      <span className={`truncate ${destaque ? 'text-[#F5F0E8] font-mono font-semibold' : 'text-[#F5F0E8]'}`}>
        {valor}
      </span>
    </div>
  )
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4" onClick={onClose}>
      <div
        className="bg-[#111111] border border-[#2A2209] rounded-2xl p-5 w-full max-w-md relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-[#F5F0E8] hover:text-[#F5F0E8]"
        >
          <X size={18} />
        </button>
        {children}
      </div>
    </div>
  )
}
