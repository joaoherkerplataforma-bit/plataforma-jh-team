-- Permite que pablo e joao_estagiario leiam registros de usuarios
-- Necessário para resolver o nome do responsável da tarefa B na página /pacientes/[id]
CREATE POLICY "usuarios_team_select" ON public.usuarios
  FOR SELECT TO authenticated
  USING (
    public.tem_perfil('pablo') OR public.tem_perfil('joao_estagiario')
  );
