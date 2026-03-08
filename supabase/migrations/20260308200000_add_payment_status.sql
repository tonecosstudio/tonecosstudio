-- ============================================================================
-- Migration: Add Payment Status Field
-- Separates payment status from production status for clarity
-- ============================================================================

-- Step 1: Add payment_status to standalone_purchases
ALTER TABLE standalone_purchases
ADD COLUMN IF NOT EXISTS payment_status TEXT;

-- Step 2: Add payment_status to subscription_deliveries
ALTER TABLE subscription_deliveries
ADD COLUMN IF NOT EXISTS payment_status TEXT;

-- Step 3: Add payment_status to production_queue (denormalized)
ALTER TABLE production_queue
ADD COLUMN IF NOT EXISTS payment_status TEXT;

-- Step 4: Migrate existing data for standalone_purchases
UPDATE standalone_purchases
SET payment_status = CASE
  WHEN balance_paid_at IS NOT NULL THEN 'paid'
  WHEN deposit_paid_at IS NOT NULL THEN 'deposit_paid'
  ELSE 'pending'
END
WHERE payment_status IS NULL;

-- Step 5: Migrate existing data for subscription_deliveries
-- Subscriptions are pre-paid, so default to 'paid'
UPDATE subscription_deliveries
SET payment_status = 'paid'
WHERE payment_status IS NULL;

-- Step 6: Migrate existing data for production_queue
UPDATE production_queue pq
SET payment_status = CASE
  WHEN pq.order_type = 'standalone_purchase' THEN (
    SELECT CASE
      WHEN sp.balance_paid_at IS NOT NULL THEN 'paid'
      WHEN sp.deposit_paid_at IS NOT NULL THEN 'deposit_paid'
      ELSE 'pending'
    END
    FROM standalone_purchases sp
    WHERE sp.id = pq.order_id
  )
  WHEN pq.order_type = 'subscription_delivery' THEN 'paid'
  WHEN pq.order_type = 'manual_payment' THEN (
    SELECT CASE
      WHEN mp.status = 'approved' THEN 'paid'
      ELSE 'pending'
    END
    FROM manual_payments mp
    WHERE mp.id = pq.order_id
  )
  ELSE 'pending'
END
WHERE payment_status IS NULL;

-- Step 7: Add constraints AFTER data migration
ALTER TABLE standalone_purchases
ADD CONSTRAINT standalone_purchases_payment_status_check
CHECK (payment_status IN (
  'pending', 'deposit_paid', 'balance_pending', 
  'paid', 'overdue', 'cancelled'
));

ALTER TABLE subscription_deliveries
ADD CONSTRAINT subscription_deliveries_payment_status_check
CHECK (payment_status IN (
  'pending', 'paid', 'overdue', 'cancelled'
));

ALTER TABLE production_queue
ADD CONSTRAINT production_queue_payment_status_check
CHECK (payment_status IN (
  'pending', 'deposit_paid', 'balance_pending',
  'paid', 'overdue', 'cancelled'
));

-- Step 8: Set NOT NULL after data is populated
ALTER TABLE standalone_purchases
ALTER COLUMN payment_status SET NOT NULL;

ALTER TABLE subscription_deliveries
ALTER COLUMN payment_status SET NOT NULL;

-- production_queue can be NULL for legacy data
-- ALTER TABLE production_queue
-- ALTER COLUMN payment_status SET NOT NULL;

-- Step 9: Update production_status values to be more clear
-- Simplify production_status to focus on production, not payment
UPDATE production_queue
SET production_status = CASE
  WHEN production_status = 'awaiting_choice' AND payment_status = 'pending' THEN 'not_started'
  WHEN production_status = 'awaiting_choice' AND payment_status != 'pending' THEN 'not_started'
  WHEN production_status = 'ready_for_production' THEN 'ready_to_start'
  WHEN production_status = 'in_production' THEN 'in_production'
  WHEN production_status = 'completed' THEN 'delivered'
  WHEN production_status = 'on_hold' THEN 'on_hold'
  WHEN production_status = 'cancelled' THEN 'cancelled'
  ELSE production_status
END;

-- Step 10: Update constraint for production_status
ALTER TABLE production_queue
DROP CONSTRAINT IF EXISTS production_queue_production_status_check;

ALTER TABLE production_queue
ADD CONSTRAINT production_queue_production_status_check
CHECK (production_status IN (
  'not_started', 'ready_to_start', 'in_production',
  'quality_check', 'ready_to_ship', 'shipped',
  'delivered', 'on_hold', 'cancelled'
));

-- Step 11: Create trigger to auto-update payment_status for standalone_purchases
CREATE OR REPLACE FUNCTION update_standalone_purchase_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-calculate payment_status based on payment dates
  NEW.payment_status := CASE
    WHEN NEW.balance_paid_at IS NOT NULL THEN 'paid'
    WHEN NEW.deposit_paid_at IS NOT NULL THEN 'deposit_paid'
    ELSE 'pending'
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_standalone_purchase_payment_status
  BEFORE INSERT OR UPDATE OF deposit_paid_at, balance_paid_at
  ON standalone_purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_standalone_purchase_payment_status();

-- Step 12: Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_standalone_purchases_payment_status 
  ON standalone_purchases(payment_status);

CREATE INDEX IF NOT EXISTS idx_subscription_deliveries_payment_status 
  ON subscription_deliveries(payment_status);

CREATE INDEX IF NOT EXISTS idx_production_queue_payment_status 
  ON production_queue(payment_status);

-- Step 13: Add comments
COMMENT ON COLUMN standalone_purchases.payment_status IS 
  'Payment status: pending, deposit_paid, balance_pending, paid, overdue, cancelled';

COMMENT ON COLUMN subscription_deliveries.payment_status IS 
  'Payment status: pending, paid, overdue, cancelled';

COMMENT ON COLUMN production_queue.payment_status IS 
  'Payment status (denormalized from order table)';

COMMENT ON COLUMN production_queue.production_status IS 
  'Production status: not_started, ready_to_start, in_production, quality_check, ready_to_ship, shipped, delivered, on_hold, cancelled';

-- Step 14: Verification
DO $$
DECLARE
  v_standalone_count INTEGER;
  v_subscription_count INTEGER;
  v_queue_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_standalone_count 
  FROM standalone_purchases 
  WHERE payment_status IS NOT NULL;
  
  SELECT COUNT(*) INTO v_subscription_count 
  FROM subscription_deliveries 
  WHERE payment_status IS NOT NULL;
  
  SELECT COUNT(*) INTO v_queue_count 
  FROM production_queue 
  WHERE payment_status IS NOT NULL;
  
  RAISE NOTICE 'Migration completed:';
  RAISE NOTICE '  - standalone_purchases with payment_status: %', v_standalone_count;
  RAISE NOTICE '  - subscription_deliveries with payment_status: %', v_subscription_count;
  RAISE NOTICE '  - production_queue with payment_status: %', v_queue_count;
END $$;

-- ============================================================================
-- Summary
-- ============================================================================
SELECT 
  '20260308200000_add_payment_status.sql' AS migration_file,
  'Add payment_status field to separate payment from production status' AS description,
  'SUCCESS' AS status,
  NOW() AS executed_at;
