-- =============================================================
-- Smoke Test: validação do schema, RLS e trigger
-- Executar com service_role (psql ou Supabase SQL Editor)
-- Todos os blocos devem terminar com PASS ou lançar exceção com FAIL
-- =============================================================

-- =============================================================
-- BLOCO 1: Existência das tabelas
-- =============================================================
DO $$
DECLARE
  v_tabelas text[] := ARRAY[
    'usuarios', 'pacientes', 'formularios_recebidos',
    'delegacao_controle', 'tarefas', 'protocolos_base', 'historico_entregas'
  ];
  v_tabela text;
  v_count  int;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════';
  RAISE NOTICE 'BLOCO 1: Existência das tabelas';
  RAISE NOTICE '══════════════════════════════════════════';

  FOREACH v_tabela IN ARRAY v_tabelas LOOP
    SELECT COUNT(*) INTO v_count
    FROM   information_schema.tables
    WHERE  table_schema = 'public' AND table_name = v_tabela;

    IF v_count = 0 THEN
      RAISE EXCEPTION 'FAIL ✗ — Tabela public.% não encontrada', v_tabela;
    END IF;
    RAISE NOTICE 'PASS ✓ — public.% existe', v_tabela;
  END LOOP;
END $$;

-- =============================================================
-- BLOCO 2: RLS habilitado em todas as tabelas
-- =============================================================
DO $$
DECLARE
  v_rec record;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════';
  RAISE NOTICE 'BLOCO 2: RLS habilitado';
  RAISE NOTICE '══════════════════════════════════════════';

  FOR v_rec IN
    SELECT tablename, rowsecurity
    FROM   pg_tables
    WHERE  schemaname = 'public'
    AND    tablename IN (
      'usuarios', 'pacientes', 'formularios_recebidos',
      'delegacao_controle', 'tarefas', 'protocolos_base', 'historico_entregas'
    )
  LOOP
    IF NOT v_rec.rowsecurity THEN
      RAISE EXCEPTION 'FAIL ✗ — RLS não habilitado em public.%', v_rec.tablename;
    END IF;
    RAISE NOTICE 'PASS ✓ — RLS habilitado em public.%', v_rec.tablename;
  END LOOP;
END $$;

-- =============================================================
-- BLOCO 3: Contagem mínima de políticas RLS
-- =============================================================
DO $$
DECLARE
  v_count     int;
  v_tabela    text;
  v_min_pols  int;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════';
  RAISE NOTICE 'BLOCO 3: Políticas RLS criadas';
  RAISE NOTICE '══════════════════════════════════════════';

  -- Total geral (esperamos pelo menos 18)
  SELECT COUNT(*) INTO v_count FROM pg_policies WHERE schemaname = 'public';
  IF v_count < 18 THEN
    RAISE EXCEPTION 'FAIL ✗ — Esperado ≥18 políticas RLS, encontrado %', v_count;
  END IF;
  RAISE NOTICE 'PASS ✓ — % políticas RLS encontradas', v_count;

  -- tarefas: tabela mais crítica — deve ter pelo menos 5 políticas
  SELECT COUNT(*) INTO v_count
  FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tarefas';
  IF v_count < 5 THEN
    RAISE EXCEPTION 'FAIL ✗ — tarefas: esperado ≥5 políticas, encontrado %', v_count;
  END IF;
  RAISE NOTICE 'PASS ✓ — tarefas tem % políticas RLS', v_count;

  -- pacientes: deve ter pelo menos 4 políticas
  SELECT COUNT(*) INTO v_count
  FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pacientes';
  IF v_count < 4 THEN
    RAISE EXCEPTION 'FAIL ✗ — pacientes: esperado ≥4 políticas, encontrado %', v_count;
  END IF;
  RAISE NOTICE 'PASS ✓ — pacientes tem % políticas RLS', v_count;
END $$;

-- =============================================================
-- BLOCO 4: Indexes criados
-- =============================================================
DO $$
DECLARE
  v_count int;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════';
  RAISE NOTICE 'BLOCO 4: Indexes';
  RAISE NOTICE '══════════════════════════════════════════';

  SELECT COUNT(*) INTO v_count
  FROM   pg_indexes
  WHERE  schemaname = 'public' AND indexname LIKE 'idx_%';

  IF v_count < 12 THEN
    RAISE EXCEPTION 'FAIL ✗ — Esperado ≥12 indexes, encontrado %', v_count;
  END IF;
  RAISE NOTICE 'PASS ✓ — % indexes encontrados', v_count;

  -- Verifica indexes críticos individualmente
  PERFORM 1 FROM pg_indexes
  WHERE schemaname = 'public' AND indexname = 'idx_tarefas_modulo_status';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'FAIL ✗ — idx_tarefas_modulo_status não encontrado';
  END IF;
  RAISE NOTICE 'PASS ✓ — idx_tarefas_modulo_status existe';

  PERFORM 1 FROM pg_indexes
  WHERE schemaname = 'public' AND indexname = 'idx_pacientes_proximo_retorno';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'FAIL ✗ — idx_pacientes_proximo_retorno não encontrado';
  END IF;
  RAISE NOTICE 'PASS ✓ — idx_pacientes_proximo_retorno existe';
END $$;

-- =============================================================
-- BLOCO 5: Foreign keys
-- =============================================================
DO $$
DECLARE
  v_count int;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════';
  RAISE NOTICE 'BLOCO 5: Foreign Keys';
  RAISE NOTICE '══════════════════════════════════════════';

  SELECT COUNT(*) INTO v_count
  FROM   information_schema.table_constraints
  WHERE  constraint_type = 'FOREIGN KEY' AND table_schema = 'public';

  IF v_count < 8 THEN
    RAISE EXCEPTION 'FAIL ✗ — Esperado ≥8 foreign keys, encontrado %', v_count;
  END IF;
  RAISE NOTICE 'PASS ✓ — % foreign keys encontradas', v_count;
END $$;

-- =============================================================
-- BLOCO 6: Check constraints das regras de negócio
-- =============================================================
DO $$
DECLARE
  v_count int;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════';
  RAISE NOTICE 'BLOCO 6: Check constraints (regras de negócio)';
  RAISE NOTICE '══════════════════════════════════════════';

  -- chk_modulo_d_bloqueada: Módulo D deve ter tarefa_pai_id
  SELECT COUNT(*) INTO v_count
  FROM information_schema.table_constraints
  WHERE constraint_name = 'chk_modulo_d_bloqueada' AND table_schema = 'public';
  IF v_count = 0 THEN
    RAISE EXCEPTION 'FAIL ✗ — Constraint chk_modulo_d_bloqueada não encontrada';
  END IF;
  RAISE NOTICE 'PASS ✓ — chk_modulo_d_bloqueada existe';

  -- chk_gravado_apenas_modulo_c: status gravado só para Módulo C
  SELECT COUNT(*) INTO v_count
  FROM information_schema.table_constraints
  WHERE constraint_name = 'chk_gravado_apenas_modulo_c' AND table_schema = 'public';
  IF v_count = 0 THEN
    RAISE EXCEPTION 'FAIL ✗ — Constraint chk_gravado_apenas_modulo_c não encontrada';
  END IF;
  RAISE NOTICE 'PASS ✓ — chk_gravado_apenas_modulo_c existe';

  -- delegacao_unica: garante exatamente 1 linha
  SELECT COUNT(*) INTO v_count
  FROM pg_indexes
  WHERE schemaname = 'public' AND indexname = 'idx_delegacao_unica';
  IF v_count = 0 THEN
    RAISE EXCEPTION 'FAIL ✗ — idx_delegacao_unica não encontrado';
  END IF;
  RAISE NOTICE 'PASS ✓ — idx_delegacao_unica existe (garante 1 linha em delegacao_controle)';
END $$;

-- =============================================================
-- BLOCO 7: Dados de seed
-- =============================================================
DO $$
DECLARE
  v_count int;
  v_status text;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════';
  RAISE NOTICE 'BLOCO 7: Dados de Seed';
  RAISE NOTICE '══════════════════════════════════════════';

  SELECT COUNT(*) INTO v_count FROM public.usuarios WHERE email LIKE '%seed.jhteam.test%';
  IF v_count < 6 THEN
    RAISE EXCEPTION 'FAIL ✗ — Esperado 6 usuários seed, encontrado %', v_count;
  END IF;
  RAISE NOTICE 'PASS ✓ — % usuários seed encontrados', v_count;

  SELECT COUNT(*) INTO v_count FROM public.pacientes WHERE email LIKE '%seed.jhteam.test%';
  IF v_count != 3 THEN
    RAISE EXCEPTION 'FAIL ✗ — Esperado 3 pacientes seed, encontrado %', v_count;
  END IF;
  RAISE NOTICE 'PASS ✓ — 3 pacientes seed encontrados';

  SELECT COUNT(*) INTO v_count FROM public.tarefas WHERE observacoes_joao LIKE '%[SEED]%';
  IF v_count != 3 THEN
    RAISE EXCEPTION 'FAIL ✗ — Esperado 3 tarefas seed, encontrado %', v_count;
  END IF;
  RAISE NOTICE 'PASS ✓ — 3 tarefas seed encontradas';

  SELECT COUNT(*) INTO v_count FROM public.delegacao_controle;
  IF v_count != 1 THEN
    RAISE EXCEPTION 'FAIL ✗ — delegacao_controle deve ter exatamente 1 linha, encontrado %', v_count;
  END IF;
  RAISE NOTICE 'PASS ✓ — delegacao_controle tem exatamente 1 linha';

  -- Verifica que Módulo D está bloqueado (depende do Módulo C)
  SELECT status INTO v_status
  FROM public.tarefas
  WHERE id = '20000000-0000-0000-0000-000000000002';
  IF v_status IS DISTINCT FROM 'bloqueada' THEN
    RAISE EXCEPTION 'FAIL ✗ — Tarefa Módulo D deveria estar "bloqueada", status atual: %', v_status;
  END IF;
  RAISE NOTICE 'PASS ✓ — Tarefa Módulo D está bloqueada (aguardando gravação do Módulo C)';

  -- Verifica que tarefa_pai_id do Módulo D aponta para Módulo C
  SELECT COUNT(*) INTO v_count
  FROM public.tarefas t_d
  JOIN public.tarefas t_c ON t_c.id = t_d.tarefa_pai_id
  WHERE t_d.id = '20000000-0000-0000-0000-000000000002'
    AND t_c.modulo = 'C';
  IF v_count = 0 THEN
    RAISE EXCEPTION 'FAIL ✗ — tarefa_pai_id do Módulo D não aponta para uma tarefa Módulo C';
  END IF;
  RAISE NOTICE 'PASS ✓ — tarefa_pai_id do Módulo D aponta corretamente para Módulo C';
END $$;

-- =============================================================
-- BLOCO 8: Trigger de desbloqueio do Módulo D
-- =============================================================
DO $$
DECLARE
  v_status text;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════';
  RAISE NOTICE 'BLOCO 8: Trigger desbloquear_modulo_d';
  RAISE NOTICE '══════════════════════════════════════════';

  -- Estado inicial: D deve estar bloqueada
  SELECT status INTO v_status FROM public.tarefas
  WHERE id = '20000000-0000-0000-0000-000000000002';
  IF v_status IS DISTINCT FROM 'bloqueada' THEN
    RAISE EXCEPTION 'FAIL ✗ — Pré-condição: Módulo D deveria estar bloqueado, status: %', v_status;
  END IF;
  RAISE NOTICE 'PASS ✓ — Pré-condição: Módulo D está bloqueado';

  -- Simula João marcando Módulo C como gravado
  UPDATE public.tarefas
  SET    status = 'gravado'
  WHERE  id = '20000000-0000-0000-0000-000000000001';
  RAISE NOTICE 'INFO  — Módulo C atualizado para "gravado" (simula João gravar vídeo)';

  -- Verifica se trigger desbloqueou Módulo D
  SELECT status INTO v_status FROM public.tarefas
  WHERE id = '20000000-0000-0000-0000-000000000002';
  IF v_status IS DISTINCT FROM 'pendente' THEN
    RAISE EXCEPTION 'FAIL ✗ — Trigger não desbloqueou Módulo D. Status atual: % (esperado: pendente)', v_status;
  END IF;
  RAISE NOTICE 'PASS ✓ — Trigger desbloqueou Módulo D: bloqueada → pendente';

  -- Restaura estado do seed para não afetar outros testes
  UPDATE public.tarefas SET status = 'feito'     WHERE id = '20000000-0000-0000-0000-000000000001';
  UPDATE public.tarefas SET status = 'bloqueada' WHERE id = '20000000-0000-0000-0000-000000000002';
  RAISE NOTICE 'INFO  — Estado do seed restaurado';
END $$;

-- =============================================================
-- BLOCO 9: Funções helper de RLS
-- =============================================================
DO $$
DECLARE
  v_count int;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════';
  RAISE NOTICE 'BLOCO 9: Funções helper de RLS';
  RAISE NOTICE '══════════════════════════════════════════';

  SELECT COUNT(*) INTO v_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'meu_perfil';
  IF v_count = 0 THEN
    RAISE EXCEPTION 'FAIL ✗ — Função public.meu_perfil() não encontrada';
  END IF;
  RAISE NOTICE 'PASS ✓ — Função public.meu_perfil() existe';

  SELECT COUNT(*) INTO v_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'tem_perfil';
  IF v_count = 0 THEN
    RAISE EXCEPTION 'FAIL ✗ — Função public.tem_perfil() não encontrada';
  END IF;
  RAISE NOTICE 'PASS ✓ — Função public.tem_perfil() existe';
END $$;

-- =============================================================
-- RESULTADO FINAL
-- =============================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════';
  RAISE NOTICE '✅ TODOS OS SMOKE TESTS PASSARAM';
  RAISE NOTICE '══════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Para validação completa de RLS por perfil:';
  RAISE NOTICE '  Use set_config(''request.jwt.claims'', ''{"sub":"<uid>","role":"authenticated"}'', true)';
  RAISE NOTICE '  E verifique que cada SELECT retorna apenas os dados permitidos para o perfil.';
  RAISE NOTICE '';
  RAISE NOTICE 'Exemplo para testar como aluno (substitua o UUID):';
  RAISE NOTICE '  SELECT set_config(''request.jwt.claims'', jsonb_build_object(''sub'', ''00000000-0000-0000-0000-000000000004'')::text, true);';
  RAISE NOTICE '  SELECT * FROM pacientes;   -- deve retornar apenas dados de Ana Silva';
  RAISE NOTICE '  SELECT * FROM tarefas;     -- deve retornar 0 linhas (aluno não vê tarefas)';
END $$;
