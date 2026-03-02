-- =====================================================
-- MIGRATION: Create indexes for orders consolidation page
-- Date: 2026-04-25
-- Description: Creates database indexes to optimize query performance for the unified orders page
-- Requirements: 11.3
-- Task: 11.1 Criar índices de banco de dados
-- =====================================================

-- =====================================================
-- OVERVIEW
-- =====================================================
-- This migration creates indexes to optimize the orders consolidation page that unifies
-- subscription_deliveries and standalone_purchases into a single view.
--
-- The indexes optimize:
-- - Status filtering (most common filter)
-- - Date sorting (default sort order)
-- - Tracking code lookups
-- - User-based queries
-- - Common filter combinations

-- =====================================================
-- 1. SUBSCRIPTION_DELIVERIES INDEXES
-- =====================================================

-- Note: idx_subscription_deliveries_status already exists from 20260202115000_create_subscriptions_system.sql
-- We'll create it only if it doesn't exist

DO $
BEGIN
  -- Index for status filtering (if not exists)
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'subscription_deliveries' 
    AND indexname = 'idx_subscription_deliveries_status'
  ) THEN
    CREATE INDEX idx_subscription_deliveries_status ON subscription_deliveries(status);
    RAISE NOTICE 'Created index: idx_subscription_deliveries_status';
  ELSE
    RAISE NOTICE 'Index already exists: idx_subscription_deliveries_status';
  END IF;
END $;

-- Index for date sorting (created_at DESC for default sort order)
CREATE INDEX IF NOT EXISTS idx_subscription_deliveries_created_at_desc 
  ON subscription_deliveries(created_at DESC);

COMMENT ON INDEX idx_subscription_deliveries_created_at_desc IS 
  'Optimizes default sort order (most recent first) for orders consolidation page';

-- Index for tracking code lookups
CREATE INDEX IF NOT EXISTS idx_subscription_deliveries_tracking_code 
  ON subscription_deliveries(tracking_code) 
  WHERE tracking_code IS NOT NULL;

COMMENT ON INDEX idx_subscription_deliveries_tracking_code IS 
  'Optimizes search by tracking code (partial index for non-null values only)';

-- Composite index for common filter: status + created_at
CREATE INDEX IF NOT EXISTS idx_subscription_deliveries_status_created_at 
  ON subscription_deliveries(status, created_at DESC);

COMMENT ON INDEX idx_subscription_deliveries_status_created_at IS 
  'Optimizes filtering by status with date sorting (most common query pattern)';

-- Composite index for subscription + status (for user-specific queries)
CREATE INDEX IF NOT EXISTS idx_subscription_deliveries_subscription_status 
  ON subscription_deliveries(subscription_id, status);

COMMENT ON INDEX idx_subscription_deliveries_subscription_status IS 
  'Optimizes queries filtering by subscription and status';

-- =====================================================
-- 2. STANDALONE_PURCHASES INDEXES
-- =====================================================

-- Note: idx_standalone_purchases_status already exists from 20260315000000_create_standalone_purchases.sql
-- We'll verify it exists

DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'standalone_purchases' 
    AND indexname = 'idx_standalone_purchases_status'
  ) THEN
    CREATE INDEX idx_standalone_purchases_status ON standalone_purchases(status);
    RAISE NOTICE 'Created index: idx_standalone_purchases_status';
  ELSE
    RAISE NOTICE 'Index already exists: idx_standalone_purchases_status';
  END IF;
END $;

-- Index for date sorting (created_at DESC for default sort order)
CREATE INDEX IF NOT EXISTS idx_standalone_purchases_created_at_desc 
  ON standalone_purchases(created_at DESC);

COMMENT ON INDEX idx_standalone_purchases_created_at_desc IS 
  'Optimizes default sort order (most recent first) for orders consolidation page';

-- Index for tracking code lookups
CREATE INDEX IF NOT EXISTS idx_standalone_purchases_tracking_code 
  ON standalone_purchases(tracking_code) 
  WHERE tracking_code IS NOT NULL;

COMMENT ON INDEX idx_standalone_purchases_tracking_code IS 
  'Optimizes search by tracking code (partial index for non-null values only)';

-- Note: idx_standalone_purchases_user already exists from 20260315000000_create_standalone_purchases.sql
-- We'll verify it exists

DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'standalone_purchases' 
    AND indexname = 'idx_standalone_purchases_user'
  ) THEN
    CREATE INDEX idx_standalone_purchases_user ON standalone_purchases(user_id);
    RAISE NOTICE 'Created index: idx_standalone_purchases_user';
  ELSE
    RAISE NOTICE 'Index already exists: idx_standalone_purchases_user';
  END IF;
END $;

-- Composite index for common filter: status + created_at
CREATE INDEX IF NOT EXISTS idx_standalone_purchases_status_created_at 
  ON standalone_purchases(status, created_at DESC);

COMMENT ON INDEX idx_standalone_purchases_status_created_at IS 
  'Optimizes filtering by status with date sorting (most common query pattern)';

-- Composite index for user + status (for user-specific queries)
CREATE INDEX IF NOT EXISTS idx_standalone_purchases_user_status 
  ON standalone_purchases(user_id, status);

COMMENT ON INDEX idx_standalone_purchases_user_status IS 
  'Optimizes queries filtering by user and status';

-- Composite index for collection + status (for collection-specific admin queries)
CREATE INDEX IF NOT EXISTS idx_standalone_purchases_collection_status 
  ON standalone_purchases(collection_id, status);

COMMENT ON INDEX idx_standalone_purchases_collection_status IS 
  'Optimizes queries filtering by collection and status';

-- =====================================================
-- 3. VALIDATE INDEX CREATION
-- =====================================================

DO $
DECLARE
  v_subscription_deliveries_indexes INTEGER;
  v_standalone_purchases_indexes INTEGER;
BEGIN
  -- Count indexes for subscription_deliveries
  SELECT COUNT(*) INTO v_subscription_deliveries_indexes
  FROM pg_indexes 
  WHERE tablename = 'subscription_deliveries' 
  AND indexname IN (
    'idx_subscription_deliveries_status',
    'idx_subscription_deliveries_created_at_desc',
    'idx_subscription_deliveries_tracking_code',
    'idx_subscription_deliveries_status_created_at',
    'idx_subscription_deliveries_subscription_status'
  );
  
  -- Count indexes for standalone_purchases
  SELECT COUNT(*) INTO v_standalone_purchases_indexes
  FROM pg_indexes 
  WHERE tablename = 'standalone_purchases' 
  AND indexname IN (
    'idx_standalone_purchases_status',
    'idx_standalone_purchases_created_at_desc',
    'idx_standalone_purchases_tracking_code',
    'idx_standalone_purchases_user',
    'idx_standalone_purchases_status_created_at',
    'idx_standalone_purchases_user_status',
    'idx_standalone_purchases_collection_status'
  );
  
  -- Validate subscription_deliveries indexes
  IF v_subscription_deliveries_indexes < 5 THEN
    RAISE WARNING 'Expected 5 indexes for subscription_deliveries, found %', v_subscription_deliveries_indexes;
  ELSE
    RAISE NOTICE 'All % indexes created for subscription_deliveries', v_subscription_deliveries_indexes;
  END IF;
  
  -- Validate standalone_purchases indexes
  IF v_standalone_purchases_indexes < 7 THEN
    RAISE WARNING 'Expected 7 indexes for standalone_purchases, found %', v_standalone_purchases_indexes;
  ELSE
    RAISE NOTICE 'All % indexes created for standalone_purchases', v_standalone_purchases_indexes;
  END IF;
  
  RAISE NOTICE 'Migration 20260425000000_create_orders_consolidation_indexes.sql completed successfully';
END $;

-- =====================================================
-- 4. MIGRATION SUMMARY
-- =====================================================

SELECT 
  '20260425000000_create_orders_consolidation_indexes.sql' AS migration_file,
  'Create indexes for orders consolidation page' AS description,
  'SUCCESS' AS status,
  NOW() AS executed_at,
  (
    SELECT COUNT(*) 
    FROM pg_indexes 
    WHERE tablename IN ('subscription_deliveries', 'standalone_purchases')
    AND indexname LIKE 'idx_%'
  ) AS total_indexes_created;

-- =====================================================
-- 5. PERFORMANCE NOTES
-- =====================================================

-- Expected query performance improvements:
-- 1. Status filtering: O(n) -> O(log n) with idx_*_status
-- 2. Date sorting: O(n log n) -> O(log n) with idx_*_created_at_desc
-- 3. Tracking code search: O(n) -> O(log n) with idx_*_tracking_code
-- 4. Combined filters: O(n) -> O(log n) with composite indexes
--
-- Composite indexes are used for queries like:
-- - SELECT * FROM subscription_deliveries WHERE status = 'shipped' ORDER BY created_at DESC
-- - SELECT * FROM standalone_purchases WHERE user_id = ? AND status = 'awaiting_balance'
--
-- Partial indexes (tracking_code) save space by only indexing non-null values
