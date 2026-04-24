-- Adiciona campo origem (canal de aquisição) à tabela pacientes
ALTER TABLE public.pacientes
  ADD COLUMN IF NOT EXISTS origem TEXT NULL
  CHECK (
    origem IS NULL
    OR origem IN ('Instagram', 'TikTok', 'YouTube', 'Indicação')
  );

COMMENT ON COLUMN public.pacientes.origem IS
  'Canal de aquisição: Instagram | TikTok | YouTube | Indicação. Preenchido via webhook de anamnese pelo Make.';
