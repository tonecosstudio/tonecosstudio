-- =====================================================
-- MIGRATION: Create Production Queue Triggers
-- Date: 2026-03-07
-- Description: Creates triggers to auto-populate production_queue
-- =====================================================

-- =====================================================
-- 1. DROP EXISTING TRIGGERS (IF ANY)
-- =====================================================

DROP TRIGGER IF EXISTS trigger_auto_populate_production_queue_on_subscription_deliveries 
  ON subscription_deliveries;

DROP TRIGGER IF EXISTS trigger_auto_populate_production_queue_on_standalone_purchases 
  ON standalone_purchases;

DROP TRIGGER IF EXISTS trigger_auto_populate_production_queue_on_manual_payments 
  ON manual_payments;

-- =====================================================
-- 2. CREATE TRIGGERS ON ALL THREE TABLES
-- =====================================================

-- Trigger for subscription_deliveries
CREATE TRIGGER trigger_auto_populate_production_queue_on_subscription_deliveries
  AFTER INSERT OR UPDATE OF status
  ON subscription_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_production_queue();

-- Trigger for standalone_purchases
CREATE TRIGGER trigger_auto_populate_production_queue_on_standalone_purchases
  AFTER INSERT OR UPDATE OF status
  ON standalone_purchases
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_production_queue();

-- Trigger for manual_payments
CREATE TRIGGER trigger_auto_populate_production_queue_on_manual_payments
  AFTER INSERT OR UPDATE OF status
  ON manual_payments
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_production_queue();

-- =====================================================
-- 3. VALIDATE MIGRATION
-- =====================================================

DO $$
DECLARE
  v_trigger_count INTEGER;
BEGIN
  -- Check if triggers were created
  SELECT COUNT(*) INTO v_trigger_count
  FROM information_schema.triggers
  WHERE trigger_name LIKE '%auto_populate_production_queue%';
  
  IF v_trigger_count < 3 THEN
    RAISE WARNING 'Expected 3 triggers but found %', v_trigger_count;
  ELSE
    RAISE NOTICE '✓ All 3 triggers created successfully';
  END IF;
  
  RAISE NOTICE 'Migration 20260307000001_create_production_triggers.sql completed successfully';
END $$;
