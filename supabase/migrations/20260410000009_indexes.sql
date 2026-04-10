-- =============================================================
-- Migration: 20260410000009_indexes
-- Índices para queries frequentes do dashboard e relatório diário
-- Baseados nos access patterns mapeados no PROJETO.md
-- =============================================================

-- =============================================================
-- TABELA: pacientes
-- Queries frequentes: dashboard principal, relatório diário 8h,
-- filtro por status (ativo/vencido), próximo retorno
-- =============================================================

-- Dashboard principal: listar pacientes por status
CREATE INDEX IF NOT EXISTS idx_pacientes_status
  ON public.pacientes(status);

-- Dashboard: cor do retorno (verde/laranja/vermelho = próximo_retorno vs hoje)
CREATE INDEX IF NOT EXISTS idx_pacientes_proximo_retorno
  ON public.pacientes(proximo_retorno)
  WHERE status = 'ativo';

-- Dashboard: planos vencendo (amarelo = vencimento em 1-3 dias)
CREATE INDEX IF NOT EXISTS idx_pacientes_data_vencimento
  ON public.pacientes(data_vencimento_plano)
  WHERE status = 'ativo';

-- Portal do aluno: busca do paciente pelo usuário logado
CREATE INDEX IF NOT EXISTS idx_pacientes_usuario_id
  ON public.pacientes(usuario_id)
  WHERE usuario_id IS NOT NULL;

-- Matching por nome+telefone (vinda do Google Forms)
CREATE INDEX IF NOT EXISTS idx_pacientes_nome_telefone
  ON public.pacientes(nome, telefone);

-- =============================================================
-- TABELA: tarefas
-- Queries frequentes: módulos B/C/D, tarefas do responsável,
-- tarefas atrasadas (relatório diário), desbloqueio Módulo D
-- =============================================================

-- Dashboard dos módulos: tarefas por módulo e status
CREATE INDEX IF NOT EXISTS idx_tarefas_modulo_status
  ON public.tarefas(modulo, status);

-- Visão do responsável: suas tarefas pendentes/feitas
CREATE INDEX IF NOT EXISTS idx_tarefas_responsavel_status
  ON public.tarefas(responsavel_id, status);

-- Tarefas por paciente (contexto individual)
CREATE INDEX IF NOT EXISTS idx_tarefas_paciente
  ON public.tarefas(paciente_id);

-- Desbloqueio Módulo D: lookup pelo tarefa_pai_id no trigger
CREATE INDEX IF NOT EXISTS idx_tarefas_pai
  ON public.tarefas(tarefa_pai_id)
  WHERE tarefa_pai_id IS NOT NULL;

-- Relatório diário 8h: tarefas atrasadas (prazo < hoje, não entregues)
CREATE INDEX IF NOT EXISTS idx_tarefas_prazo_aberto
  ON public.tarefas(data_prazo)
  WHERE status NOT IN ('entregue');

-- =============================================================
-- TABELA: formularios_recebidos
-- Queries frequentes: fila de não processados, fila de revisão,
-- busca por paciente para contexto
-- =============================================================

-- Fila de processamento: formulários novos ainda não tratados
CREATE INDEX IF NOT EXISTS idx_formularios_nao_processados
  ON public.formularios_recebidos(criado_em)
  WHERE processado = false;

-- Fila de revisão João: matches ambíguos aguardando confirmação
CREATE INDEX IF NOT EXISTS idx_formularios_revisao
  ON public.formularios_recebidos(criado_em)
  WHERE requer_revisao = true;

-- Lookup por paciente
CREATE INDEX IF NOT EXISTS idx_formularios_paciente
  ON public.formularios_recebidos(paciente_id);

-- =============================================================
-- TABELA: historico_entregas
-- Queries frequentes: histórico do paciente, portal do aluno
-- =============================================================

-- Portal do aluno + contexto de equipe: histórico por paciente
CREATE INDEX IF NOT EXISTS idx_historico_paciente_data
  ON public.historico_entregas(paciente_id, entregue_em DESC);

-- =============================================================
-- TABELA: protocolos_base
-- Queries frequentes: protocolo ativo do paciente
-- =============================================================

-- Portal do aluno: protocolo ativo por paciente
CREATE INDEX IF NOT EXISTS idx_protocolos_paciente_ativo
  ON public.protocolos_base(paciente_id)
  WHERE ativo = true;
