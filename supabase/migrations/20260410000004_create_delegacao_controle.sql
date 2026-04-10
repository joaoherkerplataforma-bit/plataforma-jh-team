-- =============================================================
-- Migration: 20260410000004_create_delegacao_controle
-- Controla a alternância Pablo ↔ João Estagiário nos pacientes novos (Módulo B)
-- IMPORTANTE: Esta tabela contém EXATAMENTE uma linha em produção
-- =============================================================

CREATE TABLE IF NOT EXISTS public.delegacao_controle (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Quem recebeu o último paciente novo
  ultimo_delegado text        NOT NULL CHECK (ultimo_delegado IN ('pablo', 'joao_estagiario')),
  -- Contador cumulativo para auditoria (nunca reseta)
  contador        integer     NOT NULL DEFAULT 0,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.delegacao_controle                 IS 'Controle de alternância Módulo B. Deve ter EXATAMENTE 1 linha. Próxima delegação = inverso de ultimo_delegado. Resiliente a falhas de processo.';
COMMENT ON COLUMN public.delegacao_controle.ultimo_delegado IS 'Último responsável designado. Lógica: if pablo → próximo é joao_estagiario, e vice-versa';
COMMENT ON COLUMN public.delegacao_controle.contador        IS 'Total de delegações realizadas desde o início — apenas auditoria, nunca reseta';

-- Garante que só exista uma linha (constraint de unicidade sobre toda a tabela)
CREATE UNIQUE INDEX IF NOT EXISTS idx_delegacao_unica ON public.delegacao_controle ((true));
