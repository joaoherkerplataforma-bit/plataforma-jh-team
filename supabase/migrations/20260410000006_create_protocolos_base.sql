-- =============================================================
-- Migration: 20260410000006_create_protocolos_base
-- Links e versões dos protocolos entregues (WebDiet e MFit Personal)
-- Aluno acessa via portal próprio
-- =============================================================

CREATE TABLE IF NOT EXISTS public.protocolos_base (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id  uuid        NOT NULL REFERENCES public.pacientes(id) ON DELETE RESTRICT,
  tipo         text        NOT NULL CHECK (tipo IN ('dieta', 'treino', 'dieta_e_treino')),
  link_webdiet text,                         -- URL do protocolo de dieta no WebDiet
  link_mfit    text,                         -- URL do protocolo de treino no MFit Personal
  versao       integer     NOT NULL DEFAULT 1 CHECK (versao > 0),
  ativo        boolean     NOT NULL DEFAULT true,
  criado_em    timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.protocolos_base             IS 'Links e versões de protocolos entregues. Aluno vê versão ativa no portal. Histórico mantido via ativo=false nas versões antigas.';
COMMENT ON COLUMN public.protocolos_base.versao      IS 'Incrementa a cada ciclo de 30 dias — v1=protocolo inicial, v2=primeira renovação, etc.';
COMMENT ON COLUMN public.protocolos_base.ativo       IS 'Apenas um protocolo ativo por tipo por paciente. Versões antigas ficam com ativo=false para histórico.';
COMMENT ON COLUMN public.protocolos_base.link_webdiet IS 'Link direto para dieta do paciente no WebDiet — exibido no portal do aluno';
COMMENT ON COLUMN public.protocolos_base.link_mfit   IS 'Link direto para treino do paciente no MFit Personal — exibido no portal do aluno';

CREATE TRIGGER trg_protocolos_updated_at
  BEFORE UPDATE ON public.protocolos_base
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
