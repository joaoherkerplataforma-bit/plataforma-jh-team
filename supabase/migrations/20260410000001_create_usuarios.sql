-- =============================================================
-- Migration: 20260410000001_create_usuarios
-- Tabela de usuários da plataforma (equipe interna + alunos)
-- =============================================================

-- Função utilitária para auto-atualizar updated_at
-- (criada aqui pois é usada por todas as tabelas seguintes)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.usuarios (
  -- id espelha auth.users.id do Supabase Auth (mesma UUID)
  id         uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome       text        NOT NULL,
  email      text        NOT NULL UNIQUE,
  perfil     text        NOT NULL CHECK (
    perfil IN ('joao_admin', 'pablo', 'joao_estagiario', 'aluno')
  ),
  ativo      boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.usuarios              IS 'Usuários da plataforma: equipe interna (joao_admin, pablo, joao_estagiario) e alunos com portal próprio.';
COMMENT ON COLUMN public.usuarios.perfil       IS 'joao_admin=acesso total | pablo=módulos B/C/D | joao_estagiario=módulo B | aluno=portal próprio (somente leitura de seus dados)';
COMMENT ON COLUMN public.usuarios.id           IS 'Mesmo UUID do Supabase Auth — criado via trigger on auth.users insert em produção';

CREATE TRIGGER trg_usuarios_updated_at
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
