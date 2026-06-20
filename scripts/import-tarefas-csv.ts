/**
 * Importa tarefas a partir de 3 CSVs exportados da planilha de gestão
 * para a tabela public.tarefas.
 *
 * Mapeamento:
 *   MAIO NOVAS DIETAS → Módulo B (Pendências/Protocolo Novo)
 *   FOTOS 30 DIAS     → Módulo C (Fotos Antes/Depois)
 *   RETORNO DIETA     → Módulo D (Retorno Dietético)
 *
 * USO:
 *   npx tsx scripts/import-tarefas-csv.ts --dry-run
 *   npx tsx scripts/import-tarefas-csv.ts --yes
 *
 * FLAGS:
 *   --dry-run        Valida apenas, não toca no banco
 *   --yes / -y       Confirma inserção sem prompt
 *   --clear          Remove tarefas importadas (marcadas com tag [IMPORT])
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { homedir } from 'node:os'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const DOWNLOADS = homedir() + '/Downloads'
const CSV_NOVAS_DIETAS = resolve(DOWNLOADS, 'JH - Clientes atualizados - MAIO NOVAS DIETAS.csv')
const CSV_FOTOS_30_DIAS = resolve(DOWNLOADS, 'JH - Clientes atualizados - FOTOS 30 DIAS.csv')
const CSV_RETORNO_DIETA = resolve(DOWNLOADS, 'JH - Clientes atualizados - RETORNO DIETA.csv')

const MAPA_MODULOS = {
  'MAIO NOVAS DIETAS': { modulo: 'B', label: 'Novas Dietas' },
  'FOTOS 30 DIAS': { modulo: 'C', label: 'Fotos 30 Dias' },
  'RETORNO DIETA': { modulo: 'D', label: 'Retorno Dieta' },
} as const

type SheetName = keyof typeof MAPA_MODULOS

const IMPORT_TAG = '[IMPORT]'

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false
  const s = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inQuotes) {
      if (c === '"') { if (s[i + 1] === '"') { field += '"'; i++ } else inQuotes = false }
      else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else field += c
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }
  return rows
}

function limpar(s: string): string { return s.replace(/\s+/g, ' ').trim() }

function normalizarNome(s: string): string {
  return limpar(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function parseData(raw: string): string | null {
  const t = limpar(raw)
  if (!t) return null
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const [, d, mo, y] = m
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
}

function parseBool(val: string | undefined | null): boolean | null {
  if (!val) return null
  const t = limpar(val).toLowerCase()
  if (t === 'true' || t === 'verdadeiro' || t === 'sim' || t === '1') return true
  if (t === 'false' || t === 'falso' || t === 'nao' || t === 'não' || t === '0') return false
  return null
}

function mapStatus(entregue: boolean | null, feito: boolean | null): string {
  if (entregue === true) return 'entregue'
  if (feito === true) return 'feito'
  return 'pendente'
}

function fmtObs(parts: string[]): string | null {
  const filtered = parts.filter(Boolean)
  return filtered.length > 0 ? filtered.join(' | ') : null
}

function addDias(data: string, dias: number): string {
  const d = new Date(data + 'T00:00:00')
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}

interface RowData {
  sheet: SheetName
  linha: number
  nome: string
  email: string | null
  responsavelNome: string | null
  tipoPlano: string | null
  tipoRetorno: string | null
  dataCriacao: string
  dataPrazo: string | null
  feito: boolean | null
  entregue: boolean | null
  observacoes: string | null
  metadata: Record<string, string | null>
}

function parseMaioNovasDietas(rows: string[][]): RowData[] {
  const body = rows.filter((r) => {
    const first = limpar(r[0] ?? '')
    return first.length > 0 && first.includes('@')
  })
  return body.map((r, idx) => {
    const nome = limpar(r[0] ?? '')
    return {
      sheet: 'MAIO NOVAS DIETAS', linha: idx + 4, nome, email: nome,
      responsavelNome: limpar(r[1] ?? '') || null,
      tipoPlano: limpar(r[2] ?? '') || null, tipoRetorno: null,
      dataCriacao: parseData(r[3] ?? '')!, dataPrazo: parseData(r[4] ?? ''),
      feito: parseBool(r[8] ?? ''), entregue: parseBool(r[9] ?? ''),
      observacoes: limpar(r[10] ?? '') || null,
      metadata: {
        formsDietaTreino: limpar(r[5] ?? '') || null,
        liveClin: limpar(r[7] ?? '') || null,
      },
    }
  }).filter((r) => r.nome.length > 0)
}

function parseFotos30Dias(rows: string[][]): RowData[] {
  const body = rows.filter((r) => {
    const first = limpar(r[0] ?? '')
    return first.length > 0 && !['NOME DO ALUNO', 'FOTOS 30 DIAS', ''].includes(first.toUpperCase())
  })
  return body.map((r, idx) => {
    const nome = limpar(r[0] ?? '')
    return {
      sheet: 'FOTOS 30 DIAS', linha: idx + 4, nome, email: null,
      responsavelNome: null, tipoPlano: null,
      tipoRetorno: limpar(r[1] ?? '') || null,
      dataCriacao: parseData(r[2] ?? '')!, dataPrazo: parseData(r[3] ?? ''),
      feito: parseBool(r[7] ?? ''), entregue: parseBool(r[8] ?? ''),
      observacoes: limpar(r[9] ?? '') || null,
      metadata: {
        pacienteJaEnviou: limpar(r[4] ?? '') || null,
        jaEstaNoCanva: limpar(r[5] ?? '') || null,
        feedback30Dias: limpar(r[6] ?? '') || null,
      },
    }
  }).filter((r) => r.nome.length > 0)
}

function parseRetornoDieta(rows: string[][]): RowData[] {
  const body = rows.filter((r) => {
    const first = limpar(r[0] ?? '')
    return first.length > 0 && !['NOME DO ALUNO', 'RETORNOS 30 DIAS', ''].includes(first.toUpperCase())
  })
  return body.map((r, idx) => {
    const nome = limpar(r[0] ?? '')
    return {
      sheet: 'RETORNO DIETA', linha: idx + 4, nome, email: null,
      responsavelNome: limpar(r[1] ?? '') || null,
      tipoPlano: null, tipoRetorno: null,
      dataCriacao: parseData(r[2] ?? '')!, dataPrazo: parseData(r[3] ?? ''),
      feito: parseBool(r[5] ?? ''), entregue: parseBool(r[6] ?? ''),
      observacoes: limpar(r[7] ?? '') || null,
      metadata: { pacienteJaEnviou: limpar(r[4] ?? '') || null },
    }
  }).filter((r) => r.nome.length > 0)
}

function responsavelIdPorNome(nome: string | null, usuarios: Record<string, { id: string; perfil: string }>): string | null {
  if (!nome) return null
  const n = normalizarNome(nome)
  if (n.includes('pablo')) return usuarios['pablo']?.id ?? null
  if (n.includes('dahora') || n.includes('estagiario')) return usuarios['joao_estagiario']?.id ?? null
  return null
}

function buildObservacoes(row: RowData): string | null {
  const parts: string[] = [IMPORT_TAG]
  if (row.tipoRetorno) parts.push(`TIPO:${row.tipoRetorno}`)
  if (row.metadata?.formsDietaTreino) parts.push(`FORMS:${row.metadata.formsDietaTreino.trim()}`)
  if (row.metadata?.liveClin) parts.push(`LIVE:${row.metadata.liveClin.trim()}`)
  if (row.metadata?.pacienteJaEnviou) parts.push(`ENVIOU:${row.metadata.pacienteJaEnviou.trim()}`)
  if (row.metadata?.jaEstaNoCanva) parts.push(`CANVA:${row.metadata.jaEstaNoCanva.trim()}`)
  if (row.metadata?.feedback30Dias) parts.push(`FEEDBACK:${row.metadata.feedback30Dias.trim()}`)
  return fmtObs([...parts, row.observacoes].filter(Boolean))
}

async function carregarEnv(envPath: string): Promise<void> {
  try {
    const content = readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const m = line.match(/^([^=]+)=\"?(.+?)\"?$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
    }
  } catch { /* fallback to existing env */ }
}

async function main() {
  const args = process.argv.slice(2)
  const DRY_RUN = args.includes('--dry-run')
  const AUTO_YES = args.includes('--yes') || args.includes('-y')
  const CLEAR = args.includes('--clear')

  console.log('=== IMPORT TAREFAS CSV ===')
  console.log()

  // Parse CSVs
  const linhasDietas = parseMaioNovasDietas(parseCsv(readFileSync(CSV_NOVAS_DIETAS, 'utf-8')))
  const linhasFotos = parseFotos30Dias(parseCsv(readFileSync(CSV_FOTOS_30_DIAS, 'utf-8')))
  const linhasRetorno = parseRetornoDieta(parseCsv(readFileSync(CSV_RETORNO_DIETA, 'utf-8')))
  const todasLinhas: RowData[] = [...linhasDietas, ...linhasFotos, ...linhasRetorno]

  console.log('LINHAS LIDAS POR ABA:')
  console.log(`  MAIO NOVAS DIETAS: ${linhasDietas.length}`)
  console.log(`  FOTOS 30 DIAS:     ${linhasFotos.length}`)
  console.log(`  RETORNO DIETA:     ${linhasRetorno.length}`)
  console.log(`  TOTAL:             ${todasLinhas.length}`)
  console.log()

  // Connect to DB
  await carregarEnv(resolve(process.cwd(), '.env.local'))
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) { console.error('ERRO: env vars faltando'); process.exit(1) }
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  // Load existing data
  console.log('Carregando dados existentes...')

  const { data: usuariosData } = await supabase.from('usuarios').select('id, nome, perfil').in('perfil', ['pablo', 'joao_estagiario'])
  const usuariosPorPerfil: Record<string, { id: string; perfil: string }> = {}
  for (const u of (usuariosData ?? []) as { id: string; nome: string; perfil: string }[]) {
    usuariosPorPerfil[u.perfil] = { id: u.id, perfil: u.perfil }
  }

  const allPacientes: { id: string; nome: string; email: string | null }[] = []
  let page = 0
  while (true) {
    const { data } = await supabase.from('pacientes').select('id, nome, email').range(page * 1000, (page + 1) * 1000 - 1)
    if (!data || data.length === 0) break
    allPacientes.push(...data as { id: string; nome: string; email: string | null }[])
    if (data.length < 1000) break
    page++
  }

  const pacientesPorEmail = new Map<string, { id: string; nome: string }>()
  const pacientesPorNome = new Map<string, { id: string; nome: string }>()
  for (const p of allPacientes) {
    if (p.email) pacientesPorEmail.set(p.email.toLowerCase(), p)
    const key = normalizarNome(p.nome)
    if (!pacientesPorNome.has(key)) pacientesPorNome.set(key, p)
  }

  // Load existing tarefas for dedupe
  const tarefasExistentesSet = new Set<string>()
  const { data: tarefasExistentes } = await supabase.from('tarefas').select('id, paciente_id, modulo, data_criacao')
  for (const t of (tarefasExistentes ?? []) as { id: string; paciente_id: string; modulo: string; data_criacao: string }[]) {
    tarefasExistentesSet.add(`${t.paciente_id}|${t.modulo}|${t.data_criacao}`)
  }

  console.log(`  Pacientes: ${allPacientes.length}`)
  console.log(`  Tarefas:   ${tarefasExistentes?.length ?? 0}`)
  console.log(`  Usuários:  ${(usuariosData ?? []).map((u: any) => `${u.nome} (${u.perfil})`).join(', ')}`)
  console.log()

  if (CLEAR) {
    console.log('=== CLEAR MODE ===')
    const { data: marcadas, error: qErr } = await supabase
      .from('tarefas')
      .select('id, modulo, data_criacao')
      .ilike('observacoes_joao', `${IMPORT_TAG}%`)

    if (qErr) { console.error('Erro ao buscar tarefas:', qErr.message); process.exit(1) }
    if (!marcadas || marcadas.length === 0) { console.log('Nenhuma tarefa com tag de import encontrada.'); process.exit(0) }

    console.log(`Encontradas ${marcadas.length} tarefas com tag. Deletando...`)
    const ids = marcadas.map((t: any) => t.id)
    const { error } = await supabase.from('tarefas').delete().in('id', ids)
    if (error) { console.error('Erro ao deletar:', error.message); process.exit(1) }
    console.log(`${ids.length} tarefas removidas.`)
    process.exit(0)
  }

  // -----------------------------------------------------------------------
  // Process each row: create patients if needed, build task batches
  // -----------------------------------------------------------------------
  const tarefasB: (typeof batchInserts)[0][] = []
  const tarefasC: (typeof batchInserts)[0][] = []
  const tarefasD: RowData[] = []

  const ignorados: { nome: string; sheet: string; linha: number; motivo: string }[] = []
  const pacientesCriados: { nome: string; linha: number; id?: string }[] = []

  for (const row of todasLinhas) {
    const { modulo } = MAPA_MODULOS[row.sheet]

    // Find paciente
    let paciente: { id: string; nome: string } | null = row.email
      ? pacientesPorEmail.get(row.email) ?? null
      : null
    if (!paciente) paciente = pacientesPorNome.get(normalizarNome(row.nome)) ?? null

    if (!paciente) {
      const novoPaciente: Record<string, any> = {
        nome: row.nome,
        email: row.email ?? null,
        tipo_plano: row.tipoPlano && limpar(row.tipoPlano).toLowerCase() === 'dieta' ? 'dieta' : 'completo',
        duracao_plano: 'trimestral',
        data_inicio: row.dataCriacao,
        data_vencimento_plano: row.dataPrazo ?? addDias(row.dataCriacao, 90),
        status: 'ativo',
      }

      if (DRY_RUN) {
        paciente = { id: 'dry-run', nome: row.nome }
      } else {
        const { data: inserted, error: err } = await supabase.from('pacientes').insert(novoPaciente).select('id, nome').single()
        if (err || !inserted) {
          ignorados.push({ nome: row.nome, sheet: row.sheet, linha: row.linha, motivo: `Falha ao criar paciente: ${err?.message}` })
          continue
        }
        paciente = { id: inserted.id, nome: inserted.nome }
        pacientesPorNome.set(normalizarNome(inserted.nome), paciente)
        if (inserted.email) pacientesPorEmail.set(inserted.email.toLowerCase(), paciente)
      }
      pacientesCriados.push({ nome: row.nome, linha: row.linha, id: paciente.id })
    }

    // Dedupe
    const dedupeKey = `${paciente.id}|${modulo}|${row.dataCriacao}`
    if (tarefasExistentesSet.has(dedupeKey)) {
      ignorados.push({ nome: row.nome, sheet: row.sheet, linha: row.linha, motivo: 'Tarefa já existe' })
      continue
    }

    // Mark dedupe so next iterations also skip
    tarefasExistentesSet.add(dedupeKey)

    const responsavelId = responsavelIdPorNome(row.responsavelNome ?? null, usuariosPorPerfil)
    const dataPrazo = row.dataPrazo ?? addDias(row.dataCriacao, 3)
    const status = mapStatus(row.entregue, row.feito)
    const obs = buildObservacoes(row)

    if (modulo === 'D') {
      tarefasD.push(row)
      tarefasExistentesSet.add(`${paciente.id}|D|${row.dataCriacao}`)
      continue
    }

    const task = {
      paciente_id: paciente.id,
      modulo,
      responsavel_id: responsavelId,
      status,
      data_criacao: row.dataCriacao,
      data_prazo: dataPrazo,
      observacoes_joao: obs,
    }

    if (modulo === 'B') tarefasB.push({ ...task })
    else if (modulo === 'C') tarefasC.push({ ...task })
  }

  // -----------------------------------------------------------------------
  // Batch insert B and C
  // -----------------------------------------------------------------------
  const tarefasCComId: { id: string; paciente_id: string; data_criacao: string }[] = []

  async function insertBatch(tarefas: any[], modulo: string): Promise<{ id: string; paciente_id: string; data_criacao: string }[] | null> {
    if (tarefas.length === 0) return []
    const results: { id: string; paciente_id: string; data_criacao: string }[] = []
    const BATCH = 50
    for (let i = 0; i < tarefas.length; i += BATCH) {
      const lote = tarefas.slice(i, i + BATCH)
      const { data, error } = await supabase.from('tarefas').insert(lote).select('id, paciente_id, data_criacao')
      if (error) { console.error(`ERRO módulo ${modulo} lote ${Math.floor(i / BATCH) + 1}: ${error.message}`); return null }
      if (data) results.push(...data as { id: string; paciente_id: string; data_criacao: string }[])
      console.log(`  [${modulo}] lote ${Math.floor(i / BATCH) + 1}: +${lote.length} (total ${results.length})`)
    }
    return results
  }

  console.log('=== INSERINDO TAREFAS ===')

  const idsB = await insertBatch(tarefasB, 'B')
  if (!idsB) process.exit(1)

  const idsC = await insertBatch(tarefasC, 'C')
  if (!idsC) process.exit(1)

  // Build a lookup: for each patient, find the C task closest to D's data_criacao
  const tarefasCPorPaciente = new Map<string, { id: string; data_criacao: string }[]>()
  for (const tc of idsC) {
    const arr = tarefasCPorPaciente.get(tc.paciente_id) ?? []
    arr.push(tc)
    tarefasCPorPaciente.set(tc.paciente_id, arr)
  }
  // Also include existing C tasks from before the import
  for (const t of (tarefasExistentes ?? []) as any[]) {
    if (t.modulo === 'C') {
      const arr = tarefasCPorPaciente.get(t.paciente_id) ?? []
      arr.push({ id: t.id, paciente_id: t.paciente_id, data_criacao: t.data_criacao })
      tarefasCPorPaciente.set(t.paciente_id, arr)
    }
  }

  // Sort each patient's C tasks by data_criacao ascending
  for (const [, arr] of tarefasCPorPaciente) {
    arr.sort((a, b) => a.data_criacao.localeCompare(b.data_criacao))
  }

  // -----------------------------------------------------------------------
  // Now insert D tasks with proper tarefa_pai_id
  // If a patient has no C task, create one first
  // -----------------------------------------------------------------------
  const tasksDInsert: any[] = []
  const dIgnorados: { nome: string; linha: number; motivo: string }[] = []

  for (const row of tarefasD) {
    const paciente = pacientesPorNome.get(normalizarNome(row.nome))
    if (!paciente) {
      dIgnorados.push({ nome: row.nome, linha: row.linha, motivo: 'Paciente não encontrado' })
      continue
    }

    // Find C tasks for this patient
    const cTasks = tarefasCPorPaciente.get(paciente.id) ?? []
    // Find the latest C task with data_criacao <= D's data_criacao
    let tarefaPaiId: string | null = null
    for (const ct of cTasks) {
      if (ct.data_criacao <= row.dataCriacao) { tarefaPaiId = ct.id } else break
    }

    // If no C task found, create a minimal C task first as parent
    if (!tarefaPaiId) {
      const dataCriacaoC = addDias(row.dataCriacao, -1)
      const cTask = {
        paciente_id: paciente.id,
        modulo: 'C',
        responsavel_id: null,
        status: 'entregue',
        data_criacao: dataCriacaoC,
        data_prazo: addDias(dataCriacaoC, 4),
        observacoes_joao: `${IMPORT_TAG} C automática para vínculo D`,
      }
      const { data: insertedC, error: errC } = await supabase.from('tarefas').insert(cTask).select('id').single()
      if (errC || !insertedC) {
        dIgnorados.push({ nome: row.nome, linha: row.linha, motivo: `Falha ao criar C automática: ${errC?.message}` })
        continue
      }
      tarefaPaiId = insertedC.id
      console.log(`  [C auto] #${row.linha} "${row.nome}" — criada C para vínculo D`)
    }

    const responsavelId = responsavelIdPorNome(row.responsavelNome ?? null, usuariosPorPerfil)
    const dataPrazo = row.dataPrazo ?? addDias(row.dataCriacao, 3)
    const status = mapStatus(row.entregue, row.feito)
    const obs = buildObservacoes(row)

    tasksDInsert.push({
      paciente_id: paciente.id,
      modulo: 'D',
      responsavel_id: responsavelId,
      status,
      data_criacao: row.dataCriacao,
      data_prazo: dataPrazo,
      tarefa_pai_id: tarefaPaiId,
      observacoes_joao: obs,
    })
  }

  if (tasksDInsert.length > 0) {
    const idsD = await insertBatch(tasksDInsert, 'D')
    if (!idsD) process.exit(1)
  }

  if (dIgnorados.length > 0) {
    console.log()
    console.log('=== TAREFAS D IGNORADAS ===')
    for (const d of dIgnorados) { console.log(`  #${d.linha} "${d.nome}" — ${d.motivo}`) }
  }

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------
  console.log()
  console.log('=== RESUMO FINAL ===')
  console.log(`  Total lidas:          ${todasLinhas.length}`)
  console.log(`  Módulo B criadas:     ${idsB?.length ?? 0}`)
  console.log(`  Módulo C criadas:     ${idsC?.length ?? 0}`)
  console.log(`  Módulo D criadas:     ${tasksDInsert.length}`)
  console.log(`  Ignoradas:            ${ignorados.length}`)
  console.log(`  Pacientes criados:    ${pacientesCriados.length}`)
  console.log(`  Total criadas:        ${(idsB?.length ?? 0) + (idsC?.length ?? 0) + tasksDInsert.length}`)
}

main().catch((err) => {
  console.error('FALHA:', err instanceof Error ? err.message : err)
  process.exit(1)
})
