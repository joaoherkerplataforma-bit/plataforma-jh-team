import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

import { createServiceClient } from '@/lib/supabase/service'
import { autorizarEquipe } from '@/lib/auth'
import { hoje, addDias, addMeses } from '@/lib/dates'

const MESES_POR_DURACAO: Record<string, number> = {
  trimestral: 3,
  semestral: 6,
  anual: 12,
}

export async function POST(request: NextRequest) {
  const auth = await autorizarEquipe()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const nome = typeof body.nome === 'string' ? body.nome.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() || null : null
  const telefone = typeof body.telefone === 'string' ? body.telefone.trim() || null : null
  const tipo_plano = body.tipo_plano as string
  const duracao_plano = body.duracao_plano as string
  const data_inicio = typeof body.data_inicio === 'string' ? body.data_inicio : ''
  const proximo_retorno = typeof body.proximo_retorno === 'string' ? body.proximo_retorno || null : null

  if (!nome || !data_inicio) {
    return NextResponse.json({ error: 'Nome e data de início são obrigatórios' }, { status: 400 })
  }
  if (!['dieta', 'completo'].includes(tipo_plano)) {
    return NextResponse.json({ error: 'Tipo de plano inválido' }, { status: 400 })
  }
  if (!['trimestral', 'semestral', 'anual'].includes(duracao_plano)) {
    return NextResponse.json({ error: 'Duração do plano inválida' }, { status: 400 })
  }

  const service = createServiceClient()

  const meses = MESES_POR_DURACAO[duracao_plano] ?? 3

  const { data: paciente, error: errPaciente } = await service
    .from('pacientes')
    .insert({
      nome,
      email,
      telefone,
      tipo_plano,
      duracao_plano,
      data_inicio,
      data_vencimento_plano: addMeses(data_inicio, meses),
      proximo_retorno: proximo_retorno || addDias(data_inicio, 30),
      status: 'ativo',
    })
    .select('id')
    .single()

  if (errPaciente || !paciente) {
    return NextResponse.json(
      { error: 'Falha ao criar paciente', details: errPaciente?.message },
      { status: 500 },
    )
  }

  const paciente_id = paciente.id

  // Cria tarefa Modulo B com alternância Pablo/Estagiário
  let tarefa_id: string | null = null

  const { data: delegacao } = await service
    .from('delegacao_controle')
    .select('id, ultimo_delegado, contador')
    .limit(1)
    .single()

  const { data: usuarios } = await service
    .from('usuarios')
    .select('id, perfil')
    .in('perfil', ['pablo', 'joao_estagiario'])
    .eq('ativo', true)

  if (delegacao && usuarios && usuarios.length >= 2) {
    const proximoPerfil = delegacao.ultimo_delegado === 'pablo' ? 'joao_estagiario' : 'pablo'
    const responsavel = usuarios.find((u) => u.perfil === proximoPerfil)

    if (responsavel) {
      await service
        .from('delegacao_controle')
        .update({ ultimo_delegado: proximoPerfil, contador: delegacao.contador + 1 })
        .eq('id', delegacao.id)

      const { data: tarefa } = await service
        .from('tarefas')
        .insert({
          paciente_id,
          modulo: 'B',
          responsavel_id: responsavel.id,
          data_criacao: hoje(),
          data_prazo: addDias(hoje(), 3),
          status: 'pendente',
          observacoes_joao: `Novo paciente — ${nome}`,
        })
        .select('id')
        .single()

      if (tarefa) tarefa_id = tarefa.id
    }
  }

  revalidatePath('/pacientes')
  revalidatePath('/tarefas')

  return NextResponse.json({ ok: true, paciente_id, tarefa_id }, { status: 201 })
}
