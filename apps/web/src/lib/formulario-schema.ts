// =============================================================
// Validacao e normalizacao de definicoes de formulario e submissoes.
// Usado tanto no envio publico quanto no salvamento do builder.
// =============================================================

import type {
  CampoFormulario,
  TipoCampo,
  MapeiaPara,
} from '@/types/formulario-builder'
import { TIPOS_COM_OPCOES, MAPEAMENTOS } from '@/types/formulario-builder'

const TIPOS_VALIDOS: readonly TipoCampo[] = [
  'texto_curto',
  'texto_longo',
  'email',
  'telefone',
  'escolha_unica',
  'escolha_multipla',
  'escala_0_10',
  'numero',
  'data',
  'upload_foto',
]

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Combining diacritical marks (U+0300–U+036F) — via constructor para evitar
// caracteres combinantes literais no fonte.
const DIACRITICOS_REGEX = new RegExp('[\\u0300-\\u036f]', 'g')

/** Gera um slug a partir de um texto livre (titulo do form, label do campo). */
export function slugify(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(DIACRITICOS_REGEX, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/**
 * Valida e normaliza um array de campos vindo do builder.
 * Retorna { campos } normalizados ou { erro } com a primeira inconsistencia.
 */
export function normalizarCampos(
  entrada: unknown
): { campos: CampoFormulario[]; erro?: undefined } | { campos?: undefined; erro: string } {
  if (!Array.isArray(entrada)) return { erro: 'campos deve ser uma lista' }
  if (entrada.length === 0) return { erro: 'O formulário precisa de pelo menos um campo' }

  const campos: CampoFormulario[] = []
  const keysVistas = new Set<string>()

  for (let i = 0; i < entrada.length; i++) {
    const raw = entrada[i] as Record<string, unknown>
    if (!raw || typeof raw !== 'object') return { erro: `Campo ${i + 1} inválido` }

    const label = typeof raw.label === 'string' ? raw.label.trim() : ''
    if (!label) return { erro: `Campo ${i + 1}: rótulo obrigatório` }

    const tipo = raw.tipo as TipoCampo
    if (!TIPOS_VALIDOS.includes(tipo)) return { erro: `Campo "${label}": tipo inválido` }

    // key estavel: usa a fornecida ou deriva do label; garante unicidade
    let key = typeof raw.key === 'string' && raw.key.trim() ? slugify(raw.key) : slugify(label)
    if (!key) key = `campo_${i + 1}`
    let keyFinal = key
    let n = 2
    while (keysVistas.has(keyFinal)) keyFinal = `${key}_${n++}`
    keysVistas.add(keyFinal)

    const campo: CampoFormulario = {
      key: keyFinal,
      tipo,
      label,
      obrigatorio: raw.obrigatorio === true,
    }

    if (typeof raw.descricao === 'string' && raw.descricao.trim()) {
      campo.descricao = raw.descricao.trim()
    }

    if (TIPOS_COM_OPCOES.includes(tipo)) {
      const opcoes = Array.isArray(raw.opcoes)
        ? raw.opcoes.map((o) => String(o).trim()).filter(Boolean)
        : []
      if (opcoes.length === 0) return { erro: `Campo "${label}": adicione ao menos uma opção` }
      campo.opcoes = opcoes
    }

    if (raw.mapeia_para && MAPEAMENTOS.includes(raw.mapeia_para as MapeiaPara)) {
      campo.mapeia_para = raw.mapeia_para as MapeiaPara
    }

    campos.push(campo)
  }

  return { campos }
}

/**
 * Valida UM valor submetido contra a definicao do campo.
 * Retorna mensagem de erro (string) ou null se valido.
 */
export function validarValor(campo: CampoFormulario, valor: unknown): string | null {
  const vazio =
    valor === undefined ||
    valor === null ||
    (typeof valor === 'string' && valor.trim() === '') ||
    (Array.isArray(valor) && valor.length === 0)

  if (vazio) {
    return campo.obrigatorio ? `"${campo.label}" é obrigatório` : null
  }

  switch (campo.tipo) {
    case 'email':
      if (typeof valor !== 'string' || !EMAIL_REGEX.test(valor.trim())) {
        return `"${campo.label}": e-mail inválido`
      }
      break
    case 'escala_0_10':
    case 'numero': {
      const num = Number(valor)
      if (Number.isNaN(num)) return `"${campo.label}": informe um número`
      if (campo.tipo === 'escala_0_10' && (num < 0 || num > 10)) {
        return `"${campo.label}": use uma nota de 0 a 10`
      }
      break
    }
    case 'escolha_unica':
      if (typeof valor !== 'string' || !(campo.opcoes ?? []).includes(valor)) {
        return `"${campo.label}": opção inválida`
      }
      break
    case 'escolha_multipla': {
      const arr = Array.isArray(valor) ? valor : [valor]
      const opcoes = campo.opcoes ?? []
      if (!arr.every((v) => opcoes.includes(String(v)))) {
        return `"${campo.label}": opção inválida`
      }
      break
    }
    case 'upload_foto':
      if (typeof valor !== 'string' || !/^https?:\/\//.test(valor)) {
        return `"${campo.label}": envie a foto antes de enviar o formulário`
      }
      break
    default:
      break
  }

  return null
}

/** Converte o valor submetido em string legivel (para `respostas[].resposta`). */
export function valorParaString(valor: unknown): string {
  if (valor === undefined || valor === null) return ''
  if (Array.isArray(valor)) return valor.map((v) => String(v)).join(', ')
  return String(valor)
}
