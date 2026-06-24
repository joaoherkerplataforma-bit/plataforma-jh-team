-- =============================================================
-- Migration: 20260624000001_create_periodos_plano
-- Historico de ciclos de plano por paciente (renovacoes)
-- Usado para arquivar o estado anterior ao renovar um plano vencido.
-- IMPORTANTE: nao reutilizar o termo "ciclo" — ele ja existe em
-- lib/formularios.ts com significado de retorno mensal (fotos/feedback).
-- =============================================================

CREATE TABLE public.periodos_plano (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id          uuid        NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  data_inicio          date        NOT NULL,
  data_vencimento_plano date       NOT NULL,
  tipo_plano           text        NOT NULL CHECK (tipo_plano IN ('dieta', 'completo')),
  duracao_plano        text        NOT NULL CHECK (duracao_plano IN ('trimestral', 'semestral', 'anual')),
  encerrado_em         timestamptz,           -- NULL = periodo ativo
  renovado_por         uuid        REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.periodos_plano               IS 'Historico de periodos de plano de cada paciente. encerrado_em NULL = periodo ativo.';
COMMENT ON COLUMN public.periodos_plano.encerrado_em  IS 'Preenchido quando o periodo eh encerrado por renovacao. NULL = periodo em vigor.';
COMMENT ON COLUMN public.periodos_plano.renovado_por  IS 'Usuario joao_admin que executou a renovacao.';

ALTER TABLE public.periodos_plano ENABLE ROW LEVEL SECURITY;

CREATE POLICY "periodos_admin_all" ON public.periodos_plano
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND perfil = 'joao_admin')
  );

CREATE POLICY "periodos_equipe_select" ON public.periodos_plano
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND perfil IN ('joao_admin','pablo','joao_estagiario'))
  );

-- FKs nullable em tabelas existentes (backward-compatible — dados anteriores ficam com periodo_id NULL)
ALTER TABLE public.tarefas              ADD COLUMN IF NOT EXISTS periodo_id uuid REFERENCES public.periodos_plano(id) ON DELETE SET NULL;
ALTER TABLE public.formularios_recebidos ADD COLUMN IF NOT EXISTS periodo_id uuid REFERENCES public.periodos_plano(id) ON DELETE SET NULL;

CREATE INDEX idx_periodos_paciente  ON public.periodos_plano(paciente_id, created_at DESC);
CREATE INDEX idx_tarefas_periodo    ON public.tarefas(periodo_id) WHERE periodo_id IS NOT NULL;
CREATE INDEX idx_forms_periodo      ON public.formularios_recebidos(periodo_id) WHERE periodo_id IS NOT NULL;
