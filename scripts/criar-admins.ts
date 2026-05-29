/**
 * Cria os usuários admin (João e Pablo) no Supabase Auth + public.usuarios.
 *
 * USO:
 *   npx tsx scripts/criar-admins.ts
 *   npx tsx scripts/criar-admins.ts --yes
 *
 * REQUISITOS:
 *   - .env.local na raiz com NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
 */

import { criarClienteServiceRole, confirmar } from './_portal-teste-config'

interface AdminUser {
  email: string
  nome: string
  perfil: 'joao_admin' | 'pablo'
  senha: string
}

const ADMINS: AdminUser[] = [
  {
    email: 'joaovitormachado1010@gmail.com',
    nome: 'João Vitor',
    perfil: 'joao_admin',
    senha: 'Admin@1234',
  },
  {
    email: '984751263pablo@gmail.com',
    nome: 'Pablo',
    perfil: 'pablo',
    senha: 'Admin@1234',
  },
]

async function criarOuIgnorarAuthUser(
  supabase: ReturnType<typeof criarClienteServiceRole>,
  { email, nome, senha }: AdminUser
): Promise<string> {
  // Verifica se já existe
  const { data: existente } = await supabase
    .from('usuarios')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existente) {
    console.log(`  -> usuário já existe (id=${existente.id}) — atualizando perfil`)
    await supabase
      .from('usuarios')
      .update({ nome, ativo: true })
      .eq('id', existente.id)
    return existente.id
  }

  // Cria no Auth
  const { data: criacao, error: errCriacao } = await supabase.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome },
  })

  if (errCriacao || !criacao?.user) {
    const msg = errCriacao?.message ?? 'unknown'
    if (msg.toLowerCase().includes('already')) {
      const { data: retry } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', email)
        .maybeSingle()
      if (retry) return retry.id
    }
    throw new Error(`Falha ao criar auth user ${email}: ${msg}`)
  }

  return criacao.user.id
}

async function upsertUsuario(
  supabase: ReturnType<typeof criarClienteServiceRole>,
  authId: string,
  { email, nome, perfil }: AdminUser
): Promise<void> {
  const { error } = await supabase.from('usuarios').upsert(
    {
      id: authId,
      nome,
      email,
      perfil,
      ativo: true,
    },
    { onConflict: 'id' }
  )
  if (error) {
    throw new Error(`Falha ao upsert em usuarios (${email}): ${error.message}`)
  }
  console.log(`  -> linha em public.usuarios garantida (perfil=${perfil})`)
}

async function main(): Promise<void> {
  console.log('=== CRIAR ADMINS ===')
  console.log('Cria/garante João (joao_admin) e Pablo (pablo) no banco APONTADO PELO .env.local.')
  console.log()

  for (const admin of ADMINS) {
    console.log(`  • ${admin.nome} (${admin.email}) → ${admin.perfil}`)
  }
  console.log()
  console.log(`Senha padrão para ambos: Admin@1234`)
  console.log()

  const supabase = criarClienteServiceRole()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  console.log(`Banco alvo: ${supabaseUrl}`)
  console.log()

  const ok = await confirmar('Prosseguir? (digite "sim" para confirmar)')
  if (!ok) {
    console.log('Abortado pelo usuário.')
    process.exit(0)
  }

  for (const admin of ADMINS) {
    console.log()
    console.log(`--- ${admin.nome} ---`)
    const authId = await criarOuIgnorarAuthUser(supabase, admin)
    await upsertUsuario(supabase, authId, admin)
  }

  console.log()
  console.log('=== CONCLUÍDO ===')
  console.log('Usuários criados/verificados com sucesso.')
  console.log('Senha padrão: Admin@1234')
  console.log()
  console.log('Perfis:')
  console.log('  • joaovitormachado1010@gmail.com → joao_admin (acesso total)')
  console.log('  • 984751263pablo@gmail.com       → pablo')
  process.exit(0)
}

main().catch((err) => {
  console.error('FALHA:', err instanceof Error ? err.message : err)
  process.exit(1)
})
