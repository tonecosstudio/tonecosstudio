-- ============================================================================
-- Migration: Add Stage and Payment Synchronization Trigger
-- Automatically advances production stages when payment is completed
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_stage_with_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Regra 1: Se payment_status mudou para 'paid' e estágio ainda está em pagamento
  IF NEW.payment_status = 'paid' AND OLD.payment_status != 'paid' THEN
    -- Se ainda está em estágios de pagamento, avançar para produção
    IF NEW.current_stage IN ('awaiting_payment', 'payment_confirmed') THEN
      NEW.current_stage := 'model_preparation';
      NEW.production_status := 'in_production';
      
      RAISE NOTICE 'Auto-advancing stage: payment completed, moving to model_preparation';
    END IF;
    
    -- Se production_status ainda está em ready_to_start, avançar
    IF NEW.production_status = 'ready_to_start' THEN
      NEW.production_status := 'in_production';
    END IF;
  END IF;
  
  -- Regra 2: Se payment_status mudou para 'deposit_paid' e estágio está em awaiting_payment
  IF NEW.payment_status = 'deposit_paid' AND OLD.payment_status = 'pending' THEN
    IF NEW.current_stage = 'awaiting_payment' THEN
      NEW.current_stage := 'payment_confirmed';
      NEW.production_status := 'ready_to_start';
      
      RAISE NOTICE 'Auto-advancing stage: deposit paid, moving to payment_confirmed';
    END IF;
  END IF;
  
  -- Regra 3: Se payment_status voltou para 'pending', não permitir estágios avançados
  IF NEW.payment_status = 'pending' AND OLD.payment_status != 'pending' THEN
    IF NEW.current_stage NOT IN ('awaiting_payment', 'payment_confirmed') THEN
      -- Não reverter automaticamente, apenas avisar
      RAISE WARNING 'Payment status changed to pending but stage is advanced: %', NEW.current_stage;
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

-- Comentários
COMMENT ON FUNCTION sync_stage_with_payment_status IS 
  'Automatically advances production stages when payment status changes';

COMMENT ON TRIGGER trigger_sync_stage_with_payment ON production_queue IS
  'Keeps current_stage and production_status synchronized with payment_status';

-- Verificação
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_sync_stage_with_payment'
  ) THEN
    RAISE NOTICE 'Trigger created successfully';
  ELSE
    RAISE EXCEPTION 'Trigger was not created';
  END IF;
END $$;

-- ============================================================================
-- Summary
-- ============================================================================
SELECT 
  '20260308210000_add_stage_payment_sync_trigger.sql' AS migration_file,
  'Add trigger to sync production stages with payment status' AS description,
  'SUCCESS' AS status,
  NOW() AS executed_at;
