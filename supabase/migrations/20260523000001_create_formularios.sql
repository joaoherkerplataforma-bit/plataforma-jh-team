-- =============================================================
-- Migration: 20260523000001_create_formularios
-- Construtor de formularios nativo (substitui Google Forms + Make).
--
-- - Tabela `formularios`: definicao de cada formulario (campos em JSONB).
-- - Cada form tem uma `acao` que dispara a logica de negocio no envio
--   (anamnese cria paciente + tarefa B, fotos_30dias cria tarefa C, etc.).
-- - `formularios_recebidos` ganha FK `formulario_id` e aceita tipo 'avulso'
--   (forms com acao 'nenhuma', ex.: enquetes).
-- - Bucket publico `formularios-fotos` para uploads de foto do paciente.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.formularios (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text        NOT NULL UNIQUE,             -- usado no link publico /f/{slug}
  titulo       text        NOT NULL,
  descricao    text,
  acao         text        NOT NULL DEFAULT 'nenhuma' CHECK (
    acao IN ('anamnese', 'fotos_iniciais', 'treino', 'fotos_30dias', 'feedback_retorno', 'nenhuma')
  ),
  campos       jsonb       NOT NULL DEFAULT '[]'::jsonb, -- lista de campos {key,tipo,label,obrigatorio,opcoes,mapeia_para}
  ativo        boolean     NOT NULL DEFAULT true,
  -- token no link publico: barra envios de quem nao recebeu o link do Joao
  share_token  text        NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.formularios            IS 'Formularios nativos da plataforma. Substituem os Google Forms. campos em JSONB; acao define a logica de negocio no envio.';
COMMENT ON COLUMN public.formularios.acao       IS 'Logica disparada no envio: anamnese=cria paciente+tarefa B | fotos_30dias=tarefa C | feedback_retorno=tarefa D | nenhuma=so registra resposta';
COMMENT ON COLUMN public.formularios.campos     IS 'Array JSONB: [{key,tipo,label,descricao?,obrigatorio,opcoes?,mapeia_para?}]';
COMMENT ON COLUMN public.formularios.share_token IS 'Token no link publico (/f/{slug}?t={token}). Rotacionavel para invalidar links antigos.';

CREATE TRIGGER trg_formularios_updated_at
  BEFORE UPDATE ON public.formularios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================
-- RLS: admin gerencia; equipe le. Render/envio publico usa service_role.
-- =============================================================
ALTER TABLE public.formularios ENABLE ROW LEVEL SECURITY;

CREATE POLICY formularios_admin_all ON public.formularios
  FOR ALL TO authenticated
  USING (public.tem_perfil('joao_admin'))
  WITH CHECK (public.tem_perfil('joao_admin'));

CREATE POLICY formularios_equipe_select ON public.formularios
  FOR SELECT TO authenticated
  USING (public.tem_perfil('pablo') OR public.tem_perfil('joao_estagiario'));

-- =============================================================
-- formularios_recebidos: vinculo opcional com a definicao + tipo 'avulso'
-- =============================================================
ALTER TABLE public.formularios_recebidos
  ADD COLUMN IF NOT EXISTS formulario_id uuid REFERENCES public.formularios(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.formularios_recebidos.formulario_id IS 'Definicao do formulario nativo que originou a resposta (NULL p/ envios legados via Make).';

ALTER TABLE public.formularios_recebidos
  DROP CONSTRAINT IF EXISTS formularios_recebidos_tipo_formulario_check;

ALTER TABLE public.formularios_recebidos
  ADD CONSTRAINT formularios_recebidos_tipo_formulario_check
  CHECK (
    tipo_formulario IN (
      'anamnese', 'fotos_iniciais', 'treino', 'fotos_30dias', 'feedback_retorno', 'avulso'
    )
  );

-- =============================================================
-- Storage: bucket publico para fotos enviadas nos formularios.
-- Upload acontece server-side via service_role (endpoint com token do form),
-- entao nao ha policy de insert para anon — evita spam de upload.
-- Leitura e publica (bucket public) para o <img> renderizar no painel do Joao.
-- Paths usam UUID aleatorio => nao descobriveis.
-- =============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'formularios-fotos',
  'formularios-fotos',
  true,
  26214400,  -- 25 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;
