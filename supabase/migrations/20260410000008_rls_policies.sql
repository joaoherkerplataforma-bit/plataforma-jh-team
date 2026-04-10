-- =============================================================
-- Migration: 20260410000008_rls_policies
-- Políticas de Row Level Security para todos os perfis:
--   joao_admin     → lê e escreve em tudo
--   pablo          → lê e escreve módulos B, C e D
--   joao_estagiario→ lê e escreve apenas módulo B
--   aluno          → lê apenas seus próprios dados
-- =============================================================
-- NOTA IMPORTANTE: webhooks e serviços de backend (Railway, Make)
-- usam service_role key que BYPASSA estas políticas por design.
-- Nunca expor service_role key no browser.
-- =============================================================

-- =============================================================
-- FUNÇÕES HELPER
-- Usam SECURITY DEFINER + STABLE para execução eficiente
-- =============================================================

-- Retorna o perfil do usuário autenticado atual
CREATE OR REPLACE FUNCTION public.meu_perfil()
RETURNS text AS $$
  SELECT perfil
  FROM   public.usuarios
  WHERE  id    = auth.uid()
  AND    ativo = true
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Retorna true se o usuário autenticado tem o perfil informado
CREATE OR REPLACE FUNCTION public.tem_perfil(p text)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.usuarios
    WHERE  id     = auth.uid()
    AND    perfil = p
    AND    ativo  = true
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================================
-- TABELA: usuarios
-- =============================================================
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- joao_admin: acesso total
CREATE POLICY "usuarios_admin_all" ON public.usuarios
  FOR ALL TO authenticated
  USING      (public.tem_perfil('joao_admin'))
  WITH CHECK (public.tem_perfil('joao_admin'));

-- Qualquer usuário autenticado lê seu próprio registro (necessário para session)
CREATE POLICY "usuarios_self_select" ON public.usuarios
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- =============================================================
-- TABELA: pacientes
-- =============================================================
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;

-- joao_admin: acesso total (criação, edição, exclusão)
CREATE POLICY "pacientes_admin_all" ON public.pacientes
  FOR ALL TO authenticated
  USING      (public.tem_perfil('joao_admin'))
  WITH CHECK (public.tem_perfil('joao_admin'));

-- pablo: lê todos os pacientes (precisa do contexto para módulos B/C/D)
CREATE POLICY "pacientes_pablo_select" ON public.pacientes
  FOR SELECT TO authenticated
  USING (public.tem_perfil('pablo'));

-- joao_estagiario: lê todos os pacientes (precisa ver dados para executar tarefa B)
CREATE POLICY "pacientes_estagiario_select" ON public.pacientes
  FOR SELECT TO authenticated
  USING (public.tem_perfil('joao_estagiario'));

-- aluno: lê apenas seus próprios dados (portal do aluno)
CREATE POLICY "pacientes_aluno_self" ON public.pacientes
  FOR SELECT TO authenticated
  USING (
    public.tem_perfil('aluno')
    AND usuario_id = auth.uid()
  );

-- =============================================================
-- TABELA: formularios_recebidos
-- =============================================================
ALTER TABLE public.formularios_recebidos ENABLE ROW LEVEL SECURITY;

-- joao_admin: acesso total (inclusive fila de revisão de matches ambíguos)
CREATE POLICY "formularios_admin_all" ON public.formularios_recebidos
  FOR ALL TO authenticated
  USING      (public.tem_perfil('joao_admin'))
  WITH CHECK (public.tem_perfil('joao_admin'));

-- pablo: lê formulários dos seus pacientes (contexto para montagem de protocolo)
CREATE POLICY "formularios_pablo_select" ON public.formularios_recebidos
  FOR SELECT TO authenticated
  USING (public.tem_perfil('pablo'));

-- joao_estagiario: lê formulários para executar protocolo novo (módulo B)
CREATE POLICY "formularios_estagiario_select" ON public.formularios_recebidos
  FOR SELECT TO authenticated
  USING (public.tem_perfil('joao_estagiario'));

-- =============================================================
-- TABELA: delegacao_controle
-- =============================================================
ALTER TABLE public.delegacao_controle ENABLE ROW LEVEL SECURITY;

-- joao_admin: leitura e escrita (auditoria e ajuste manual se necessário)
CREATE POLICY "delegacao_admin_all" ON public.delegacao_controle
  FOR ALL TO authenticated
  USING      (public.tem_perfil('joao_admin'))
  WITH CHECK (public.tem_perfil('joao_admin'));

-- Nenhum outro perfil acessa diretamente — atualizações são feitas
-- pelo backend (service_role via webhooks/Next.js API routes)

-- =============================================================
-- TABELA: tarefas
-- =============================================================
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;

-- joao_admin: acesso total (cria, edita, delega, marca entregue em qualquer módulo)
CREATE POLICY "tarefas_admin_all" ON public.tarefas
  FOR ALL TO authenticated
  USING      (public.tem_perfil('joao_admin'))
  WITH CHECK (public.tem_perfil('joao_admin'));

-- pablo: vê todas as tarefas dos módulos B, C e D (visão consolidada)
CREATE POLICY "tarefas_pablo_select" ON public.tarefas
  FOR SELECT TO authenticated
  USING (
    public.tem_perfil('pablo')
    AND modulo IN ('B', 'C', 'D')
  );

-- pablo: atualiza status das tarefas que são suas (marca feito/gravado)
CREATE POLICY "tarefas_pablo_update" ON public.tarefas
  FOR UPDATE TO authenticated
  USING (
    public.tem_perfil('pablo')
    AND modulo         IN ('B', 'C', 'D')
    AND responsavel_id  = auth.uid()
  )
  WITH CHECK (
    public.tem_perfil('pablo')
    AND modulo IN ('B', 'C', 'D')
  );

-- joao_estagiario: vê apenas tarefas do módulo B
CREATE POLICY "tarefas_estagiario_select" ON public.tarefas
  FOR SELECT TO authenticated
  USING (
    public.tem_perfil('joao_estagiario')
    AND modulo = 'B'
  );

-- joao_estagiario: atualiza apenas suas tarefas do módulo B (marca feito)
CREATE POLICY "tarefas_estagiario_update" ON public.tarefas
  FOR UPDATE TO authenticated
  USING (
    public.tem_perfil('joao_estagiario')
    AND modulo         = 'B'
    AND responsavel_id = auth.uid()
  )
  WITH CHECK (
    public.tem_perfil('joao_estagiario')
    AND modulo = 'B'
  );

-- =============================================================
-- TABELA: protocolos_base
-- =============================================================
ALTER TABLE public.protocolos_base ENABLE ROW LEVEL SECURITY;

-- joao_admin: acesso total
CREATE POLICY "protocolos_admin_all" ON public.protocolos_base
  FOR ALL TO authenticated
  USING      (public.tem_perfil('joao_admin'))
  WITH CHECK (public.tem_perfil('joao_admin'));

-- pablo: lê protocolos (para saber versão atual ao fazer atualização de dieta)
CREATE POLICY "protocolos_pablo_select" ON public.protocolos_base
  FOR SELECT TO authenticated
  USING (public.tem_perfil('pablo'));

-- aluno: lê apenas seus protocolos ativos (portal do aluno)
CREATE POLICY "protocolos_aluno_self" ON public.protocolos_base
  FOR SELECT TO authenticated
  USING (
    public.tem_perfil('aluno')
    AND paciente_id IN (
      SELECT id FROM public.pacientes WHERE usuario_id = auth.uid()
    )
  );

-- =============================================================
-- TABELA: historico_entregas
-- =============================================================
ALTER TABLE public.historico_entregas ENABLE ROW LEVEL SECURITY;

-- joao_admin: acesso total
CREATE POLICY "historico_admin_all" ON public.historico_entregas
  FOR ALL TO authenticated
  USING      (public.tem_perfil('joao_admin'))
  WITH CHECK (public.tem_perfil('joao_admin'));

-- pablo: lê todo o histórico (contexto para execução dos módulos)
CREATE POLICY "historico_pablo_select" ON public.historico_entregas
  FOR SELECT TO authenticated
  USING (public.tem_perfil('pablo'));

-- pablo: registra entregas que ele realizou
CREATE POLICY "historico_pablo_insert" ON public.historico_entregas
  FOR INSERT TO authenticated
  WITH CHECK (
    public.tem_perfil('pablo')
    AND entregue_por = auth.uid()
  );

-- joao_estagiario: lê histórico (contexto para módulo B)
CREATE POLICY "historico_estagiario_select" ON public.historico_entregas
  FOR SELECT TO authenticated
  USING (public.tem_perfil('joao_estagiario'));

-- joao_estagiario: registra entregas do módulo B
CREATE POLICY "historico_estagiario_insert" ON public.historico_entregas
  FOR INSERT TO authenticated
  WITH CHECK (
    public.tem_perfil('joao_estagiario')
    AND entregue_por = auth.uid()
  );

-- aluno: lê apenas seu próprio histórico (portal do aluno)
CREATE POLICY "historico_aluno_self" ON public.historico_entregas
  FOR SELECT TO authenticated
  USING (
    public.tem_perfil('aluno')
    AND paciente_id IN (
      SELECT id FROM public.pacientes WHERE usuario_id = auth.uid()
    )
  );
