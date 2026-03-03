-- Migration: Cleanup duplicate and invalid subscriptions
-- Purpose: Remove duplicate subscriptions and fix data inconsistencies
-- Date: 2026-05-04
-- WARNING: This migration modifies data. Review before applying!

-- ============================================
-- PART 1: Identify and log duplicates
-- ============================================

DO $
DECLARE
  v_duplicate_count INTEGER;
BEGIN
  -- Count duplicate pending_payment subscriptions
  SELECT COUNT(*) INTO v_duplicate_count
  FROM (
    SELECT user_id, COUNT(*) as count
    FROM subscriptions
    WHERE status = 'pending_payment'
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  RAISE NOTICE 'Found % users with duplicate pending_payment subscriptions', v_duplicate_count;
END $;

-- ============================================
-- PART 2: Cancel duplicate pending_payment subscriptions
-- ============================================

-- Keep only the most recent pending_payment subscription per user
-- Cancel older ones
WITH ranked_subscriptions AS (
  SELECT 
    id,
    user_id,
    status,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, status 
      ORDER BY created_at DESC
    ) as rn
  FROM subscriptions
  WHERE status = 'pending_payment'
)
UPDATE subscriptions s
SET 
  status = 'cancelled',
  updated_at = NOW()
FROM ranked_subscriptions rs
WHERE s.id = rs.id
AND rs.rn > 1
AND rs.status = 'pending_payment';

-- ============================================
-- PART 3: Fix subscriptions with missing data
-- ============================================

-- Fix active subscriptions with NULL deliveries_total
UPDATE subscriptions
SET 
  deliveries_total = CASE 
    WHEN plan_type = 'trimestral' THEN 3
    WHEN plan_type = 'semestral' THEN 6
    WHEN plan_type = 'anual' THEN 12
    ELSE 3
  END,
  deliveries_completed = COALESCE(deliveries_completed, 0),
  updated_at = NOW()
WHERE status = 'active'
AND (deliveries_total IS NULL OR deliveries_total = 0);

-- Fix active subscriptions with NULL dates
UPDATE subscriptions
SET 
  next_delivery_date = COALESCE(next_delivery_date, NOW() + INTERVAL '30 days'),
  next_production_start = COALESCE(next_production_start, NOW() + INTERVAL '15 days'),
  updated_at = NOW()
WHERE status = 'active'
AND (next_delivery_date IS NULL OR next_production_start IS NULL);

-- ============================================
-- PART 4: Log cleanup results
-- ============================================

DO $
DECLARE
  v_cancelled_count INTEGER;
  v_fixed_count INTEGER;
BEGIN
  -- Count cancelled subscriptions
  SELECT COUNT(*) INTO v_cancelled_count
  FROM subscriptions
  WHERE status = 'cancelled'
  AND updated_at > NOW() - INTERVAL '1 minute';
  
  -- Count fixed subscriptions
  SELECT COUNT(*) INTO v_fixed_count
  FROM subscriptions
  WHERE status = 'active'
  AND updated_at > NOW() - INTERVAL '1 minute';
  
  RAISE NOTICE '✅ Cleanup completed:';
  RAISE NOTICE '   - Cancelled duplicate subscriptions: %', v_cancelled_count;
  RAISE NOTICE '   - Fixed active subscriptions: %', v_fixed_count;
END $;
