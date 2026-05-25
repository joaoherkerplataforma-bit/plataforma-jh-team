/**
 * Importa pacientes a partir de um CSV exportado da planilha de gestão (Google Sheets)
 * para a tabela public.pacientes (aba "Pacientes" do dashboard).
 *
 * Mapeia as colunas da planilha JH para o schema da tabela `pacientes`.
 * Usa service_role (bypassa RLS), exatamente como os scripts de seed.
 *
 * USO (a partir da raiz do repo):
 *   npx tsx scripts/import-pacientes-csv.ts --dry-run
 *       # Apenas parseia + valida + imprime resumo. NÃO conecta no banco.
 *   npx tsx scripts/import-pacientes-csv.ts --yes
 *       # Sincroniza de verdade (atualiza nomes já existentes e insere novos).
 *
 * FLAGS:
 *   --file=<caminho>   CSV de origem (default: ~/Downloads/JH-Clientes atualizados.csv)
 *   --dry-run          Não toca no banco; só valida e imprime o que faria.
 *   --yes / -y         Confirma a inserção sem prompt interativo.
 *   --dup=last|first|all   Como tratar nomes duplicados DENTRO do CSV.
 *                          last (default) = mantém a última ocorrência (renovação mais recente).
 *                          first = mantém a primeira. all = insere todas as linhas.
 *
 * REQUISITOS (modo real):
 *   - .env.local na raiz com NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
 *
 * Idempotência: no modo real, consulta os nomes já existentes em `pacientes`
 * (comparação normalizada), atualiza esses registros e insere os que ainda não existem.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { homedir } from 'node:os'
import { confirmar, criarClienteServiceRole } from './_portal-teste-config'

// ----------------------------------------------------------------------------
// Args
// ----------------------------------------------------------------------------
const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const AUTO_YES = args.includes('--yes') || args.includes('-y')
const fileArg = args.find((a) => a.startsWith('--file='))?.slice('--file='.length)
const dupArg = (args.find((a) => a.startsWith('--dup='))?.slice('--dup='.length) ?? 'last') as
  | 'last'
  | 'first'
  | 'all'

const DEFAULT_CSV = resolve(homedir(), 'Downloads', 'JH-Clientes atualizados.csv')
const CSV_PATH = fileArg ? resolve(fileArg) : DEFAULT_CSV

// ----------------------------------------------------------------------------
// Tipos
// ----------------------------------------------------------------------------
interface PacienteRow {
  nome: string
  tipo_plano: 'dieta' | 'completo'
  duracao_plano: 'trimestral' | 'semestral' | 'anual'
  data_inicio: string // YYYY-MM-DD
  data_vencimento_plano: string // YYYY-MM-DD
  proximo_retorno: string | null
  status: 'ativo' | 'vencido'
  observacoes: string | null
}

interface RowResult {
  linha: number
  paciente?: PacienteRow
  erros: string[]
}

// ----------------------------------------------------------------------------
// CSV parser (state machine — lida com aspas, vírgulas e quebras de linha
// dentro de campos entre aspas, e "" como aspas escapadas)
// ----------------------------------------------------------------------------
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false
  // Normaliza CRLF -> LF
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
    } else {
      if (c === '"') {
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
  }
  // Última célula/linha (se o arquivo não termina com \n)
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

// ----------------------------------------------------------------------------
// Helpers de mapeamento
// ----------------------------------------------------------------------------
function normalizarNome(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim()
}

function normalizarChaveNome(nome: string): string {
  // Para dedupe: minúsculas, sem acentos, espaços colapsados
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function parseData(raw: string): string | null {
  const t = raw.trim()
  if (!t) return null
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const [, d, mo, y] = m
  const dd = d.padStart(2, '0')
  const mm = mo.padStart(2, '0')
  // valida faixas básicas
  const di = Number(dd)
  const mi = Number(mm)
  if (mi < 1 || mi > 12 || di < 1 || di > 31) return null
  return `${y}-${mm}-${dd}`
}

function mapTipoPlano(raw: string): 'dieta' | 'completo' | null {
  const t = raw.trim().toLowerCase()
  if (t === 'completo') return 'completo'
  if (t === 'dieta') return 'dieta'
  return null
}

function mapDuracao(raw: string): 'trimestral' | 'semestral' | 'anual' | null {
  const t = raw.trim().toLowerCase()
  if (t.startsWith('trimestral')) return 'trimestral'
  if (t.startsWith('semestral')) return 'semestral'
  if (t.startsWith('anual')) return 'anual'
  return null
}

function mapStatus(statusPlano: string): 'ativo' | 'vencido' {
  return /vencido/i.test(statusPlano) ? 'vencido' : 'ativo'
}

// ----------------------------------------------------------------------------
// Pipeline de mapeamento
// ----------------------------------------------------------------------------
function mapearLinhas(rows: string[][]): { resultados: RowResult[]; header: string[] } {
  const [header, ...body] = rows
  const resultados: RowResult[] = []

  body.forEach((cols, idx) => {
    const linha = idx + 2 // +1 header, +1 base-1
    // Ignora linhas totalmente vazias
    if (cols.every((c) => c.trim() === '')) return

    const erros: string[] = []
    const nome = normalizarNome(cols[0] ?? '')
    if (!nome) erros.push('nome vazio')

    const proximoRetorno = parseData(cols[2] ?? '')
    const duracao = mapDuracao(cols[5] ?? '')
    if (!duracao) erros.push(`TEMPO DO PLANO inválido: "${(cols[5] ?? '').trim()}"`)

    const tipo = mapTipoPlano(cols[6] ?? '')
    if (!tipo) erros.push(`TIPO DO PLANO inválido: "${(cols[6] ?? '').trim()}"`)

    const vencimento = parseData(cols[7] ?? '')
    if (!vencimento) erros.push(`VENCIMENTO DO PLANO inválido: "${(cols[7] ?? '').trim()}"`)

    const dataInicio = parseData(cols[8] ?? '')
    if (!dataInicio) erros.push(`DATA DE INICIO inválida: "${(cols[8] ?? '').trim()}"`)

    const status = mapStatus(cols[10] ?? '')
    const obsRaw = (cols[11] ?? '').replace(/\s+/g, ' ').trim()
    const observacoes = obsRaw || null

    if (erros.length > 0) {
      resultados.push({ linha, erros })
      return
    }

    resultados.push({
      linha,
      erros: [],
      paciente: {
        nome,
        tipo_plano: tipo!,
        duracao_plano: duracao!,
        data_inicio: dataInicio!,
        data_vencimento_plano: vencimento!,
        proximo_retorno: proximoRetorno,
        status,
        observacoes,
      },
    })
  })

  return { resultados, header }
}

// ----------------------------------------------------------------------------
// Trata duplicados DENTRO do CSV
// ----------------------------------------------------------------------------
function resolverDuplicados(
  validos: { linha: number; paciente: PacienteRow }[],
  modo: 'last' | 'first' | 'all'
): {
  finais: { linha: number; paciente: PacienteRow }[]
  duplicados: { chave: string; linhas: number[]; nomes: string[] }[]
} {
  const grupos = new Map<string, { linha: number; paciente: PacienteRow }[]>()
  for (const v of validos) {
    const k = normalizarChaveNome(v.paciente.nome)
    const arr = grupos.get(k) ?? []
    arr.push(v)
    grupos.set(k, arr)
  }

  const duplicados: { chave: string; linhas: number[]; nomes: string[] }[] = []
  const finais: { linha: number; paciente: PacienteRow }[] = []

  for (const [chave, arr] of grupos) {
    if (arr.length > 1) {
      duplicados.push({
        chave,
        linhas: arr.map((a) => a.linha),
        nomes: arr.map((a) => a.paciente.nome),
      })
    }
    if (modo === 'all' || arr.length === 1) {
      finais.push(...arr)
    } else if (modo === 'first') {
      finais.push(arr[0])
    } else {
      // last
      finais.push(arr[arr.length - 1])
    }
  }

  // Mantém ordem original por linha
  finais.sort((a, b) => a.linha - b.linha)
  return { finais, duplicados }
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------
async function main(): Promise<void> {
  console.log('=== IMPORT PACIENTES CSV ===')
  console.log(`Arquivo: ${CSV_PATH}`)
  console.log(`Modo: ${DRY_RUN ? 'DRY-RUN (não toca no banco)' : 'INSERÇÃO REAL'}`)
  console.log(`Dedupe intra-CSV: ${dupArg}`)
  console.log()

  let texto: string
  try {
    texto = readFileSync(CSV_PATH, 'utf-8')
  } catch (e) {
    console.error(`ERRO: não consegui ler o CSV em ${CSV_PATH}`)
    console.error(e instanceof Error ? e.message : e)
    process.exit(1)
  }

  const rows = parseCsv(texto)
  const { resultados, header } = mapearLinhas(rows)

  console.log(`Header detectado (${header.length} colunas):`)
  console.log(`  ${header.map((h) => h.replace(/\s+/g, ' ').trim()).join(' | ')}`)
  console.log()

  const validos = resultados
    .filter((r) => r.paciente)
    .map((r) => ({ linha: r.linha, paciente: r.paciente! }))
  const invalidos = resultados.filter((r) => !r.paciente)

  const { finais, duplicados } = resolverDuplicados(validos, dupArg)

  // ---- Resumo ----
  const porStatus = finais.reduce(
    (acc, f) => {
      acc[f.paciente.status]++
      return acc
    },
    { ativo: 0, vencido: 0 } as Record<string, number>
  )
  const porDuracao = finais.reduce((acc, f) => {
    acc[f.paciente.duracao_plano] = (acc[f.paciente.duracao_plano] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)
  const porTipo = finais.reduce((acc, f) => {
    acc[f.paciente.tipo_plano] = (acc[f.paciente.tipo_plano] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  console.log('---------------- RESUMO ----------------')
  console.log(`Linhas de dados parseadas:     ${resultados.length}`)
  console.log(`  Válidas:                     ${validos.length}`)
  console.log(`  Inválidas (puladas):         ${invalidos.length}`)
  console.log(`Grupos de nome duplicado:      ${duplicados.length}`)
  console.log(`A inserir (após dedupe '${dupArg}'): ${finais.length}`)
  console.log(`  status ativo:                ${porStatus.ativo}`)
  console.log(`  status vencido:              ${porStatus.vencido}`)
  console.log(`  tipo_plano:                  ${JSON.stringify(porTipo)}`)
  console.log(`  duracao_plano:               ${JSON.stringify(porDuracao)}`)
  console.log()

  if (invalidos.length > 0) {
    console.log('---------------- LINHAS INVÁLIDAS ----------------')
    for (const r of invalidos) {
      console.log(`  linha ${r.linha}: ${r.erros.join('; ')}`)
    }
    console.log()
  }

  if (duplicados.length > 0) {
    console.log('---------------- NOMES DUPLICADOS NO CSV ----------------')
    for (const d of duplicados) {
      console.log(`  "${d.nomes[0]}" — linhas ${d.linhas.join(', ')}`)
    }
    console.log(`  (modo '${dupArg}' aplicado)`)
    console.log()
  }

  // Amostra
  console.log('---------------- AMOSTRA (3 primeiros / 3 últimos) ----------------')
  const amostra = [...finais.slice(0, 3), ...finais.slice(-3)]
  for (const f of amostra) {
    console.log(`  L${f.linha}: ${JSON.stringify(f.paciente)}`)
  }
  console.log()

  if (DRY_RUN) {
    console.log('DRY-RUN concluído. Nada foi inserido.')
    process.exit(0)
  }

  // ---- Inserção real ----
  const supabase = criarClienteServiceRole()
  console.log(`Banco alvo: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`)
  console.log()

  // Idempotência: nomes já existentes
  const { data: existentes, error: errSel } = await supabase
    .from('pacientes')
    .select('id, nome')
  if (errSel) {
    console.error(`ERRO consultando pacientes existentes: ${errSel.message}`)
    process.exit(1)
  }
  const existentesPorNome = new Map<string, { id: string; nome: string }>()
  for (const existente of existentes ?? []) {
    const chave = normalizarChaveNome((existente as { nome: string }).nome)
    if (!existentesPorNome.has(chave)) {
      existentesPorNome.set(chave, existente as { id: string; nome: string })
    }
  }
  console.log(`Pacientes já no banco: ${existentesPorNome.size}`)

  const aAtualizar: { id: string; paciente: PacienteRow }[] = []
  const aInserir: { linha: number; paciente: PacienteRow }[] = []
  for (const f of finais) {
    const existente = existentesPorNome.get(normalizarChaveNome(f.paciente.nome))
    if (existente) {
      aAtualizar.push({ id: existente.id, paciente: f.paciente })
    } else {
      aInserir.push(f)
    }
  }
  console.log(`Existentes a atualizar: ${aAtualizar.length}`)
  console.log(`Novos a inserir:        ${aInserir.length}`)
  console.log()

  if (aAtualizar.length === 0 && aInserir.length === 0) {
    console.log('Nada a sincronizar. Encerrando.')
    process.exit(0)
  }

  const ok = AUTO_YES
    ? true
    : await confirmar(
        `Atualizar ${aAtualizar.length} e inserir ${aInserir.length} pacientes neste banco?`
      )
  if (!ok) {
    console.log('Abortado pelo usuário.')
    process.exit(0)
  }

  const BATCH = 100
  let atualizados = 0
  for (let i = 0; i < aAtualizar.length; i += BATCH) {
    const lote = aAtualizar.slice(i, i + BATCH).map((f) => ({
      id: f.id,
      ...f.paciente,
    }))
    const { error } = await supabase.from('pacientes').upsert(lote, { onConflict: 'id' })
    if (error) {
      console.error(`ERRO atualizando lote ${i / BATCH + 1}: ${error.message}`)
      console.error(`Atualizados antes da falha: ${atualizados}`)
      process.exit(1)
    }
    atualizados += lote.length
    console.log(
      `  lote atualização ${Math.floor(i / BATCH) + 1}: +${lote.length} (total ${atualizados})`
    )
  }

  let inseridos = 0
  for (let i = 0; i < aInserir.length; i += BATCH) {
    const lote = aInserir.slice(i, i + BATCH).map((f) => f.paciente)
    const { error } = await supabase.from('pacientes').insert(lote)
    if (error) {
      console.error(`ERRO no lote ${i / BATCH + 1}: ${error.message}`)
      console.error(`Inseridos antes da falha: ${inseridos}`)
      process.exit(1)
    }
    inseridos += lote.length
    console.log(`  lote ${Math.floor(i / BATCH) + 1}: +${lote.length} (total ${inseridos})`)
  }

  console.log()
  console.log('=== IMPORT CONCLUÍDO ===')
  console.log(`Atualizados: ${atualizados}`)
  console.log(`Inseridos: ${inseridos}`)
  process.exit(0)
}

main().catch((err) => {
  console.error('FALHA NO IMPORT:', err instanceof Error ? err.message : err)
  process.exit(1)
})
