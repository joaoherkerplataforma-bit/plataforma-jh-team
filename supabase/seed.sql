-- =============================================================
-- Seed: dados de teste fictícios — JH TEAM
-- Idempotente: pode ser executado múltiplas vezes com segurança
-- =============================================================
-- ATENÇÃO: Em ambiente Supabase real, os usuários precisam existir
-- em auth.users ANTES de serem inseridos em public.usuarios.
-- Para dev local: use `supabase db reset` que aplica migrations + seed.
-- Para produção: nunca executar este arquivo.
-- =============================================================

-- Limpeza idempotente (ordem respeita FK: filhos antes de pais)
DELETE FROM public.historico_entregas  WHERE observacoes   LIKE '%[SEED]%';
DELETE FROM public.tarefas             WHERE observacoes_joao LIKE '%[SEED]%';
DELETE FROM public.formularios_recebidos WHERE dados_raw->>'fonte' = 'seed_test';
DELETE FROM public.protocolos_base     WHERE link_webdiet LIKE '%seed.jhteam.test%';
DELETE FROM public.pacientes           WHERE email LIKE '%seed.jhteam.test%';
DELETE FROM public.usuarios            WHERE email LIKE '%seed.jhteam.test%';
DELETE FROM public.delegacao_controle;

-- =============================================================
-- 1. CONTROLE DE DELEGAÇÃO (estado inicial)
-- =============================================================
INSERT INTO public.delegacao_controle (ultimo_delegado, contador)
VALUES ('pablo', 4);
-- Leitura: próxima delegação vai para joao_estagiario

-- =============================================================
-- 2. USUÁRIOS DA EQUIPE + ALUNOS
-- =============================================================
-- NOTA: Em Supabase real, auth.users é criado pelo Auth antes desta inserção.
-- Para testes locais com supabase start, inserimos diretamente em auth.users
-- ou usamos IDs fixos após criar os usuários via Supabase Auth UI.
-- Os UUIDs abaixo são fixos para facilitar testes reproduzíveis.

INSERT INTO public.usuarios (id, nome, email, perfil, ativo) VALUES
  -- Equipe interna
  ('00000000-0000-0000-0000-000000000001', 'João Herker',        'joao@seed.jhteam.test',       'joao_admin',      true),
  ('00000000-0000-0000-0000-000000000002', 'Pablo',              'pablo@seed.jhteam.test',      'pablo',           true),
  ('00000000-0000-0000-0000-000000000003', 'João Estagiário',    'estagiario@seed.jhteam.test', 'joao_estagiario', true),
  -- Alunos com portal
  ('00000000-0000-0000-0000-000000000004', 'Ana Silva',          'ana@seed.jhteam.test',        'aluno',           true),
  ('00000000-0000-0000-0000-000000000005', 'Carlos Mendes',      'carlos@seed.jhteam.test',     'aluno',           true),
  ('00000000-0000-0000-0000-000000000006', 'Fernanda Costa',     'fernanda@seed.jhteam.test',   'aluno',           true);

-- =============================================================
-- 3. PACIENTES (3 cenários de negócio distintos)
-- =============================================================

INSERT INTO public.pacientes (
  id, nome, email, telefone,
  tipo_plano, duracao_plano,
  data_inicio, data_vencimento_plano, proximo_retorno,
  status, observacoes, usuario_id
) VALUES

  -- Paciente 1: Ana Silva — retorno PRÓXIMO (2 dias) → cor LARANJA no dashboard
  (
    '10000000-0000-0000-0000-000000000001',
    'Ana Silva',
    'ana@seed.jhteam.test',
    '51 91234-5678',
    'completo',
    'trimestral',
    '2026-01-15',
    '2026-04-15',
    '2026-04-12',   -- 2 dias a partir de hoje (10/04) → LARANJA
    'ativo',
    'Vegetariana estrita. Tem academia em casa com halteres até 15kg. Meta: hipertrofia moderada. Histórico: joelho direito fraco (evitar agachamento profundo).',
    '00000000-0000-0000-0000-000000000004'
  ),

  -- Paciente 2: Carlos Mendes — plano VENCENDO HOJE → dashboard especial
  (
    '10000000-0000-0000-0000-000000000002',
    'Carlos Mendes',
    'carlos@seed.jhteam.test',
    '51 98765-4321',
    'dieta',
    'semestral',
    '2025-10-10',
    '2026-04-10',   -- Vence hoje → notificação no relatório diário
    '2026-04-20',
    'ativo',
    'Trabalha noturno (20h-4h). Refeições principais após 20h. Alérgico a crustáceos. Meta: manutenção de peso com foco em saúde.',
    '00000000-0000-0000-0000-000000000005'
  ),

  -- Paciente 3: Fernanda Costa — paciente NOVA, retorno distante → sem cor especial
  (
    '10000000-0000-0000-0000-000000000003',
    'Fernanda Costa',
    'fernanda@seed.jhteam.test',
    '51 93333-7777',
    'completo',
    'anual',
    '2026-03-01',
    '2027-03-01',
    '2026-04-30',   -- 20 dias → neutro (sem cor)
    'ativo',
    'PACIENTE NOVA. Primeira experiência com consultoria. Ansiosa com resultados — tratar com cuidado no retorno. Intolerante a glúten (doença celíaca). Treina MWF às 7h.',
    '00000000-0000-0000-0000-000000000006'
  );

-- =============================================================
-- 4. FORMULÁRIOS RECEBIDOS
-- =============================================================

-- Anamnese de Fernanda (paciente nova) — processado, gerou tarefa B
INSERT INTO public.formularios_recebidos
  (paciente_id, tipo_formulario, dados_raw, nome_formulario, email_formulario, processado)
VALUES (
  '10000000-0000-0000-0000-000000000003',
  'anamnese',
  '{
    "fonte": "seed_test",
    "nome_completo": "Fernanda Costa",
    "email": "fernanda@seed.jhteam.test",
    "telefone": "51 93333-7777",
    "plano_fechado": "Completo Anual",
    "rotina_diaria": "Acorda 5h30, treina 7h, trabalha 9h-18h",
    "historico_alimentar": "Celíaca diagnosticada 2023, nunca fez dieta profissional",
    "objetivo": "Perder 8kg e ganhar definição muscular",
    "restricoes": "Sem glúten (obrigatório), sem amendoim"
  }',
  'Fernanda Costa',
  'fernanda@seed.jhteam.test',
  true
);

-- Fotos de 30 dias de Ana Silva — processado, gerou tarefas C e D
INSERT INTO public.formularios_recebidos
  (paciente_id, tipo_formulario, dados_raw, nome_formulario, email_formulario, processado)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  'fotos_30dias',
  '{
    "fonte": "seed_test",
    "nome_completo": "Ana Silva",
    "email": "ana@seed.jhteam.test",
    "comentario": "Senti ótima evolução! Subi 2kg na agachada"
  }',
  'Ana Silva',
  'ana@seed.jhteam.test',
  true
);

-- =============================================================
-- 5. TAREFAS
-- =============================================================

-- Tarefa Módulo C: Ana Silva — Pablo fez o Canva (status: feito)
INSERT INTO public.tarefas (
  id, paciente_id, modulo, responsavel_id,
  status, data_criacao, data_prazo, observacoes_joao
) VALUES (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'C',
  '00000000-0000-0000-0000-000000000002',  -- Pablo
  'feito',
  '2026-04-08',
  '2026-04-12',
  '[SEED] Ana mandou ótimas fotos. Canva já existe da sessão anterior — atualizar seção "30 dias" mantendo layout. Usar foto frontal + lateral esquerda.'
);

-- Tarefa Módulo D: Ana Silva — BLOQUEADA aguardando João gravar (tarefa_pai = Módulo C acima)
INSERT INTO public.tarefas (
  id, paciente_id, modulo, responsavel_id,
  status, data_criacao, data_prazo, tarefa_pai_id, observacoes_joao
) VALUES (
  '20000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000001',
  'D',
  '00000000-0000-0000-0000-000000000002',  -- Pablo
  'bloqueada',
  '2026-04-08',
  '2026-04-15',
  '20000000-0000-0000-0000-000000000001',  -- Pai: tarefa C da Ana
  '[SEED] Dieta: manter calorias, reduzir carboidrato simples pós-treino (estava exagerando no frango c/ batata). Aumentar proteína das refeições 2 e 4.'
);

-- Tarefa Módulo B: Fernanda Costa — PENDENTE para João Estagiário
INSERT INTO public.tarefas (
  id, paciente_id, modulo, responsavel_id,
  status, data_criacao, data_prazo, observacoes_joao
) VALUES (
  '20000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000003',
  'B',
  '00000000-0000-0000-0000-000000000003',  -- João Estagiário
  'pendente',
  '2026-04-09',
  '2026-04-12',
  '[SEED] PACIENTE NOVA — ler anamnese com atenção antes de começar. CELÍACA: zero glúten em tudo. Plano completo: dieta + treino MWF. Treino iniciante: sem agachamento livre ainda.'
);

-- =============================================================
-- 6. PROTOCOLOS BASE
-- =============================================================

-- Protocolo v3 de Ana Silva (2 renovações + inicial = versão 3)
INSERT INTO public.protocolos_base
  (paciente_id, tipo, link_webdiet, link_mfit, versao, ativo)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  'dieta_e_treino',
  'https://webdiet.seed.jhteam.test/ana-silva-v3',
  'https://mfit.seed.jhteam.test/ana-silva-v3',
  3,
  true
);

-- =============================================================
-- 7. HISTÓRICO DE ENTREGAS (Ana Silva — 3 ciclos)
-- =============================================================

INSERT INTO public.historico_entregas
  (paciente_id, tipo_entrega, entregue_por, entregue_em, observacoes)
VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    'protocolo_inicial',
    '00000000-0000-0000-0000-000000000002',  -- Pablo
    '2026-01-18 10:30:00+00',
    '[SEED] Primeiro protocolo entregue via WhatsApp. Dieta: 1800kcal. Treino: A/B/A.'
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    'antes_depois',
    '00000000-0000-0000-0000-000000000001',  -- João (confirmou a entrega)
    '2026-02-15 16:00:00+00',
    '[SEED] Antes/Depois 30 dias — boa evolução visível. Enviado via WhatsApp.'
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    'retorno_30dias',
    '00000000-0000-0000-0000-000000000002',  -- Pablo
    '2026-02-18 14:00:00+00',
    '[SEED] Retorno 30 dias — subiu carga nos exercícios de costas. Mantida kcal, ajuste de macros.'
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    'retorno_30dias',
    '00000000-0000-0000-0000-000000000001',  -- João (entregou pessoalmente)
    '2026-03-18 09:15:00+00',
    '[SEED] Retorno 60 dias — ajuste no treino: incluído supino e remada. Aumentado carbo pré-treino.'
  );

-- =============================================================
-- RESUMO DO ESTADO DO SEED
-- =============================================================
DO $$
BEGIN
  RAISE NOTICE '=== SEED APLICADO COM SUCESSO ===';
  RAISE NOTICE 'Usuários: 6 (3 equipe + 3 alunos)';
  RAISE NOTICE 'Pacientes: 3 (Ana=retorno próximo, Carlos=plano vencendo hoje, Fernanda=paciente nova)';
  RAISE NOTICE 'Tarefas: 3 (C=feito, D=bloqueada, B=pendente)';
  RAISE NOTICE 'Formulários: 2 (anamnese Fernanda + fotos 30d Ana)';
  RAISE NOTICE 'Protocolos: 1 (Ana v3 ativo)';
  RAISE NOTICE 'Histórico entregas: 4 (3 ciclos de Ana)';
  RAISE NOTICE 'Delegação controle: ultimo=pablo, próximo=joao_estagiario';
END $$;
