-- =============================================================
-- Migration: 20260620000001_add_obs_operacionais_pacientes
-- Adiciona campo de observações operacionais ao paciente.
-- Visível exclusivamente em /tarefas (B/C/D/E), não em /pacientes.
-- =============================================================

ALTER TABLE public.pacientes
  ADD COLUMN IF NOT EXISTS observacoes_operacionais text;

COMMENT ON COLUMN public.pacientes.observacoes_operacionais
  IS 'Contexto operacional visível em /tarefas (módulos B/C/D/E). Editável por joao_admin, pablo e joao_estagiario. Não exposto em /pacientes.';
