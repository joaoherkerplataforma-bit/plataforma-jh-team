/**
 * CLEANUP IDEMPOTENTE — reverte o seed criado por seed-portal-teste.ts.
 *
 * Remove (em ordem segura para FKs):
 *   - progresso_videoaulas do aluno teste
 *   - historico_entregas do paciente teste (se algum tiver sido criado pelo smoke)
 *   - tarefas com paciente_id do paciente teste
 *   - formularios_recebidos do paciente teste com fonte=seed_portal_teste
 *   - protocolos_base do paciente teste (links com 'teste-aluno-portal')
 *   - pacientes do aluno teste (linha vinculada via usuario_id)
 *   - usuarios do aluno teste
 *   - auth.users do aluno teste (CASCADE remove o resto que sobrar)
 *
 * Idempotente: cada step ignora "não encontrado" e só reporta o que removeu.
 *
 * USO:
 *   npx tsx scripts/cleanup-portal-teste.ts            # confirma interativamente
 *   npx tsx scripts/cleanup-portal-teste.ts --yes      # confirma automaticamente
 */

import {
  TESTE_ALUNO_EMAIL,
  criarClienteServiceRole,
  confirmar,
} from './_portal-teste-config'

interface ResumoCleanup {
  authIdRemovido: string | null
  usuarioRemovido: boolean
  pacienteIdRemovido: string | null
  protocolosRemovidos: number
  formulariosRemovidos: number
  tarefasRemovidas: number
  historicoRemovido: number
  progressoRemovido: number
}

async function main(): Promise<void> {
  console.log('=== CLEANUP PORTAL TESTE ===')
  console.log(`Remove o aluno de teste e todos os artefatos vinculados.`)
  console.log(`Aluno alvo: ${TESTE_ALUNO_EMAIL}`)
  console.log()

  const supabase = criarClienteServiceRole()
  console.log(`Banco alvo: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`)
  console.log()

  const ok = await confirmar(
    'Prosseguir com o cleanup? (digite "sim" para confirmar)'
  )
  if (!ok) {
    console.log('Abortado pelo usuário.')
    process.exit(0)
  }

  const resumo: ResumoCleanup = {
    authIdRemovido: null,
    usuarioRemovido: false,
    pacienteIdRemovido: null,
    protocolosRemovidos: 0,
    formulariosRemovidos: 0,
    tarefasRemovidas: 0,
    historicoRemovido: 0,
    progressoRemovido: 0,
  }

  // 1. Resolver authId pelo email (via tabela usuarios — barato e RLS-bypass)
  const { data: usuarioRow } = await supabase
    .from('usuarios')
    .select('id')
    .eq('email', TESTE_ALUNO_EMAIL)
    .maybeSingle()

  const authId = usuarioRow?.id ?? null

  if (!authId) {
    console.log('Nenhum auth user encontrado para o email teste — nada a fazer.')
    console.log(JSON.stringify(resumo, null, 2))
    process.exit(0)
  }

  console.log(`Auth user encontrado: ${authId}`)

  // 2. Resolver pacienteId
  const { data: pacienteRow } = await supabase
    .from('pacientes')
    .select('id')
    .eq('usuario_id', authId)
    .maybeSingle()

  const pacienteId = pacienteRow?.id ?? null

  // 3. progresso_videoaulas (referencia aluno_id)
  const { data: progressoDel, error: errProg } = await supabase
    .from('progresso_videoaulas')
    .delete()
    .eq('aluno_id', authId)
    .select('id')
  if (errProg) {
    console.warn(`  ! progresso_videoaulas: ${errProg.message}`)
  } else {
    resumo.progressoRemovido = progressoDel?.length ?? 0
    console.log(`  -> progresso_videoaulas removidos: ${resumo.progressoRemovido}`)
  }

  if (pacienteId) {
    console.log(`Paciente encontrado: ${pacienteId}`)

    // 4. historico_entregas (paciente_id)
    const { data: histDel, error: errHist } = await supabase
      .from('historico_entregas')
      .delete()
      .eq('paciente_id', pacienteId)
      .select('id')
    if (errHist) {
      console.warn(`  ! historico_entregas: ${errHist.message}`)
    } else {
      resumo.historicoRemovido = histDel?.length ?? 0
      console.log(`  -> historico_entregas removidos: ${resumo.historicoRemovido}`)
    }

    // 5. tarefas (paciente_id)
    // ATENÇÃO: tarefas filhas (modulo D) referenciam tarefas pais via tarefa_pai_id.
    // Como deletamos TODAS as tarefas do paciente em batch, e não há FK para fora
    // do conjunto, isto é seguro. Postgres resolverá a ordem internamente.
    const { data: tarefasDel, error: errTar } = await supabase
      .from('tarefas')
      .delete()
      .eq('paciente_id', pacienteId)
      .select('id')
    if (errTar) {
      console.warn(`  ! tarefas: ${errTar.message}`)
    } else {
      resumo.tarefasRemovidas = tarefasDel?.length ?? 0
      console.log(`  -> tarefas removidas: ${resumo.tarefasRemovidas}`)
    }

    // 6. formularios_recebidos (apenas os do seed — preserva qualquer outro
    //    que tenha sido inserido manualmente para este paciente fora do seed)
    const { data: formsDel, error: errForms } = await supabase
      .from('formularios_recebidos')
      .delete()
      .eq('paciente_id', pacienteId)
      .eq('dados_raw->>fonte', 'seed_portal_teste')
      .select('id')
    if (errForms) {
      console.warn(`  ! formularios_recebidos (seed): ${errForms.message}`)
    } else {
      resumo.formulariosRemovidos = formsDel?.length ?? 0
      console.log(
        `  -> formularios (seed) removidos: ${resumo.formulariosRemovidos}`
      )
    }

    // Caso o paciente tenha QUALQUER outro formulário que não seja do seed
    // (improvável, mas possível se webhook foi acionado em testes), limpar
    // para liberar a remoção do paciente. FK em formularios_recebidos é
    // ON DELETE RESTRICT, então é necessário.
    const { data: extraForms, error: errExtraSel } = await supabase
      .from('formularios_recebidos')
      .select('id')
      .eq('paciente_id', pacienteId)
    if (errExtraSel) {
      console.warn(`  ! consulta formularios extras: ${errExtraSel.message}`)
    } else if (extraForms && extraForms.length > 0) {
      const { error: errExtraDel } = await supabase
        .from('formularios_recebidos')
        .delete()
        .eq('paciente_id', pacienteId)
      if (errExtraDel) {
        console.warn(`  ! formularios_recebidos (extras): ${errExtraDel.message}`)
      } else {
        resumo.formulariosRemovidos += extraForms.length
        console.log(
          `  -> formularios extras removidos: ${extraForms.length}`
        )
      }
    }

    // 7. protocolos_base (paciente_id) — FK ON DELETE RESTRICT em pacientes,
    //    então remove TODOS os protocolos do paciente para liberar deleção.
    const { data: protosDel, error: errProto } = await supabase
      .from('protocolos_base')
      .delete()
      .eq('paciente_id', pacienteId)
      .select('id')
    if (errProto) {
      console.warn(`  ! protocolos_base: ${errProto.message}`)
    } else {
      resumo.protocolosRemovidos = protosDel?.length ?? 0
      console.log(`  -> protocolos removidos: ${resumo.protocolosRemovidos}`)
    }

    // 8. pacientes
    const { error: errPac } = await supabase
      .from('pacientes')
      .delete()
      .eq('id', pacienteId)
    if (errPac) {
      console.warn(`  ! pacientes: ${errPac.message}`)
    } else {
      resumo.pacienteIdRemovido = pacienteId
      console.log(`  -> paciente removido (id=${pacienteId})`)
    }
  } else {
    console.log('Nenhum paciente vinculado encontrado.')
  }

  // 9. usuarios — depois de remover pacientes (que tem FK para usuarios)
  //    Como pacientes.usuario_id é ON DELETE SET NULL, não bloqueia, mas
  //    fazemos depois para manter ordem lógica.
  const { error: errUsu } = await supabase
    .from('usuarios')
    .delete()
    .eq('id', authId)
  if (errUsu) {
    console.warn(`  ! usuarios: ${errUsu.message}`)
  } else {
    resumo.usuarioRemovido = true
    console.log(`  -> usuario removido (id=${authId})`)
  }

  // 10. auth.users — CASCADE em public.usuarios já cuidou da maior parte,
  //     mas removemos explicitamente para limpar o auth user.
  const { error: errAuth } = await supabase.auth.admin.deleteUser(authId)
  if (errAuth) {
    console.warn(`  ! auth.admin.deleteUser: ${errAuth.message}`)
  } else {
    resumo.authIdRemovido = authId
    console.log(`  -> auth user removido (id=${authId})`)
  }

  console.log()
  console.log('=== CLEANUP CONCLUÍDO ===')
  console.log(JSON.stringify(resumo, null, 2))
  process.exit(0)
}

main().catch((err) => {
  console.error('FALHA NO CLEANUP:', err instanceof Error ? err.message : err)
  process.exit(1)
})
