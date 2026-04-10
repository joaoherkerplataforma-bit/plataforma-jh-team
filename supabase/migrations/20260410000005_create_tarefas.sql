-- =============================================================
-- Migration: 20260410000005_create_tarefas
-- Tarefas unificadas dos Módulos B, C e D
-- Módulo B = protocolo novo | C = fotos antes/depois | D = retorno dietético
-- =============================================================

CREATE TABLE IF NOT EXISTS public.tarefas (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id      uuid        NOT NULL REFERENCES public.pacientes(id) ON DELETE RESTRICT,
  modulo           text        NOT NULL CHECK (modulo IN ('B', 'C', 'D')),
  responsavel_id   uuid        REFERENCES public.usuarios(id) ON DELETE SET NULL,
  status           text        NOT NULL DEFAULT 'pendente' CHECK (
    status IN (
      'pendente',   -- Aguardando execução pelo responsável
      'bloqueada',  -- Módulo D aguarda Módulo C ir para 'gravado' (regra crítica)
      'feito',      -- Executado pelo responsável (Pablo ou Estagiário)
      'gravado',    -- João gravou o vídeo — exclusivo Módulo C
      'entregue'    -- João confirmou entrega ao paciente (status final)
    )
  ),
  data_criacao     date        NOT NULL DEFAULT CURRENT_DATE,
  data_prazo       date        NOT NULL,
  -- Módulo D aponta para a tarefa do Módulo C do mesmo paciente/ciclo
  -- Quando C → 'gravado', trigger muda D de 'bloqueada' para 'pendente'
  tarefa_pai_id    uuid        REFERENCES public.tarefas(id) ON DELETE SET NULL,
  observacoes_joao text,                              -- CRÍTICO: visível ao responsável ANTES de começar
  formulario_id    uuid        REFERENCES public.formularios_recebidos(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.tarefas                     IS 'Tarefas dos Módulos B, C e D unificadas. Campo modulo discrimina o tipo. Módulo D usa tarefa_pai_id para sincronizar desbloqueio com Módulo C.';
COMMENT ON COLUMN public.tarefas.modulo              IS 'B=protocolo novo (prazo 3 dias) | C=fotos antes/depois (prazo 4 dias) | D=retorno dietético (prazo 3 dias após gravação)';
COMMENT ON COLUMN public.tarefas.status              IS 'bloqueada: Módulo D aguarda C=gravado. gravado: exclusivo Módulo C quando João grava o vídeo.';
COMMENT ON COLUMN public.tarefas.tarefa_pai_id       IS 'Para Módulo D: referencia tarefa Módulo C do mesmo ciclo. Trigger desbloqueia D quando C vai para gravado.';
COMMENT ON COLUMN public.tarefas.observacoes_joao    IS 'CRÍTICO: João escreve contexto antes de delegar. Responsável DEVE ler antes de executar.';

CREATE TRIGGER trg_tarefas_updated_at
  BEFORE UPDATE ON public.tarefas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================
-- TRIGGER: Desbloqueio automático do Módulo D
-- Quando Módulo C → 'gravado', as tarefas Módulo D filhas
-- mudam de 'bloqueada' para 'pendente' automaticamente
-- =============================================================

CREATE OR REPLACE FUNCTION public.desbloquear_modulo_d()
RETURNS TRIGGER AS $$
BEGIN
  -- Só dispara quando Módulo C transiciona para 'gravado'
  IF NEW.modulo = 'C'
     AND NEW.status = 'gravado'
     AND OLD.status IS DISTINCT FROM 'gravado'
  THEN
    UPDATE public.tarefas
    SET    status = 'pendente'
    WHERE  tarefa_pai_id = NEW.id
      AND  modulo        = 'D'
      AND  status        = 'bloqueada';

    RAISE LOG 'desbloquear_modulo_d: % tarefa(s) D desbloqueada(s) a partir de tarefa C=%',
      (SELECT COUNT(*) FROM public.tarefas WHERE tarefa_pai_id = NEW.id AND modulo = 'D' AND status = 'pendente'),
      NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_desbloquear_modulo_d
  AFTER UPDATE ON public.tarefas
  FOR EACH ROW EXECUTE FUNCTION public.desbloquear_modulo_d();

-- =============================================================
-- CONSTRAINT: Módulo D criado com status inicial = 'bloqueada'
-- e deve ter um tarefa_pai_id apontando para Módulo C
-- =============================================================

ALTER TABLE public.tarefas
  ADD CONSTRAINT chk_modulo_d_bloqueada
  CHECK (
    modulo != 'D'
    OR tarefa_pai_id IS NOT NULL  -- Módulo D sempre referencia Módulo C
  );

-- Status 'gravado' é exclusivo do Módulo C
ALTER TABLE public.tarefas
  ADD CONSTRAINT chk_gravado_apenas_modulo_c
  CHECK (
    status != 'gravado' OR modulo = 'C'
  );
