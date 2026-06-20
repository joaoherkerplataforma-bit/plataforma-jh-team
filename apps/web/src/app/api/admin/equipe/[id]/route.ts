import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

import { createServiceClient } from '@/lib/supabase/service'
import { autorizarEquipe } from '@/lib/auth'
import { gerarSenhaTemp } from '@/lib/senha-temp'

interface PatchBody {
  ativo?: unknown
  reset_senha?: unknown
}

const BAN_LONGO = '876000h' // ~100 anos = bloqueio efetivo de login

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await autorizarEquipe()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (auth.user.perfil !== 'joao_admin') {
    return NextResponse.json({ error: 'Apenas o admin gerencia a equipe' }, { status: 403 })
  }

  const { id } = await params

  let body: PatchBody
  try {
    body = (await request.json()) as PatchBody
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const service = createServiceClient()

  // Redefinir senha → gera nova senha temporária
  if (body.reset_senha === true) {
    const senha = gerarSenhaTemp()
    const { error } = await service.auth.admin.updateUserById(id, { password: senha })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, senha_temporaria: senha })
  }

  // Ativar/desativar → atualiza flag + (des)bloqueia login no Auth
  if (typeof body.ativo === 'boolean') {
    if (id === auth.user.id && body.ativo === false) {
      return NextResponse.json({ error: 'Você não pode desativar a si mesmo' }, { status: 400 })
    }
    const { error } = await service.from('usuarios').update({ ativo: body.ativo }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    // Bloqueia/desbloqueia o acesso de login (best-effort)
    await service.auth.admin.updateUserById(id, {
      ban_duration: body.ativo ? 'none' : BAN_LONGO,
    })
    revalidatePath('/equipe')
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 })
}
