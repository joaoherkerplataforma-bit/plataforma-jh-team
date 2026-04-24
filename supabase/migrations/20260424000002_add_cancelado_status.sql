-- Adiciona status 'cancelado' ao CHECK constraint da tabela pacientes
-- ATENÇÃO: confirme o nome do constraint antes de aplicar no banco real
-- Em Postgres, constraints sem nome explícito recebem nome gerado: pacientes_status_check

ALTER TABLE public.pacientes
  DROP CONSTRAINT IF EXISTS pacientes_status_check;

ALTER TABLE public.pacientes
  ADD CONSTRAINT pacientes_status_check
  CHECK (status IN ('ativo', 'vencido', 'pausado', 'cancelado'));

COMMENT ON COLUMN public.pacientes.status IS
  'ativo=plano vigente | vencido=prazo encerrado | pausado=exceção autorizada | cancelado=cliente desistiu';
