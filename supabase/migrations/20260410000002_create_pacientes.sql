-- =============================================================
-- Migration: 20260410000002_create_pacientes
-- Pacientes/alunos da consultoria JH TEAM
-- =============================================================

CREATE TABLE IF NOT EXISTS public.pacientes (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                  text        NOT NULL,
  email                 text,
  telefone              text,                         -- WhatsApp; diferenciador para nomes iguais
  tipo_plano            text        NOT NULL CHECK (tipo_plano IN ('dieta', 'completo')),
  duracao_plano         text        NOT NULL CHECK (duracao_plano IN ('trimestral', 'semestral', 'anual')),
  data_inicio           date        NOT NULL,
  data_vencimento_plano date        NOT NULL,
  proximo_retorno       date,
  status                text        NOT NULL DEFAULT 'ativo' CHECK (
    status IN ('ativo', 'vencido', 'pausado')
  ),
  observacoes           text,                         -- CRÍTICO: contexto inserido pelo João antes de delegar
  -- Vínculo opcional com o portal do aluno (quando o paciente criar conta)
  usuario_id            uuid        REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.pacientes                    IS 'Pacientes ativos e vencidos. Identificação primária: nome+telefone (Google Forms não tem IDs).';
COMMENT ON COLUMN public.pacientes.telefone           IS 'WhatsApp — identificador secundário para resolver nomes duplicados';
COMMENT ON COLUMN public.pacientes.status             IS 'ativo=plano vigente | vencido=prazo encerrado (aba Vencidos) | pausado=exceção autorizada por João';
COMMENT ON COLUMN public.pacientes.observacoes        IS 'CRÍTICO: João registra contexto sensível antes de delegar tarefas (TPM, lesões, preferências)';
COMMENT ON COLUMN public.pacientes.proximo_retorno    IS 'Calculado: data_inicio + múltiplos de 30 dias. Cores do dashboard derivam deste campo.';
COMMENT ON COLUMN public.pacientes.usuario_id         IS 'Vínculo com auth.users quando o aluno cria conta no portal';

CREATE TRIGGER trg_pacientes_updated_at
  BEFORE UPDATE ON public.pacientes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
