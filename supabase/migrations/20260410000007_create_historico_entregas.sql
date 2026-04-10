-- =============================================================
-- Migration: 20260410000007_create_historico_entregas
-- Registro imutável de todas as entregas realizadas
-- Aluno vê este histórico no portal próprio
-- =============================================================

CREATE TABLE IF NOT EXISTS public.historico_entregas (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id   uuid        NOT NULL REFERENCES public.pacientes(id) ON DELETE RESTRICT,
  tarefa_id     uuid        REFERENCES public.tarefas(id) ON DELETE SET NULL,
  tipo_entrega  text        NOT NULL CHECK (
    tipo_entrega IN (
      'protocolo_inicial', -- Primeiro protocolo: dieta + treino do paciente novo
      'retorno_30dias',    -- Atualização mensal completa
      'atualizacao_dieta', -- Atualização pontual de dieta (mid-cycle)
      'antes_depois'       -- Entrega do material Canva Antes/Depois (Módulo C)
    )
  ),
  entregue_por  uuid        REFERENCES public.usuarios(id) ON DELETE SET NULL,
  entregue_em   timestamptz NOT NULL DEFAULT now(),
  observacoes   text
);

COMMENT ON TABLE  public.historico_entregas              IS 'Registro auditável e imutável de entregas. Aluno vê no portal. Sem UPDATE/DELETE — append-only por design.';
COMMENT ON COLUMN public.historico_entregas.tipo_entrega IS 'Classifica o tipo de entrega para exibição no portal do aluno e relatório diário do João';
COMMENT ON COLUMN public.historico_entregas.entregue_por IS 'NULL quando entregue via automação/webhook (service_role)';
