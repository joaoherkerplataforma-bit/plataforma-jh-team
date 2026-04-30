-- =============================================================
-- Migration: 20260430000002_create_progresso_videoaulas
-- Registro append-only de quais videoaulas cada aluno assistiu.
-- Uma única linha por (aluno, videoaula). Sem update/delete pelo aluno.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.progresso_videoaulas (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id      uuid        NOT NULL REFERENCES public.usuarios(id)   ON DELETE CASCADE,
  videoaula_id  uuid        NOT NULL REFERENCES public.videoaulas(id) ON DELETE CASCADE,
  assistido_em  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (aluno_id, videoaula_id)
);

COMMENT ON TABLE  public.progresso_videoaulas              IS 'Registro append-only: marca que um aluno assistiu uma videoaula. Aluno só insere para si mesmo. Equipe pode auditar/resetar.';
COMMENT ON COLUMN public.progresso_videoaulas.aluno_id     IS 'Referência ao usuário com perfil "aluno" que assistiu. CASCADE remove o histórico se o aluno for excluído.';
COMMENT ON COLUMN public.progresso_videoaulas.videoaula_id IS 'Referência à videoaula assistida. CASCADE remove o histórico se a videoaula for excluída.';
COMMENT ON COLUMN public.progresso_videoaulas.assistido_em IS 'Timestamp do registro. Imutável: progresso é append-only.';

-- Index para listar progresso de um aluno e checar quais videoaulas ele já assistiu.
CREATE INDEX IF NOT EXISTS idx_progresso_aluno
  ON public.progresso_videoaulas(aluno_id, videoaula_id);
