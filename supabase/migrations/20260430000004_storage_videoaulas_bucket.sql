-- =============================================================
-- Migration: 20260430000004_storage_videoaulas_bucket
-- Bucket privado "videoaulas" no Supabase Storage + policies.
--
-- - Bucket privado (public=false): aluno NÃO acessa storage diretamente.
--   O vídeo só chega ao browser via signed URL gerada pelo backend.
-- - Limite de 1 GB por arquivo, MIME types restritos a vídeo (mp4/webm/mov).
-- - Equipe (joao_admin + pablo + joao_estagiario) pode upload/update/delete
--   dos objetos do bucket.
-- =============================================================

-- 1. Bucket privado
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videoaulas',
  'videoaulas',
  false,                                -- privado: sem URL pública direta
  1073741824,                           -- 1 GB
  ARRAY['video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Equipe: full CRUD dos objetos do bucket (upload, sobrescrita, remoção)
CREATE POLICY "videoaulas_storage_equipe_all" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'videoaulas'
    AND (
      public.tem_perfil('joao_admin')
      OR public.tem_perfil('pablo')
      OR public.tem_perfil('joao_estagiario')
    )
  )
  WITH CHECK (
    bucket_id = 'videoaulas'
    AND (
      public.tem_perfil('joao_admin')
      OR public.tem_perfil('pablo')
      OR public.tem_perfil('joao_estagiario')
    )
  );

-- 3. Aluno NÃO acessa storage diretamente.
--    O Portal do Aluno baixa o vídeo via signed URL gerada no backend
--    (rota /api/portal/videoaulas/[id]/url usa service_role para criar a URL).
--    Sem policy de SELECT para alunos → bloqueado por padrão.
