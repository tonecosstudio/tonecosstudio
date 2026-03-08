-- ============================================================================
-- EXECUTE ESTE SQL NO SUPABASE DASHBOARD
-- Trigger: Sincronização Automática de Estágios com Pagamento
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_stage_with_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Regra 1: Pagamento completo → Avançar para produção
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
    -- Se ainda está em estágios de pagamento, avançar
    IF NEW.current_stage IN ('awaiting_payment', 'payment_confirmed') THEN
      NEW.current_stage := 'model_preparation';
      NEW.production_status := 'in_production';
      RAISE NOTICE 'Auto-advancing: payment completed → model_preparation';
    END IF;
    
    -- Se production_status ainda está em ready_to_start, avançar
    IF NEW.production_status = 'ready_to_start' THEN
      NEW.production_status := 'in_production';
    END IF;
  END IF;
  
  -- Regra 2: Depósito pago → Confirmar pagamento
  IF NEW.payment_status = 'deposit_paid' AND (OLD.payment_status IS NULL OR OLD.payment_status = 'pending') THEN
    IF NEW.current_stage = 'awaiting_payment' THEN
      NEW.current_stage := 'payment_confirmed';
      NEW.production_status := 'ready_to_start';
      RAISE NOTICE 'Auto-advancing: deposit paid → payment_confirmed';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_sync_stage_with_payment ON production_queue;

CREATE TRIGGER trigger_sync_stage_with_payment
  BEFORE UPDATE OF payment_status
  ON production_queue
  FOR EACH ROW
  WHEN (NEW.payment_status IS DISTINCT FROM OLD.payment_status)
  EXECUTE FUNCTION sync_stage_with_payment_status();

-- Verificação
SELECT 
  'Trigger criado com sucesso!' AS status,
  COUNT(*) AS trigger_count
FROM pg_trigger 
WHERE tgname = 'trigger_sync_stage_with_payment';
