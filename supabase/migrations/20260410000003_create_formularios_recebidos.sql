-- =============================================================
-- Migration: 20260410000003_create_formularios_recebidos
-- Payloads brutos recebidos do Make (Google Forms → webhook → plataforma)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.formularios_recebidos (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Pode chegar NULL quando matching nome+telefone é ambíguo (requer_revisao=true)
  paciente_id      uuid        REFERENCES public.pacientes(id) ON DELETE RESTRICT,
  tipo_formulario  text        NOT NULL CHECK (
    tipo_formulario IN (
      'anamnese',         -- Form 1: entrada — gatilho para criação do paciente novo
      'fotos_iniciais',   -- Form 2: entrada — complemento da anamnese
      'treino',           -- Form 3: entrada — apenas plano completo
      'fotos_30dias',     -- Form 4: retorno — dispara tarefa Módulo C
      'feedback_retorno'  -- Form 5: retorno — dispara tarefa Módulo D
    )
  ),
  dados_raw        jsonb       NOT NULL DEFAULT '{}', -- Payload JSON completo vindo do Make
  nome_formulario  text,                               -- Nome extraído do formulário (para matching)
  email_formulario text,                               -- Email extraído do formulário
  processado       boolean     NOT NULL DEFAULT false, -- True após criação de paciente/tarefa
  requer_revisao   boolean     NOT NULL DEFAULT false, -- True quando match ambíguo: João precisa confirmar
  criado_em        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.formularios_recebidos                  IS 'Payloads brutos do Make. Intermediário entre Google Forms e criação de pacientes/tarefas. João revisa os ambíguos.';
COMMENT ON COLUMN public.formularios_recebidos.paciente_id      IS 'NULL quando matching nome+telefone falha — João confirma manualmente via fila de revisão';
COMMENT ON COLUMN public.formularios_recebidos.requer_revisao   IS 'True = match ambíguo (ex: nomes iguais). João vê na fila de revisão do painel.';
COMMENT ON COLUMN public.formularios_recebidos.dados_raw        IS 'Payload JSON completo preservado para auditoria e re-processamento se necessário';
