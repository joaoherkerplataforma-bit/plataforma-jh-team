import { readFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

import { parseDadosRaw } from '@/lib/formularios'
import type { FormularioRecebido, PerguntaResposta } from '@/types/formularios'

type FotoTipo = 'frente' | 'lado' | 'costas'

type FotosFormulario = Record<FotoTipo, string>

interface Slot {
  input: Buffer
  left: number
  top: number
  width: number
  height: number
}

const TEMPLATE_PATH = path.join(
  process.cwd(),
  'src/assets/fotos-antes-depois-template.png',
)

const SLOTS: Record<`${'antes' | 'depois'}_${FotoTipo}`, Omit<Slot, 'input'>> = {
  antes_frente: { left: 115, top: 397, width: 386, height: 384 },
  depois_frente: { left: 581, top: 397, width: 386, height: 384 },
  antes_lado: { left: 126, top: 865, width: 382, height: 380 },
  depois_lado: { left: 592, top: 865, width: 382, height: 380 },
  antes_costas: { left: 124, top: 1333, width: 382, height: 382 },
  depois_costas: { left: 574, top: 1333, width: 382, height: 382 },
}

const MAX_IMAGE_BYTES = 30 * 1024 * 1024

export class MontagemFotosError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
  }
}

export async function gerarMontagemFotos(
  fotosIniciais: FormularioRecebido,
  fotosRetorno: FormularioRecebido,
): Promise<Buffer> {
  const antes = extrairFotosObrigatorias(fotosIniciais, 'Fotos Iniciais')
  const depois = extrairFotosObrigatorias(fotosRetorno, 'Fotos 30 dias')

  const template = await readFile(TEMPLATE_PATH)
  const composites: Slot[] = []

  for (const tipo of ['frente', 'lado', 'costas'] as const) {
    composites.push({
      ...(SLOTS[`antes_${tipo}`] as Omit<Slot, 'input'>),
      input: await prepararFoto(antes[tipo], SLOTS[`antes_${tipo}`]),
    })
    composites.push({
      ...(SLOTS[`depois_${tipo}`] as Omit<Slot, 'input'>),
      input: await prepararFoto(depois[tipo], SLOTS[`depois_${tipo}`]),
    })
  }

  return sharp(template)
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toBuffer()
}

export interface AjusteImagem {
  y: number
  zoom: number
}

export type IdAjuste = `antes_${FotoTipo}` | `depois_${FotoTipo}`

export type AjustesMontagem = Record<IdAjuste, AjusteImagem>

export async function gerarMontagemFotosComAjustes(
  fotosIniciais: FormularioRecebido,
  fotosRetorno: FormularioRecebido,
  ajustes: AjustesMontagem,
): Promise<Buffer> {
  const antes = extrairFotosObrigatorias(fotosIniciais, 'Fotos Iniciais')
  const depois = extrairFotosObrigatorias(fotosRetorno, 'Fotos 30 dias')

  const template = await readFile(TEMPLATE_PATH)
  const composites: Slot[] = []

  for (const tipo of ['frente', 'lado', 'costas'] as const) {
    const antesKey = `antes_${tipo}` as IdAjuste
    const depoisKey = `depois_${tipo}` as IdAjuste
    const adjAntes = ajustes[antesKey] ?? { y: 0, zoom: 1 }
    const adjDepois = ajustes[depoisKey] ?? { y: 0, zoom: 1 }

    composites.push({
      ...SLOTS[antesKey],
      input: await prepararFotoComAjustes(antes[tipo], SLOTS[antesKey], adjAntes),
    })
    composites.push({
      ...SLOTS[depoisKey],
      input: await prepararFotoComAjustes(depois[tipo], SLOTS[depoisKey], adjDepois),
    })
  }

  return sharp(template)
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toBuffer()
}

function extrairFotosObrigatorias(
  formulario: FormularioRecebido,
  nomeFormulario: string,
): FotosFormulario {
  const respostas = parseDadosRaw(formulario.dados_raw)
  const fotos: Partial<FotosFormulario> = {}

  for (const tipo of ['frente', 'lado', 'costas'] as const) {
    const resposta = buscarRespostaFoto(respostas, tipo)
    if (!resposta) {
      throw new MontagemFotosError(
        `${nomeFormulario}: foto de ${tipo} não encontrada.`,
        422,
      )
    }
    fotos[tipo] = resposta
  }

  return fotos as FotosFormulario
}

function buscarRespostaFoto(
  respostas: PerguntaResposta[],
  tipo: FotoTipo,
): string | null {
  const resposta = respostas.find((item) => {
    const pergunta = normalizar(item.pergunta)
    if (tipo === 'frente') return pergunta.includes('frente')
    if (tipo === 'lado') return pergunta.includes('lado') || pergunta.includes('lateral')
    return pergunta.includes('costas')
  })?.resposta

  return resposta && resposta.trim() ? resposta.trim() : null
}

function normalizar(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

async function prepararFoto(
  url: string,
  slot: Omit<Slot, 'input'>,
): Promise<Buffer> {
  const imagem = await baixarImagem(url)

  return sharp(imagem)
    .rotate()
    .resize({
      width: slot.width,
      height: slot.height,
      fit: 'cover',
      position: 'top',
    })
    .png()
    .toBuffer()
}

async function prepararFotoComAjustes(
  url: string,
  slot: Omit<Slot, 'input'>,
  ajustes: AjusteImagem,
): Promise<Buffer> {
  if (ajustes.zoom <= 1 && ajustes.y === 0) {
    return prepararFoto(url, slot)
  }

  const imagem = await baixarImagem(url)
  const meta = await sharp(imagem).metadata()
  const imgW = meta.width!
  const imgH = meta.height!

  const { width: slotW, height: slotH } = slot
  const zoom = ajustes.zoom
  const y = ajustes.y

  const escala = (zoom * slotW) / imgW
  const visivelW = Math.round(slotW / escala)
  const visivelH = Math.round(slotH / escala)
  const yOrig = Math.round(y / escala)
  const extractLeft = Math.round((imgW - visivelW) / 2)
  const extractTop = Math.round((imgH - visivelH) / 2 - yOrig)

  const clampedLeft = Math.max(0, Math.min(extractLeft, imgW - visivelW))
  const clampedTop = Math.max(0, Math.min(extractTop, imgH - visivelH))
  const clampedW = Math.min(visivelW, imgW - clampedLeft)
  const clampedH = Math.min(visivelH, imgH - clampedTop)

  if (clampedW <= 0 || clampedH <= 0) {
    return prepararFoto(url, slot)
  }

  return sharp(imagem)
    .rotate()
    .extract({ left: clampedLeft, top: clampedTop, width: clampedW, height: clampedH })
    .resize(slotW, slotH, { fit: 'fill' })
    .png()
    .toBuffer()
}

async function baixarImagem(url: string): Promise<Buffer> {
  const urlFinal = normalizarUrlGoogleDrive(url)
  const response = await fetch(urlFinal, {
    redirect: 'follow',
    headers: {
      'user-agent': 'JH-Team/1.0',
      accept: 'image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new MontagemFotosError(
      `Não foi possível baixar uma das fotos (${response.status}).`,
      502,
    )
  }

  const contentLength = Number(response.headers.get('content-length') ?? 0)
  if (contentLength > MAX_IMAGE_BYTES) {
    throw new MontagemFotosError('Uma das fotos excede 30 MB.', 413)
  }

  const arrayBuffer = await response.arrayBuffer()
  if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) {
    throw new MontagemFotosError('Uma das fotos excede 30 MB.', 413)
  }

  return Buffer.from(arrayBuffer)
}

function normalizarUrlGoogleDrive(url: string): string {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new MontagemFotosError('URL de foto inválida.', 422)
  }

  if (parsed.hostname !== 'drive.google.com') return url

  const idParam = parsed.searchParams.get('id')
  const fileMatch = parsed.pathname.match(/\/file\/d\/([^/]+)/)
  const id = idParam ?? fileMatch?.[1]

  if (!id) return url
  return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`
}
