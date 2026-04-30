-- =============================================================
-- Migration: 20260430000005_rls_aluno_formularios
-- Permite que o aluno leia seus proprios formularios respondidos
-- (necessario para o portal renderizar o historico em /portal).
-- =============================================================

CREATE POLICY "formularios_aluno_self" ON public.formularios_recebidos
  FOR SELECT TO authenticated
  USING (
    public.tem_perfil('aluno')
    AND paciente_id IN (
      SELECT id FROM public.pacientes WHERE usuario_id = auth.uid()
    )
  );
