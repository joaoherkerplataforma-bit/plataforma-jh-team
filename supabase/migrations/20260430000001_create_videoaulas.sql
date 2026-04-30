-- =============================================================
-- Migration: 20260430000001_create_videoaulas
-- Catálogo de videoaulas do Portal do Aluno
-- A equipe (joao_admin/pablo/joao_estagiario) gerencia o catálogo;
-- alunos consomem apenas os vídeos ativos.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.videoaulas (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo       text        NOT NULL,
  descricao    text,
  ordem        integer     NOT NULL,                       -- posição na trilha do aluno
  storage_path text        NOT NULL,                       -- chave do objeto no bucket privado 'videoaulas'
  duracao_seg  integer,                                    -- duração em segundos (preenchido pelo upload)
  ativo        boolean     NOT NULL DEFAULT true,
  created_by   uuid        REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.videoaulas              IS 'Catálogo de videoaulas exibidas no Portal do Aluno. Equipe (joao_admin/pablo/joao_estagiario) administra; alunos consomem somente registros ativos.';
COMMENT ON COLUMN public.videoaulas.ordem        IS 'Posição da videoaula na trilha. Único entre vídeos ativos (idx_videoaulas_ordem_ativo).';
COMMENT ON COLUMN public.videoaulas.storage_path IS 'Caminho do objeto no bucket privado "videoaulas" do Supabase Storage. Acesso só via signed URL gerada pelo backend.';
COMMENT ON COLUMN public.videoaulas.ativo        IS 'true=visível para alunos | false=arquivado (continua visível para a equipe)';
COMMENT ON COLUMN public.videoaulas.created_by   IS 'Usuário da equipe que cadastrou a videoaula. ON DELETE SET NULL preserva o histórico se o autor for removido.';

-- Garante ordem única apenas entre vídeos ativos.
-- Vídeos arquivados (ativo=false) podem repetir ordem sem conflito.
CREATE UNIQUE INDEX IF NOT EXISTS idx_videoaulas_ordem_ativo
  ON public.videoaulas(ordem)
  WHERE ativo = true;

-- Index para listagem ordenada (Portal do Aluno e tela de admin).
CREATE INDEX IF NOT EXISTS idx_videoaulas_ativo_ordem
  ON public.videoaulas(ativo, ordem);

CREATE TRIGGER trg_videoaulas_updated_at
  BEFORE UPDATE ON public.videoaulas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
