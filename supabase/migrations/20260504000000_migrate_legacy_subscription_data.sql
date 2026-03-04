-- Migration: Migrate legacy subscription data to new N:N model
-- Purpose: Migrate collection_id to subscription_collections table
-- Date: 2026-05-04

-- ============================================
-- PART 1: Migrate existing data
-- ============================================

-- Migrate subscriptions that have collection_id but no subscription_collections
INSERT INTO subscription_collections (subscription_id, collection_id, added_at)
SELECT 
  s.id,
  s.collection_id,
  s.created_at
FROM subscriptions s
LEFT JOIN subscription_collections sc ON sc.subscription_id = s.id AND sc.collection_id = s.collection_id
WHERE s.collection_id IS NOT NULL
AND sc.id IS NULL
ON CONFLICT (subscription_id, collection_id) DO NOTHING;

-- ============================================
-- PART 2: Add helpful comments
-- ============================================

COMMENT ON COLUMN subscriptions.collection_id IS 
  'DEPRECATED: Legacy field. Use subscription_collections table for N:N relationship. Kept for backward compatibility only. Will be removed in future version.';

-- ============================================
-- PART 3: Log migration results
-- ============================================

DO $$
DECLARE
  v_migrated_count INTEGER;
  v_total_subscriptions INTEGER;
  v_subscriptions_with_collections INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_migrated_count FROM subscription_collections;
  SELECT COUNT(*) INTO v_total_subscriptions FROM subscriptions;
  SELECT COUNT(*) INTO v_subscriptions_with_collections FROM subscriptions WHERE collection_id IS NOT NULL;
  
  RAISE NOTICE 'Migration completed';
  RAISE NOTICE 'Total subscriptions: %', v_total_subscriptions;
  RAISE NOTICE 'Subscriptions with collection_id: %', v_subscriptions_with_collections;
  RAISE NOTICE 'Records in subscription_collections: %', v_migrated_count;
END $$;
