/**
 * Seed REVERSÍVEL para smoke test do Portal do Aluno.
 *
 * Cria — IDEMPOTENTEMENTE — um aluno de teste pronto para login no portal,
 * com paciente vinculado, protocolo ativo (links WebDiet/MFit) e dois
 * formulários respondidos. NÃO cria videoaulas (devem ser cadastradas
 * manualmente em /pacientes/videoaulas antes do smoke).
 *
 * USO (a partir da raiz do repo):
 *   npx tsx scripts/seed-portal-teste.ts            # confirma interativamente
 *   npx tsx scripts/seed-portal-teste.ts --yes      # confirma automaticamente
 *
 * REQUISITOS:
 *   - .env.local na raiz com NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
 *   - Banco em produção com migrations 20260430000001..20260430000005 aplicadas
 *
 * REVERSO: scripts/cleanup-portal-teste.ts
 */

import {
  TESTE_ALUNO_EMAIL,
  TESTE_ALUNO_SENHA,
  TESTE_ALUNO_NOME,
  TESTE_ALUNO_TELEFONE,
  SEED_TAG,
  criarClienteServiceRole,
  confirmar,
} from './_portal-teste-config'

interface ResultadoSeed {
  authId: string
  pacienteId: string
  protocoloId: string | null
  formulariosCriados: number
}

async function obterOuCriarAuthUser(
  supabase: ReturnType<typeof criarClienteServiceRole>
): Promise<string> {
  // 1. Tenta listar usuário existente pelo email — auth.admin.listUsers
  //    não tem filtro por email, então paginamos com lookup direto via
  //    "getUserByEmail" não existe. Fallback: tentar criar; se já existir,
  //    consultar a tabela usuarios pelo email para obter o id.
  const { data: usuarioExistente, error: errUsuario } = await supabase
    .from('usuarios')
    .select('id')
    .eq('email', TESTE_ALUNO_EMAIL)
    .maybeSingle()

  if (errUsuario) {
    throw new Error(`Falha consultando usuarios: ${errUsuario.message}`)
  }

  if (usuarioExistente) {
    console.log(`  -> auth user já existe (id=${usuarioExistente.id})`)
    return usuarioExistente.id
  }

  // 2. Cria via admin API
  const { data: criacao, error: errCriacao } = await supabase.auth.admin.createUser({
    email: TESTE_ALUNO_EMAIL,
    password: TESTE_ALUNO_SENHA,
    email_confirm: true, // não exige confirmação por email
    user_metadata: {
      nome: TESTE_ALUNO_NOME,
      seed: SEED_TAG,
    },
  })

  if (errCriacao || !criacao?.user) {
    // Caso de corrida: outra execução criou em paralelo. Tentar resolver.
    const msg = errCriacao?.message ?? 'unknown'
    if (msg.toLowerCase().includes('already')) {
      const { data: retry } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', TESTE_ALUNO_EMAIL)
        .maybeSingle()
      if (retry) return retry.id
    }
    throw new Error(`Falha ao criar auth user: ${msg}`)
  }

  console.log(`  -> auth user criado (id=${criacao.user.id})`)
  return criacao.user.id
}

async function upsertUsuario(
  supabase: ReturnType<typeof criarClienteServiceRole>,
  authId: string
): Promise<void> {
  const { error } = await supabase.from('usuarios').upsert(
    {
      id: authId,
      nome: TESTE_ALUNO_NOME,
      email: TESTE_ALUNO_EMAIL,
      perfil: 'aluno',
      ativo: true,
    },
    { onConflict: 'id' }
  )
  if (error) {
    throw new Error(`Falha ao upsert em usuarios: ${error.message}`)
  }
  console.log(`  -> linha em public.usuarios garantida (perfil=aluno)`)
}

async function upsertPaciente(
  supabase: ReturnType<typeof criarClienteServiceRole>,
  authId: string
): Promise<string> {
  const hoje = new Date()
  const dataInicio = hoje.toISOString().split('T')[0]
  const venc = new Date(hoje)
  venc.setDate(venc.getDate() + 90) // trimestral ~ 90 dias
  const dataVencimento = venc.toISOString().split('T')[0]
  const proxRetorno = new Date(hoje)
  proxRetorno.setDate(proxRetorno.getDate() + 30)
  const proximoRetorno = proxRetorno.toISOString().split('T')[0]

  // Verifica se paciente já existe vinculado a este auth user
  const { data: existente, error: errSelect } = await supabase
    .from('pacientes')
    .select('id')
    .eq('usuario_id', authId)
    .maybeSingle()

  if (errSelect) {
    throw new Error(`Falha consultando pacientes: ${errSelect.message}`)
  }

  if (existente) {
    console.log(`  -> paciente já existe (id=${existente.id})`)
    return existente.id
  }

  const { data: criado, error: errInsert } = await supabase
    .from('pacientes')
    .insert({
      nome: TESTE_ALUNO_NOME,
      email: TESTE_ALUNO_EMAIL,
      telefone: TESTE_ALUNO_TELEFONE,
      tipo_plano: 'completo',
      duracao_plano: 'trimestral',
      data_inicio: dataInicio,
      data_vencimento_plano: dataVencimento,
      proximo_retorno: proximoRetorno,
      status: 'ativo',
      observacoes: `${SEED_TAG} Aluno fictício para smoke test do portal. Pode deletar com cleanup-portal-teste.ts.`,
      usuario_id: authId,
    })
    .select('id')
    .single()

  if (errInsert || !criado) {
    throw new Error(`Falha ao criar paciente: ${errInsert?.message ?? 'unknown'}`)
  }

  console.log(`  -> paciente criado (id=${criado.id})`)
  return criado.id
}

async function upsertProtocolo(
  supabase: ReturnType<typeof criarClienteServiceRole>,
  pacienteId: string
): Promise<string | null> {
  // Limpa protocolos antigos do seed (idempotência)
  await supabase
    .from('protocolos_base')
    .delete()
    .eq('paciente_id', pacienteId)
    .like('link_webdiet', `%teste-aluno-portal%`)

  const { data: criado, error } = await supabase
    .from('protocolos_base')
    .insert({
      paciente_id: pacienteId,
      tipo: 'dieta_e_treino',
      link_webdiet: 'https://webdiet.com.br/teste-aluno-portal',
      link_mfit: 'https://mfitpersonal.com.br/teste-aluno-portal',
      versao: 1,
      ativo: true,
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Falha ao criar protocolo: ${error.message}`)
  }

  console.log(`  -> protocolo ativo criado (id=${criado!.id})`)
  return criado!.id
}

async function upsertFormularios(
  supabase: ReturnType<typeof criarClienteServiceRole>,
  pacienteId: string
): Promise<number> {
  // Limpa formularios antigos do seed deste paciente (idempotência)
  // — restritivo: só remove os que tem o marcador SEED_TAG no dados_raw.fonte
  await supabase
    .from('formularios_recebidos')
    .delete()
    .eq('paciente_id', pacienteId)
    .eq('dados_raw->>fonte', 'seed_portal_teste')

  const formularios = [
    {
      paciente_id: pacienteId,
      tipo_formulario: 'anamnese' as const,
      nome_formulario: TESTE_ALUNO_NOME,
      email_formulario: TESTE_ALUNO_EMAIL,
      processado: true,
      requer_revisao: false,
      dados_raw: {
        fonte: 'seed_portal_teste',
        nome_completo: TESTE_ALUNO_NOME,
        email: TESTE_ALUNO_EMAIL,
        telefone: TESTE_ALUNO_TELEFONE,
        qual_plano: 'Trimestral - Dieta + Treino',
        respostas: [
          { pergunta: 'E-mail', resposta: TESTE_ALUNO_EMAIL },
          { pergunta: 'Qual é o seu nome COMPLETO?', resposta: TESTE_ALUNO_NOME },
          { pergunta: 'Número do celular', resposta: TESTE_ALUNO_TELEFONE },
          { pergunta: 'Qual é o seu plano atual?', resposta: 'Trimestral - Dieta + Treino' },
          { pergunta: 'Por onde você me conheceu?', resposta: 'Indicação' },
          {
            pergunta: 'Conte sobre sua rotina',
            resposta:
              'Trabalho remoto, treino 4x por semana de manhã, durmo 7h por noite.',
          },
        ],
      },
    },
    {
      paciente_id: pacienteId,
      tipo_formulario: 'feedback_retorno' as const,
      nome_formulario: TESTE_ALUNO_NOME,
      email_formulario: TESTE_ALUNO_EMAIL,
      processado: true,
      requer_revisao: false,
      dados_raw: {
        fonte: 'seed_portal_teste',
        nome_completo: TESTE_ALUNO_NOME,
        email: TESTE_ALUNO_EMAIL,
        respostas: [
          { pergunta: 'E-mail', resposta: TESTE_ALUNO_EMAIL },
          { pergunta: 'Qual seu nome completo?', resposta: TESTE_ALUNO_NOME },
          { pergunta: 'Você saberia me relatar seu peso em jejum?', resposta: '78kg' },
          {
            pergunta: 'De 0-10, qual nota você daria a sua adesão à dieta?',
            resposta: '8',
          },
          {
            pergunta: 'Como foi seu desempenho nos treinos?',
            resposta: 'Subi carga em supino e agachamento. Cardio mantido em 3x.',
          },
        ],
      },
    },
  ]

  const { error } = await supabase.from('formularios_recebidos').insert(formularios)
  if (error) {
    throw new Error(`Falha ao criar formularios: ${error.message}`)
  }

  console.log(`  -> ${formularios.length} formularios criados (anamnese + retorno)`)
  return formularios.length
}

async function main(): Promise<void> {
  console.log('=== SEED PORTAL TESTE ===')
  console.log('Cria aluno de teste no banco APONTADO PELO .env.local.')
  console.log(`Aluno: ${TESTE_ALUNO_EMAIL}`)
  console.log(`Senha: ${TESTE_ALUNO_SENHA}`)
  console.log()

  const supabase = criarClienteServiceRole()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  console.log(`Banco alvo: ${supabaseUrl}`)
  console.log()

  const ok = await confirmar(
    'Prosseguir com o seed neste banco? (digite "sim" para confirmar)'
  )
  if (!ok) {
    console.log('Abortado pelo usuário.')
    process.exit(0)
  }

  console.log()
  console.log('1) Auth user...')
  const authId = await obterOuCriarAuthUser(supabase)

  console.log('2) Linha em public.usuarios...')
  await upsertUsuario(supabase, authId)

  console.log('3) Paciente...')
  const pacienteId = await upsertPaciente(supabase, authId)

  console.log('4) Protocolo ativo (WebDiet + MFit)...')
  const protocoloId = await upsertProtocolo(supabase, pacienteId)

  console.log('5) Formularios respondidos...')
  const formulariosCriados = await upsertFormularios(supabase, pacienteId)

  const resultado: ResultadoSeed = {
    authId,
    pacienteId,
    protocoloId,
    formulariosCriados,
  }

  console.log()
  console.log('=== SEED CONCLUÍDO ===')
  console.log(JSON.stringify(resultado, null, 2))
  console.log()
  console.log('Próximos passos:')
  console.log('  1. Garanta que existem >= 2 videoaulas ativas em /pacientes/videoaulas.')
  console.log(`  2. Logue no portal com ${TESTE_ALUNO_EMAIL} / ${TESTE_ALUNO_SENHA}.`)
  console.log('  3. Siga o checklist em docs/portal-aluno-smoke-test.md.')
  console.log('  4. Após testar: npx tsx scripts/cleanup-portal-teste.ts')
  process.exit(0)
}

main().catch((err) => {
  console.error('FALHA NO SEED:', err instanceof Error ? err.message : err)
  process.exit(1)
})
