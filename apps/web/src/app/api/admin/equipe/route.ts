import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

import { createServiceClient } from '@/lib/supabase/service'
import { autorizarEquipe } from '@/lib/auth'
import { gerarSenhaTemp } from '@/lib/senha-temp'

const PERFIS = ['joao_admin', 'pablo', 'joao_estagiario'] as const
type Perfil = (typeof PERFIS)[number]

interface CreateBody {
  nome?: unknown
  email?: unknown
  perfil?: unknown
}

export async function POST(request: NextRequest) {
  const auth = await autorizarEquipe()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (auth.user.perfil !== 'joao_admin') {
    return NextResponse.json({ error: 'Apenas o admin gerencia a equipe' }, { status: 403 })
  }

  let body: CreateBody
  try {
    body = (await request.json()) as CreateBody
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const nome = typeof body.nome === 'string' ? body.nome.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const perfil = body.perfil as Perfil

  if (!nome) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 })
  }
  if (!PERFIS.includes(perfil)) {
    return NextResponse.json({ error: 'Perfil inválido' }, { status: 400 })
  }

  const service = createServiceClient()
  const senha = gerarSenhaTemp()

  // Cria a conta no Supabase Auth (já confirmada — login imediato)
  const { data: created, error: errAuth } = await service.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome },
  })

  if (errAuth || !created.user) {
    const msg = errAuth?.message ?? 'Falha ao criar usuário'
    const jaExiste = /already.*registered|exists/i.test(msg)
    return NextResponse.json(
      { error: jaExiste ? 'Já existe um usuário com este e-mail' : msg },
      { status: jaExiste ? 409 : 500 }
    )
  }

  const id = created.user.id

  const { error: errIns } = await service
    .from('usuarios')
    .insert({ id, nome, email, perfil, ativo: true })

  if (errIns) {
    // Rollback: remove a conta auth órfã se o vínculo falhar
    await service.auth.admin.deleteUser(id)
    return NextResponse.json({ error: errIns.message }, { status: 500 })
  }

  revalidatePath('/equipe')
  return NextResponse.json({ ok: true, id, nome, email, senha_temporaria: senha }, { status: 201 })
}
