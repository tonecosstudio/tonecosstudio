-- Migration: Configuracao de Cron Jobs para Gestao de Ciclos
-- Data: 2026-03-01
-- Descricao: Jobs pg_cron para transicoes automaticas de status de ciclos

-- Habilitar extensao pg_cron se nao estiver habilitada
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Funcao para transicionar status de ciclos automaticamente
CREATE OR REPLACE FUNCTION check_and_transition_cycles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cycle_record cycles%ROWTYPE;
  current_time_bahia timestamptz;
BEGIN
  -- Obter hora atual em America/Bahia (UTC-3)
  current_time_bahia := now() AT TIME ZONE 'America/Bahia';
  
  -- Buscar todos os ciclos que nao estao completed
  FOR cycle_record IN
    SELECT * FROM cycles
    WHERE status != 'completed'
  LOOP
    -- Verificar transicao de 'open' para 'production'
    IF cycle_record.status = 'open' AND current_time_bahia > cycle_record.open_end THEN
      UPDATE cycles
      SET status = 'production',
          status_changed_at = now(),
          updated_at = now()
      WHERE id = cycle_record.id;
      
      RAISE NOTICE 'Ciclo % transicionado de open para production', cycle_record.id;
    
    -- Verificar transicao de 'production' para 'shipping'
    ELSIF cycle_record.status = 'production' AND current_time_bahia > cycle_record.production_end THEN
      UPDATE cycles
      SET status = 'shipping',
          status_changed_at = now(),
          updated_at = now()
      WHERE id = cycle_record.id;
      
      RAISE NOTICE 'Ciclo % transicionado de production para shipping', cycle_record.id;
    
    -- Verificar transicao de 'shipping' para 'completed'
    ELSIF cycle_record.status = 'shipping' AND current_time_bahia::date > cycle_record.shipping_date THEN
      UPDATE cycles
      SET status = 'completed',
          status_changed_at = now(),
          updated_at = now()
      WHERE id = cycle_record.id;
      
      RAISE NOTICE 'Ciclo % transicionado de shipping para completed', cycle_record.id;
    END IF;
  END LOOP;
END;
$$;

-- Agendar job para rodar a cada hora
-- Nota: Em producao no Supabase, pg_cron pode nao estar disponivel.
-- Nesse caso, usar Edge Function com cron trigger ou servico externo.
DO $$
BEGIN
  -- Remover job existente se houver
  PERFORM cron.unschedule('check-cycle-transitions');
EXCEPTION
  WHEN undefined_table THEN
    -- pg_cron nao esta disponivel, ignorar
    RAISE NOTICE 'pg_cron nao esta disponivel. Configure manualmente ou use Edge Function.';
  WHEN OTHERS THEN
    -- Ignorar outros erros
    NULL;
END $$;

DO $$
BEGIN
  -- Agendar novo job para rodar a cada hora
  PERFORM cron.schedule(
    'check-cycle-transitions',
    '0 * * * *',
    'SELECT check_and_transition_cycles()'
  );
  
  RAISE NOTICE 'Job pg_cron agendado com sucesso: check-cycle-transitions';
EXCEPTION
  WHEN undefined_table THEN
    -- pg_cron nao esta disponivel
    RAISE NOTICE 'pg_cron nao esta disponivel. Para configurar transicoes automaticas:';
    RAISE NOTICE '1. Use Supabase Edge Function com cron trigger';
    RAISE NOTICE '2. Ou configure servico externo para chamar check_and_transition_cycles() periodicamente';
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao agendar job: %', SQLERRM;
END $$;

-- Comentarios
COMMENT ON FUNCTION check_and_transition_cycles IS 'Verifica e transiciona status de todos os ciclos ativos baseado na data/hora atual';
