-- Adiciona modulo 'E' (Alteracoes) ao CHECK constraint da tabela tarefas
ALTER TABLE public.tarefas DROP CONSTRAINT IF EXISTS tarefas_modulo_check;
ALTER TABLE public.tarefas ADD CONSTRAINT tarefas_modulo_check CHECK (modulo IN ('B', 'C', 'D', 'E'));
