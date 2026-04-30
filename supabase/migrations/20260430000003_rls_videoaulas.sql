-- =============================================================
-- Migration: 20260430000003_rls_videoaulas
-- Row Level Security para videoaulas e progresso_videoaulas.
--
-- Equipe operacional (joao_admin + pablo + joao_estagiario):
--   - videoaulas         → full CRUD (cadastram, editam, arquivam)
--   - progresso_videoaulas → leitura/edição total (auditoria, reset)
--
-- Aluno:
--   - videoaulas         → SELECT apenas dos vídeos ativos
--   - progresso_videoaulas → SELECT/INSERT apenas do PRÓPRIO progresso
--                            (sem UPDATE nem DELETE — bloqueado por padrão)
--
-- Webhooks/serviços continuam usando service_role e bypassam RLS.
-- =============================================================

-- =============================================================
-- TABELA: videoaulas
-- =============================================================
ALTER TABLE public.videoaulas ENABLE ROW LEVEL SECURITY;

-- Equipe (joao_admin + pablo + joao_estagiario): full CRUD do catálogo
CREATE POLICY "videoaulas_equipe_all" ON public.videoaulas
  FOR ALL TO authenticated
  USING      (
    public.tem_perfil('joao_admin')
    OR public.tem_perfil('pablo')
    OR public.tem_perfil('joao_estagiario')
  )
  WITH CHECK (
    public.tem_perfil('joao_admin')
    OR public.tem_perfil('pablo')
    OR public.tem_perfil('joao_estagiario')
  );

-- Aluno: lê apenas videoaulas ativas (vídeos arquivados ficam invisíveis)
CREATE POLICY "videoaulas_aluno_select" ON public.videoaulas
  FOR SELECT TO authenticated
  USING (
    public.tem_perfil('aluno')
    AND ativo = true
  );

-- =============================================================
-- TABELA: progresso_videoaulas
-- =============================================================
ALTER TABLE public.progresso_videoaulas ENABLE ROW LEVEL SECURITY;

-- Equipe: lê todos os progressos (auditoria) e pode resetar/ajustar
CREATE POLICY "progresso_equipe_all" ON public.progresso_videoaulas
  FOR ALL TO authenticated
  USING      (
    public.tem_perfil('joao_admin')
    OR public.tem_perfil('pablo')
    OR public.tem_perfil('joao_estagiario')
  )
  WITH CHECK (
    public.tem_perfil('joao_admin')
    OR public.tem_perfil('pablo')
    OR public.tem_perfil('joao_estagiario')
  );

-- Aluno: lê APENAS seu próprio progresso
CREATE POLICY "progresso_aluno_self_select" ON public.progresso_videoaulas
  FOR SELECT TO authenticated
  USING (
    public.tem_perfil('aluno')
    AND aluno_id = auth.uid()
  );

-- Aluno: insere progresso APENAS para si mesmo (registra que assistiu)
CREATE POLICY "progresso_aluno_self_insert" ON public.progresso_videoaulas
  FOR INSERT TO authenticated
  WITH CHECK (
    public.tem_perfil('aluno')
    AND aluno_id = auth.uid()
  );

-- Aluno NÃO pode UPDATE nem DELETE (sem policy → bloqueado por padrão).
-- Append-only: progresso é histórico imutável do ponto de vista do aluno.
