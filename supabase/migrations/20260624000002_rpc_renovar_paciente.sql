-- =============================================================
-- Migration: 20260624000002_rpc_renovar_paciente
-- RPC atomica para renovar o plano de um paciente vencido.
-- Responsabilidades:
--   1. Encerra o periodo anterior (periodos_plano.encerrado_em)
--   2. Cria novo registro em periodos_plano
--   3. Atualiza pacientes com novos dados de plano e datas
-- A criacao da tarefa Modulo B e feita pelo Server Action em TS
-- (delegarModuloB) apos o RPC retornar, para manter a alternancia
-- Pablo/Estagiario na camada de aplicacao.
-- =============================================================

CREATE OR REPLACE FUNCTION public.renovar_paciente(
  p_paciente_id  uuid,
  p_tipo_plano   text,
  p_duracao_plano text,
  p_renovado_por uuid
) RETURNS uuid   -- retorna id do novo periodos_plano
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_meses           integer;
  v_data_inicio     date := CURRENT_DATE;
  v_data_vencimento date;
  v_novo_periodo_id uuid;
BEGIN
  v_meses := CASE p_duracao_plano
    WHEN 'trimestral' THEN 3
    WHEN 'semestral'  THEN 6
    WHEN 'anual'      THEN 12
    ELSE NULL
  END;

  IF v_meses IS NULL THEN
    RAISE EXCEPTION 'duracao_plano invalida: %. Valores aceitos: trimestral, semestral, anual.', p_duracao_plano;
  END IF;

  v_data_vencimento := v_data_inicio + (v_meses || ' months')::interval;

  -- Encerra periodo anterior ativo (pode nao existir em renovacoes legacy)
  UPDATE public.periodos_plano
  SET encerrado_em = now()
  WHERE paciente_id = p_paciente_id AND encerrado_em IS NULL;

  -- Cria novo periodo
  INSERT INTO public.periodos_plano (
    paciente_id, data_inicio, data_vencimento_plano,
    tipo_plano, duracao_plano, renovado_por
  ) VALUES (
    p_paciente_id, v_data_inicio, v_data_vencimento,
    p_tipo_plano, p_duracao_plano, p_renovado_por
  )
  RETURNING id INTO v_novo_periodo_id;

  -- Atualiza paciente com novos dados de plano
  UPDATE public.pacientes SET
    data_inicio           = v_data_inicio,
    data_vencimento_plano = v_data_vencimento,
    tipo_plano            = p_tipo_plano,
    duracao_plano         = p_duracao_plano,
    proximo_retorno       = v_data_inicio + interval '30 days',
    status                = 'ativo',
    updated_at            = now()
  WHERE id = p_paciente_id;

  RETURN v_novo_periodo_id;
END;
$$;
