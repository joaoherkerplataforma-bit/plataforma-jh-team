'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ObservacoesInlineProps {
  pacienteId: string
  valor: string | null
}

export function ObservacoesInline({ pacienteId, valor }: ObservacoesInlineProps) {
  const [texto, setTexto] = useState(valor ?? '')
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const salvar = useCallback(async () => {
    setSalvando(true)
    try {
      const supabase = createClient()
      await supabase
        .from('pacientes')
        .update({ observacoes: texto || null })
        .eq('id', pacienteId)
    } catch (error) {
      console.error('Erro ao salvar observacao:', error)
    } finally {
      setSalvando(false)
      setEditando(false)
    }
  }, [pacienteId, texto])

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

  if (editando) {
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
        className="w-full min-w-[120px] bg-[#1A1A1A] border border-gold/30 rounded px-2 py-1 text-sm text-white/80 focus:outline-none focus:border-gold resize-none disabled:opacity-50"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditando(true)}
      className="text-left text-sm text-white/60 hover:text-white/80 cursor-pointer min-w-[80px] transition-colors"
      title="Clique para editar"
    >
      {texto || '-'}
    </button>
  )
}
