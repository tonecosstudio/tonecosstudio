-- =====================================================
-- MIGRATION: Sync production status to orders
-- Date: 2026-04-29
-- Description: Creates trigger to sync production status updates to subscription_deliveries and standalone_purchases
-- Requirements: 2.5.1 (Orders System Integration)
-- Task: 6.1.3 Sync status updates
-- =====================================================

-- =====================================================
-- 1. CREATE FUNCTION TO SYNC PRODUCTION STATUS TO ORDERS
-- =====================================================

CREATE OR REPLACE FUNCTION sync_production_status_to_orders()
RETURNS TRIGGER AS $$
DECLARE
  v_order_exists BOOLEAN;
  v_tracking_code TEXT;
BEGIN
  -- Only sync if current_stage changed or tracking/delivery info changed
  IF (TG_OP = 'UPDATE') THEN
    -- Extract tracking code from production_notes if it looks like a tracking code
    -- Otherwise, keep the existing tracking_code from production_queue
    v_tracking_code := NEW.production_notes;
    
    -- Sync based on order_type
    IF NEW.order_type = 'subscription_delivery' THEN
      -- Check if order exists
      SELECT EXISTS (
        SELECT 1 FROM subscription_deliveries WHERE id = NEW.order_id
      ) INTO v_order_exists;
      
      IF v_order_exists THEN
        UPDATE subscription_deliveries
        SET
          -- Update status when production stage changes
          status = CASE
            -- When stage moves to 'shipped', update status to 'shipped'
            WHEN NEW.current_stage = 'shipped' AND (OLD.current_stage IS NULL OR OLD.current_stage != 'shipped') THEN 'shipped'
            -- When production is completed (delivered), update status to 'delivered'
            WHEN NEW.production_status = 'completed' AND NEW.production_completed_at IS NOT NULL 
                 AND (OLD.production_status IS NULL OR OLD.production_status != 'completed') THEN 'delivered'
            ELSE status
          END,
          -- Sync tracking code if provided
          tracking_code = CASE
            WHEN v_tracking_code IS NOT NULL AND v_tracking_code != '' THEN v_tracking_code
            ELSE tracking_code
          END,
          -- Sync expected delivery date
          expected_delivery_date = CASE
            WHEN NEW.estimated_completion_date IS NOT NULL THEN NEW.estimated_completion_date
            ELSE expected_delivery_date
          END,
          -- Sync actual delivery date when completed
          actual_delivery_date = CASE
            WHEN NEW.production_completed_at IS NOT NULL AND NEW.production_status = 'completed' THEN NEW.production_completed_at
            ELSE actual_delivery_date
          END,
          -- Update timestamp
          updated_at = now()
        WHERE id = NEW.order_id
          AND (
            -- Only update if something actually changed
            (NEW.current_stage = 'shipped' AND (OLD.current_stage IS NULL OR OLD.current_stage != 'shipped')) OR
            (NEW.production_status = 'completed' AND (OLD.production_status IS NULL OR OLD.production_status != 'completed')) OR
            (NEW.production_completed_at IS NOT NULL AND (OLD.production_completed_at IS NULL OR NEW.production_completed_at != OLD.production_completed_at)) OR
            (v_tracking_code IS NOT NULL AND v_tracking_code != '' AND (OLD.production_notes IS NULL OR NEW.production_notes != OLD.production_notes)) OR
            (NEW.estimated_completion_date IS NOT NULL AND (OLD.estimated_completion_date IS NULL OR NEW.estimated_completion_date != OLD.estimated_completion_date))
          );
      END IF;
      
    ELSIF NEW.order_type = 'standalone_purchase' THEN
      -- Check if order exists
      SELECT EXISTS (
        SELECT 1 FROM standalone_purchases WHERE id = NEW.order_id
      ) INTO v_order_exists;
      
      IF v_order_exists THEN
        UPDATE standalone_purchases
        SET
          -- Update status when production stage changes
          status = CASE
            -- When stage moves to 'shipped', update status to 'shipped'
            WHEN NEW.current_stage = 'shipped' AND (OLD.current_stage IS NULL OR OLD.current_stage != 'shipped') THEN 'shipped'
            -- When production is completed (delivered), update status to 'delivered'
            WHEN NEW.production_status = 'completed' AND NEW.production_completed_at IS NOT NULL 
                 AND (OLD.production_status IS NULL OR OLD.production_status != 'completed') THEN 'delivered'
            ELSE status
          END,
          -- Sync tracking code if provided
          tracking_code = CASE
            WHEN v_tracking_code IS NOT NULL AND v_tracking_code != '' THEN v_tracking_code
            ELSE tracking_code
          END,
          -- Sync shipped_at timestamp when stage changes to 'shipped'
          shipped_at = CASE
            WHEN NEW.current_stage = 'shipped' AND (OLD.current_stage IS NULL OR OLD.current_stage != 'shipped') THEN now()
            ELSE shipped_at
          END,
          -- Sync delivered_at timestamp when production is completed
          delivered_at = CASE
            WHEN NEW.production_completed_at IS NOT NULL AND NEW.production_status = 'completed' 
                 AND (OLD.production_completed_at IS NULL OR NEW.production_completed_at != OLD.production_completed_at) THEN NEW.production_completed_at
            ELSE delivered_at
          END,
          -- Update timestamp
          updated_at = now()
        WHERE id = NEW.order_id
          AND (
            -- Only update if something actually changed
            (NEW.current_stage = 'shipped' AND (OLD.current_stage IS NULL OR OLD.current_stage != 'shipped')) OR
            (NEW.production_status = 'completed' AND (OLD.production_status IS NULL OR OLD.production_status != 'completed')) OR
            (NEW.production_completed_at IS NOT NULL AND (OLD.production_completed_at IS NULL OR NEW.production_completed_at != OLD.production_completed_at)) OR
            (v_tracking_code IS NOT NULL AND v_tracking_code != '' AND (OLD.production_notes IS NULL OR NEW.production_notes != OLD.production_notes))
          );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_production_status_to_orders IS 
  'Syncs production status updates from production_queue to subscription_deliveries and standalone_purchases tables';

-- =====================================================
-- 2. CREATE TRIGGER TO SYNC PRODUCTION STATUS
-- =====================================================

CREATE TRIGGER trigger_sync_production_status_to_orders
  AFTER UPDATE ON production_queue
  FOR EACH ROW
  WHEN (
    -- Only trigger when relevant fields change
    NEW.current_stage IS DISTINCT FROM OLD.current_stage OR
    NEW.production_completed_at IS DISTINCT FROM OLD.production_completed_at OR
    NEW.production_notes IS DISTINCT FROM OLD.production_notes OR
    NEW.estimated_completion_date IS DISTINCT FROM OLD.estimated_completion_date
  )
  EXECUTE FUNCTION sync_production_status_to_orders();

COMMENT ON TRIGGER trigger_sync_production_status_to_orders ON production_queue IS
  'Automatically syncs production status changes to the original order tables (subscription_deliveries or standalone_purchases)';

-- =====================================================
-- 3. VALIDATE MIGRATION
-- =====================================================

DO $$
BEGIN
  -- Check if function was created
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'sync_production_status_to_orders'
  ) THEN
    RAISE EXCEPTION 'Function sync_production_status_to_orders was not created';
  END IF;
  
  -- Check if trigger was created
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_sync_production_status_to_orders'
  ) THEN
    RAISE EXCEPTION 'Trigger trigger_sync_production_status_to_orders was not created';
  END IF;
  
  RAISE NOTICE 'Migration 20260429000003_sync_production_status_to_orders.sql completed successfully';
END $$;

-- =====================================================
-- 4. MIGRATION SUMMARY
-- =====================================================

SELECT 
  '20260429000003_sync_production_status_to_orders.sql' AS migration_file,
  'Sync production status updates to subscription_deliveries and standalone_purchases' AS description,
  'SUCCESS' AS status,
  NOW() AS executed_at,
  (SELECT COUNT(*) FROM pg_proc WHERE proname = 'sync_production_status_to_orders') AS functions_created,
  (SELECT COUNT(*) FROM pg_trigger WHERE tgname = 'trigger_sync_production_status_to_orders') AS triggers_created;
