const fs = require('node:fs')
const { resolve, dirname } = require('node:path')
const { homedir } = require('node:os')

// ------------------------------------------------------------
// Args
// ------------------------------------------------------------
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')

function argValue(prefix, fallback) {
  const hit = args.find((a) => a.startsWith(prefix))
  return hit ? hit.slice(prefix.length) : fallback
}

const basePath = resolve(
  argValue('--base=', resolve(homedir(), 'Downloads', 'JH-Clientes atualizados.csv'))
)
const retornoPath = resolve(
  argValue('--retorno=', resolve(homedir(), 'Downloads', 'JH - Clientes atualizados - RETORNO DIETA.csv'))
)
const fotosPath = resolve(
  argValue('--fotos=', resolve(homedir(), 'Downloads', 'JH - Clientes atualizados - FOTOS 30 DIAS.csv'))
)
const outPath = resolve(
  argValue('--out=', resolve(dirname(basePath), 'JH-Clientes atualizados-enriquecido.csv'))
)

// ------------------------------------------------------------
// CSV helpers
// ------------------------------------------------------------
function parseCsv(text) {
  const rows = []
  let field = ''
  let row = []
  let inQuotes = false
  const s = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += c
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

function escapeCsv(value) {
  const raw = value == null ? '' : String(value)
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`
  }
  return raw
}

function toCsv(rows) {
  return rows.map((row) => row.map(escapeCsv).join(',')).join('\n') + '\n'
}

function normalizeText(raw) {
  return (raw ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function compactText(raw) {
  return normalizeText(raw).replace(/[^a-z]/g, '')
}

function buildAliases(rawName) {
  const normalized = normalizeText(rawName)
  if (!normalized) return []

  const tokens = normalized.split(' ').filter(Boolean)
  const aliases = new Set()
  const compactFull = compactText(rawName)
  if (compactFull) aliases.add(compactFull)
  if (tokens.length === 0) return [...aliases]

  aliases.add(compactText(tokens[0]))
  if (tokens.length >= 2) {
    aliases.add(compactText(tokens.slice(0, 2).join(' ')))
    aliases.add(compactText(`${tokens[0]} ${tokens[tokens.length - 1]}`))
    aliases.add(
      compactText(`${tokens[0]}${tokens.slice(1).map((token) => token[0] ?? '').join('')}`)
    )
  }
  if (tokens.length >= 3) {
    aliases.add(compactText(tokens.slice(0, 3).join(' ')))
    aliases.add(compactText(`${tokens[0]} ${tokens[1]} ${tokens[tokens.length - 1]}`))
  }

  return [...aliases].filter(Boolean)
}

function cleanCell(raw) {
  return (raw ?? '').replace(/\s+/g, ' ').trim()
}

function parseData(raw) {
  const t = cleanCell(raw)
  if (!t) return ''
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return t
  const [, d, mo, y] = m
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
}

function mapByName(rows, nameIndex = 0, valueMapper) {
  const index = new Map()
  for (const row of rows) {
    const key = normalizeText(row[nameIndex] ?? '')
    if (!key) continue
    index.set(key, valueMapper(row))
  }
  return index
}

// ------------------------------------------------------------
// Input
// ------------------------------------------------------------
function readCsv(path) {
  return parseCsv(fs.readFileSync(path, 'utf8'))
}

function ensureFile(path) {
  if (!fs.existsSync(path)) {
    throw new Error(`Arquivo não encontrado: ${path}`)
  }
}

ensureFile(basePath)
ensureFile(retornoPath)
ensureFile(fotosPath)

const baseRows = readCsv(basePath)
const retornoRows = readCsv(retornoPath)
const fotosRows = readCsv(fotosPath)

const baseHeader = baseRows[0]
const baseBody = baseRows.slice(1)

// ------------------------------------------------------------
// Lookup tables
// ------------------------------------------------------------
const retornoHeader = retornoRows[2]
const retornoBody = retornoRows.slice(3)
const retornoByName = mapByName(retornoBody, 0, (row) => ({
  retorno_dieta_delegacao: cleanCell(row[1]),
  retorno_dieta_data_envio: parseData(row[2]),
  retorno_dieta_data_entrega: parseData(row[3]),
  retorno_dieta_paciente_enviou: cleanCell(row[4]),
  retorno_dieta_feito: cleanCell(row[5]),
  retorno_dieta_entregue: cleanCell(row[6]),
  retorno_dieta_observacoes: cleanCell(row[7]),
}))

const fotosHeader = fotosRows[2]
const fotosBody = fotosRows.slice(3)
const fotosByName = mapByName(fotosBody, 0, (row) => ({
  fotos_30_dias_tipo_retorno: cleanCell(row[1]),
  fotos_30_dias_data_envio: parseData(row[2]),
  fotos_30_dias_data_entrega: parseData(row[3]),
  fotos_30_dias_paciente_enviou: cleanCell(row[4]),
  fotos_30_dias_ja_esta_no_canva: cleanCell(row[5]),
  fotos_30_dias_feedback: cleanCell(row[6]),
  fotos_30_dias_feito: cleanCell(row[7]),
  fotos_30_dias_entregue: cleanCell(row[8]),
  fotos_30_dias_observacoes: cleanCell(row[9]),
}))

// ------------------------------------------------------------
// Merge
// ------------------------------------------------------------
const mergedHeader = [
  ...baseHeader,
  'retorno_dieta_delegacao',
  'retorno_dieta_data_envio',
  'retorno_dieta_data_entrega',
  'retorno_dieta_paciente_enviou',
  'retorno_dieta_feito',
  'retorno_dieta_entregue',
  'retorno_dieta_observacoes',
  'fotos_30_dias_tipo_retorno',
  'fotos_30_dias_data_envio',
  'fotos_30_dias_data_entrega',
  'fotos_30_dias_paciente_enviou',
  'fotos_30_dias_ja_esta_no_canva',
  'fotos_30_dias_feedback',
  'fotos_30_dias_feito',
  'fotos_30_dias_entregue',
  'fotos_30_dias_observacoes',
]

const matchedSummary = {
  retorno: 0,
  fotos: 0,
}

const unmatched = {
  retorno: [],
  fotos: [],
}

const mergedRows = [mergedHeader]

for (const row of baseBody) {
  const nameKey = normalizeText(row[0] ?? '')
  const compactKey = compactText(row[0] ?? '')

  const retorno = retornoByName.get(nameKey) ?? {}
  const fotos = fotosByName.get(nameKey) ?? {}

  if (Object.keys(retorno).length > 0) matchedSummary.retorno++
  if (Object.keys(fotos).length > 0) matchedSummary.fotos++

  mergedRows.push([
    ...row,
    retorno.retorno_dieta_delegacao ?? '',
    retorno.retorno_dieta_data_envio ?? '',
    retorno.retorno_dieta_data_entrega ?? '',
    retorno.retorno_dieta_paciente_enviou ?? '',
    retorno.retorno_dieta_feito ?? '',
    retorno.retorno_dieta_entregue ?? '',
    retorno.retorno_dieta_observacoes ?? '',
    fotos.fotos_30_dias_tipo_retorno ?? '',
    fotos.fotos_30_dias_data_envio ?? '',
    fotos.fotos_30_dias_data_entrega ?? '',
    fotos.fotos_30_dias_paciente_enviou ?? '',
    fotos.fotos_30_dias_ja_esta_no_canva ?? '',
    fotos.fotos_30_dias_feedback ?? '',
    fotos.fotos_30_dias_feito ?? '',
    fotos.fotos_30_dias_entregue ?? '',
    fotos.fotos_30_dias_observacoes ?? '',
  ])
}

for (const row of retornoBody) {
  const nameKey = normalizeText(row[0] ?? '')
  if (!nameKey || !baseBody.some((base) => normalizeText(base[0] ?? '') === nameKey)) {
    unmatched.retorno.push(cleanCell(row[0]))
  }
}

for (const row of fotosBody) {
  const nameKey = normalizeText(row[0] ?? '')
  if (!nameKey || !baseBody.some((base) => normalizeText(base[0] ?? '') === nameKey)) {
    unmatched.fotos.push(cleanCell(row[0]))
  }
}

// ------------------------------------------------------------
// Output
// ------------------------------------------------------------
console.log('=== ENRIQUECIMENTO PACIENTES CSV ===')
console.log(`Base: ${basePath}`)
console.log(`Retorno: ${retornoPath}`)
console.log(`Fotos 30 dias: ${fotosPath}`)
console.log(`Saida: ${outPath}`)
console.log()
console.log(`Base rows: ${baseBody.length}`)
console.log(`Retorno cruzados: ${matchedSummary.retorno}`)
console.log(`Fotos cruzados: ${matchedSummary.fotos}`)
console.log(`Retorno sem cruzamento: ${unmatched.retorno.length}`)
console.log(`Fotos sem cruzamento: ${unmatched.fotos.length}`)

if (dryRun) {
  console.log()
  console.log('Dry-run concluido; nenhum arquivo foi gravado.')
  process.exit(0)
}

fs.writeFileSync(outPath, toCsv(mergedRows), 'utf8')
console.log()
console.log('Arquivo gerado com sucesso.')
