/**
 * Configuração compartilhada entre seed-portal-teste.ts e cleanup-portal-teste.ts.
 *
 * Centraliza os identificadores do aluno de teste para que os dois scripts
 * usem exatamente os mesmos valores (idempotência por email).
 *
 * NÃO commitar segredos aqui — service-role key vem de .env.local.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// =============================================================
// Identidade do aluno de teste — domínio .test não envia emails reais
// =============================================================
export const TESTE_ALUNO_EMAIL = 'aluno.teste.portal@plataforma-jh-team.test'
export const TESTE_ALUNO_SENHA = 'TestePortal2026!'
export const TESTE_ALUNO_NOME = 'Aluno Teste do Portal'
export const TESTE_ALUNO_TELEFONE = '11900000000'

/**
 * Marcador usado em campos free-text (observacoes, link_webdiet, etc.)
 * para localizar registros do seed em buscas de auditoria.
 */
export const SEED_TAG = '[SEED-PORTAL-TESTE]'

/**
 * Lê .env.local do repo root. Suporta apenas formato KEY=VALUE
 * com aspas simples/duplas opcionais. Não interpola variáveis.
 */
function carregarEnvLocal(): void {
  const envPath = resolve(process.cwd(), '.env.local')
  let conteudo: string
  try {
    conteudo = readFileSync(envPath, 'utf-8')
  } catch {
    // Se não existe, confia no process.env já populado pelo shell
    return
  }
  for (const linhaRaw of conteudo.split('\n')) {
    const linha = linhaRaw.trim()
    if (!linha || linha.startsWith('#')) continue
    const idx = linha.indexOf('=')
    if (idx <= 0) continue
    const chave = linha.slice(0, idx).trim()
    let valor = linha.slice(idx + 1).trim()
    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1)
    }
    if (process.env[chave] === undefined) {
      process.env[chave] = valor
    }
  }
}

/**
 * Cria um cliente Supabase com service-role (bypassa RLS).
 * Falha rápido com mensagem clara se as variáveis não estiverem presentes.
 */
export function criarClienteServiceRole(): SupabaseClient {
  carregarEnvLocal()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    console.error(
      'ERRO: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.\n' +
        'Verifique se .env.local existe na raiz do repositório com esses valores.'
    )
    process.exit(1)
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Confirmação interativa simples: pergunta no terminal e aceita 'y'/'sim'.
 * Em ambiente CI (sem TTY), aceita a flag --yes.
 */
export async function confirmar(pergunta: string): Promise<boolean> {
  if (process.argv.includes('--yes') || process.argv.includes('-y')) {
    console.log(`${pergunta} [forçado via --yes]`)
    return true
  }
  if (!process.stdin.isTTY) {
    console.error(
      'ERRO: stdin não é um TTY. Use --yes para confirmar não-interativamente.'
    )
    return false
  }
  process.stdout.write(`${pergunta} (sim/não) `)
  return new Promise((resolveFn) => {
    process.stdin.once('data', (data) => {
      const resposta = data.toString().trim().toLowerCase()
      resolveFn(resposta === 'sim' || resposta === 's' || resposta === 'y' || resposta === 'yes')
    })
  })
}
