-- Migration: Add subscription data integrity constraints
-- Purpose: Ensure data consistency and prevent invalid states
-- Date: 2026-05-04

-- ============================================
-- PART 1: Add check constraints
-- ============================================

-- Ensure deliveries_completed doesn't exceed deliveries_total
ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS check_deliveries_completed_valid;

ALTER TABLE subscriptions
  ADD CONSTRAINT check_deliveries_completed_valid
  CHECK (deliveries_completed <= deliveries_total);

-- Ensure deliveries_total matches plan_type
ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS check_deliveries_total_matches_plan;

ALTER TABLE subscriptions
  ADD CONSTRAINT check_deliveries_total_matches_plan
  CHECK (
    (plan_type = 'trimestral' AND deliveries_total = 3) OR
    (plan_type = 'semestral' AND deliveries_total = 6) OR
    (plan_type = 'anual' AND deliveries_total = 12) OR
    deliveries_total IS NULL -- Allow NULL for pending subscriptions
  );

-- Ensure total_paid is non-negative
ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS check_total_paid_non_negative;

ALTER TABLE subscriptions
  ADD CONSTRAINT check_total_paid_non_negative
  CHECK (total_paid >= 0);

-- ============================================
-- PART 2: Add unique constraint (one active subscription per user per collection)
-- ============================================

-- Note: This is commented out because it might break existing data
-- Uncomment after cleaning up duplicate subscriptions

-- CREATE UNIQUE INDEX idx_unique_active_subscription_per_user
--   ON subscriptions (user_id, status)
--   WHERE status = 'active';

-- ============================================
-- PART 3: Add helpful indexes
-- ============================================

-- Index for finding subscriptions by status and dates
CREATE INDEX IF NOT EXISTS idx_subscriptions_status_dates
  ON subscriptions (status, next_delivery_date, next_production_start)
  WHERE status = 'active';

-- Index for finding subscriptions needing deliveries
CREATE INDEX IF NOT EXISTS idx_subscriptions_deliveries
  ON subscriptions (deliveries_completed, deliveries_total)
  WHERE status = 'active';

-- ============================================
-- PART 4: Add comments
-- ============================================

COMMENT ON CONSTRAINT check_deliveries_completed_valid ON subscriptions IS 
  'Ensures deliveries_completed never exceeds deliveries_total';

COMMENT ON CONSTRAINT check_deliveries_total_matches_plan ON subscriptions IS 
  'Ensures deliveries_total matches the plan type (trimestral=3, semestral=6, anual=12)';

COMMENT ON CONSTRAINT check_total_paid_non_negative ON subscriptions IS 
  'Ensures total_paid is never negative';
