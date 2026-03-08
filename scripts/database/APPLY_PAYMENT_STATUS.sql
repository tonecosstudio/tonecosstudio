-- ============================================================================
-- EXECUTE ESTE SQL NO SUPABASE DASHBOARD
-- Migration: Add Payment Status Field
-- ============================================================================

-- Step 1: Add payment_status columns
ALTER TABLE standalone_purchases
ADD COLUMN IF NOT EXISTS payment_status TEXT;

ALTER TABLE subscription_deliveries
ADD COLUMN IF NOT EXISTS payment_status TEXT;

ALTER TABLE production_queue
ADD COLUMN IF NOT EXISTS payment_status TEXT;

-- Step 2: Migrate existing data for standalone_purchases
UPDATE standalone_purchases
SET payment_status = CASE
  WHEN balance_paid_at IS NOT NULL THEN 'paid'
  WHEN deposit_paid_at IS NOT NULL THEN 'deposit_paid'
  ELSE 'pending'
END
WHERE payment_status IS NULL;

-- Step 3: Migrate existing data for subscription_deliveries
UPDATE subscription_deliveries
SET payment_status = 'paid'
WHERE payment_status IS NULL;

-- Step 4: Migrate existing data for production_queue
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

-- Step 5: Add constraints AFTER data migration
ALTER TABLE standalone_purchases
DROP CONSTRAINT IF EXISTS standalone_purchases_payment_status_check;

ALTER TABLE standalone_purchases
ADD CONSTRAINT standalone_purchases_payment_status_check
CHECK (payment_status IN (
  'pending', 'deposit_paid', 'balance_pending', 
  'paid', 'overdue', 'cancelled'
));

ALTER TABLE subscription_deliveries
DROP CONSTRAINT IF EXISTS subscription_deliveries_payment_status_check;

ALTER TABLE subscription_deliveries
ADD CONSTRAINT subscription_deliveries_payment_status_check
CHECK (payment_status IN (
  'pending', 'paid', 'overdue', 'cancelled'
));

ALTER TABLE production_queue
DROP CONSTRAINT IF EXISTS production_queue_payment_status_check;

ALTER TABLE production_queue
ADD CONSTRAINT production_queue_payment_status_check
CHECK (payment_status IN (
  'pending', 'deposit_paid', 'balance_pending',
  'paid', 'overdue', 'cancelled'
));

-- Step 6: Set NOT NULL after data is populated
ALTER TABLE standalone_purchases
ALTER COLUMN payment_status SET NOT NULL;

ALTER TABLE subscription_deliveries
ALTER COLUMN payment_status SET NOT NULL;

-- Step 7: FIRST remove old constraint
ALTER TABLE production_queue
DROP CONSTRAINT IF EXISTS production_queue_production_status_check;

-- Step 8: Update production_status values (now without constraint blocking)
UPDATE production_queue
SET production_status = CASE
  WHEN production_status = 'awaiting_choice' THEN 'not_started'
  WHEN production_status = 'ready_for_production' THEN 'ready_to_start'
  WHEN production_status = 'in_production' THEN 'in_production'
  WHEN production_status = 'completed' THEN 'delivered'
  WHEN production_status = 'on_hold' THEN 'on_hold'
  WHEN production_status = 'cancelled' THEN 'cancelled'
  -- Keep existing valid values
  WHEN production_status IN ('not_started', 'ready_to_start', 'quality_check', 'ready_to_ship', 'shipped', 'delivered') THEN production_status
  ELSE 'not_started'
END;

-- Step 9: NOW add new constraint
ALTER TABLE production_queue
ADD CONSTRAINT production_queue_production_status_check
CHECK (production_status IN (
  'not_started', 'ready_to_start', 'in_production',
  'quality_check', 'ready_to_ship', 'shipped',
  'delivered', 'on_hold', 'cancelled'
));

-- Step 9: Create trigger to auto-update payment_status
CREATE OR REPLACE FUNCTION update_standalone_purchase_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  NEW.payment_status := CASE
    WHEN NEW.balance_paid_at IS NOT NULL THEN 'paid'
    WHEN NEW.deposit_paid_at IS NOT NULL THEN 'deposit_paid'
    ELSE 'pending'
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_standalone_purchase_payment_status ON standalone_purchases;

CREATE TRIGGER trigger_update_standalone_purchase_payment_status
  BEFORE INSERT OR UPDATE OF deposit_paid_at, balance_paid_at
  ON standalone_purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_standalone_purchase_payment_status();

-- Step 10: Create indexes
CREATE INDEX IF NOT EXISTS idx_standalone_purchases_payment_status 
  ON standalone_purchases(payment_status);

CREATE INDEX IF NOT EXISTS idx_subscription_deliveries_payment_status 
  ON subscription_deliveries(payment_status);

CREATE INDEX IF NOT EXISTS idx_production_queue_payment_status 
  ON production_queue(payment_status);

-- Step 11: Verification
SELECT 
  'Payment Status Migration' AS migration,
  (SELECT COUNT(*) FROM standalone_purchases WHERE payment_status IS NOT NULL) AS standalone_migrated,
  (SELECT COUNT(*) FROM subscription_deliveries WHERE payment_status IS NOT NULL) AS subscription_migrated,
  (SELECT COUNT(*) FROM production_queue WHERE payment_status IS NOT NULL) AS queue_migrated,
  'SUCCESS' AS status;

-- ============================================================================
-- Verification Queries (run after migration)
-- ============================================================================

-- Check payment_status distribution
SELECT 'standalone_purchases' AS table_name, payment_status, COUNT(*) 
FROM standalone_purchases 
GROUP BY payment_status
UNION ALL
SELECT 'production_queue' AS table_name, payment_status, COUNT(*) 
FROM production_queue 
GROUP BY payment_status;

-- Check production_status distribution
SELECT production_status, COUNT(*) 
FROM production_queue 
GROUP BY production_status;
