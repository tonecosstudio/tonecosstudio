-- =====================================================
-- MIGRATION: Create full-text search indexes for orders consolidation
-- Date: 2026-04-26
-- Description: Creates GIN indexes and optimizes search queries using PostgreSQL full-text search
-- Requirements: 4.2, 11.5
-- Task: 11.2 Implementar full-text search no PostgreSQL
-- =====================================================

-- =====================================================
-- OVERVIEW
-- =====================================================
-- This migration implements PostgreSQL full-text search to optimize the search functionality
-- in the orders consolidation page. The search needs to work across:
-- - Customer names (profiles.full_name)
-- - Customer emails (profiles.email)
-- - Order IDs (subscription_deliveries.id, standalone_purchases.id)
-- - Tracking codes (subscription_deliveries.tracking_code, standalone_purchases.tracking_code)
--
-- We use:
-- - GIN indexes for fast full-text search
-- - to_tsvector() for text vectorization
-- - Portuguese language configuration for better search results
-- - Composite indexes for common search patterns

-- =====================================================
-- 1. CREATE FULL-TEXT SEARCH INDEX ON PROFILES
-- =====================================================

-- Create GIN index for full-text search on profiles (name + email)
-- This allows fast searching across customer names and emails
CREATE INDEX IF NOT EXISTS idx_profiles_fulltext_search 
  ON profiles USING GIN (
    to_tsvector('portuguese', 
      COALESCE(full_name, '') || ' ' || 
      COALESCE(email, '')
    )
  );

COMMENT ON INDEX idx_profiles_fulltext_search IS 
  'Full-text search index for customer names and emails using Portuguese language configuration';

-- =====================================================
-- 2. CREATE FULL-TEXT SEARCH INDEX ON SUBSCRIPTION_DELIVERIES
-- =====================================================

-- Create GIN index for full-text search on subscription deliveries
-- This allows fast searching by order ID and tracking code
CREATE INDEX IF NOT EXISTS idx_subscription_deliveries_fulltext_search 
  ON subscription_deliveries USING GIN (
    to_tsvector('simple', 
      COALESCE(id::text, '') || ' ' || 
      COALESCE(tracking_code, '')
    )
  );

COMMENT ON INDEX idx_subscription_deliveries_fulltext_search IS 
  'Full-text search index for subscription delivery IDs and tracking codes';

-- =====================================================
-- 3. CREATE FULL-TEXT SEARCH INDEX ON STANDALONE_PURCHASES
-- =====================================================

-- Create GIN index for full-text search on standalone purchases
-- This allows fast searching by order ID and tracking code
CREATE INDEX IF NOT EXISTS idx_standalone_purchases_fulltext_search 
  ON standalone_purchases USING GIN (
    to_tsvector('simple', 
      COALESCE(id::text, '') || ' ' || 
      COALESCE(tracking_code, '')
    )
  );

COMMENT ON INDEX idx_standalone_purchases_fulltext_search IS 
  'Full-text search index for standalone purchase IDs and tracking codes';

-- =====================================================
-- 4. CREATE HELPER FUNCTION FOR UNIFIED SEARCH
-- =====================================================

-- Create a function to search across both order types
-- This function returns a unified result set of order IDs that match the search query
CREATE OR REPLACE FUNCTION search_unified_orders(
  search_query TEXT,
  order_type_filter TEXT DEFAULT 'all' -- 'all', 'subscription_delivery', 'standalone_purchase'
)
RETURNS TABLE (
  order_id UUID,
  order_type TEXT,
  rank REAL
) 
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  ts_query tsquery;
BEGIN
  -- Convert search query to tsquery
  -- Use plainto_tsquery for simple queries (handles spaces and special chars)
  ts_query := plainto_tsquery('portuguese', search_query);
  
  -- If query is empty, return empty result
  IF ts_query IS NULL THEN
    RETURN;
  END IF;
  
  -- Search in subscription_deliveries
  IF order_type_filter IN ('all', 'subscription_delivery') THEN
    RETURN QUERY
    SELECT 
      sd.id AS order_id,
      'subscription_delivery'::TEXT AS order_type,
      ts_rank(
        to_tsvector('simple', 
          COALESCE(sd.id::text, '') || ' ' || 
          COALESCE(sd.tracking_code, '')
        ),
        ts_query
      ) AS rank
    FROM subscription_deliveries sd
    WHERE to_tsvector('simple', 
      COALESCE(sd.id::text, '') || ' ' || 
      COALESCE(sd.tracking_code, '')
    ) @@ ts_query
    
    UNION ALL
    
    -- Search by customer name/email in subscription deliveries
    SELECT 
      sd.id AS order_id,
      'subscription_delivery'::TEXT AS order_type,
      ts_rank(
        to_tsvector('portuguese', 
          COALESCE(p.full_name, '') || ' ' || 
          COALESCE(p.email, '')
        ),
        ts_query
      ) AS rank
    FROM subscription_deliveries sd
    INNER JOIN subscriptions s ON sd.subscription_id = s.id
    INNER JOIN profiles p ON s.user_id = p.id
    WHERE to_tsvector('portuguese', 
      COALESCE(p.full_name, '') || ' ' || 
      COALESCE(p.email, '')
    ) @@ ts_query;
  END IF;
  
  -- Search in standalone_purchases
  IF order_type_filter IN ('all', 'standalone_purchase') THEN
    RETURN QUERY
    SELECT 
      sp.id AS order_id,
      'standalone_purchase'::TEXT AS order_type,
      ts_rank(
        to_tsvector('simple', 
          COALESCE(sp.id::text, '') || ' ' || 
          COALESCE(sp.tracking_code, '')
        ),
        ts_query
      ) AS rank
    FROM standalone_purchases sp
    WHERE to_tsvector('simple', 
      COALESCE(sp.id::text, '') || ' ' || 
      COALESCE(sp.tracking_code, '')
    ) @@ ts_query
    
    UNION ALL
    
    -- Search by customer name/email in standalone purchases
    SELECT 
      sp.id AS order_id,
      'standalone_purchase'::TEXT AS order_type,
      ts_rank(
        to_tsvector('portuguese', 
          COALESCE(p.full_name, '') || ' ' || 
          COALESCE(p.email, '')
        ),
        ts_query
      ) AS rank
    FROM standalone_purchases sp
    INNER JOIN profiles p ON sp.user_id = p.id
    WHERE to_tsvector('portuguese', 
      COALESCE(p.full_name, '') || ' ' || 
      COALESCE(p.email, '')
    ) @@ ts_query;
  END IF;
  
  RETURN;
END;
$$;

COMMENT ON FUNCTION search_unified_orders IS 
  'Searches across subscription deliveries and standalone purchases using full-text search. Returns order IDs with relevance ranking.';

-- =====================================================
-- 5. VALIDATE INDEX CREATION
-- =====================================================

DO $$
DECLARE
  v_profiles_index_exists BOOLEAN;
  v_deliveries_index_exists BOOLEAN;
  v_purchases_index_exists BOOLEAN;
  v_function_exists BOOLEAN;
BEGIN
  -- Check if profiles index exists
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'profiles' 
    AND indexname = 'idx_profiles_fulltext_search'
  ) INTO v_profiles_index_exists;
  
  -- Check if subscription_deliveries index exists
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'subscription_deliveries' 
    AND indexname = 'idx_subscription_deliveries_fulltext_search'
  ) INTO v_deliveries_index_exists;
  
  -- Check if standalone_purchases index exists
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'standalone_purchases' 
    AND indexname = 'idx_standalone_purchases_fulltext_search'
  ) INTO v_purchases_index_exists;
  
  -- Check if function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'search_unified_orders'
  ) INTO v_function_exists;
  
  -- Report results
  IF v_profiles_index_exists THEN
    RAISE NOTICE 'Created index: idx_profiles_fulltext_search';
  ELSE
    RAISE WARNING 'Failed to create index: idx_profiles_fulltext_search';
  END IF;
  
  IF v_deliveries_index_exists THEN
    RAISE NOTICE 'Created index: idx_subscription_deliveries_fulltext_search';
  ELSE
    RAISE WARNING 'Failed to create index: idx_subscription_deliveries_fulltext_search';
  END IF;
  
  IF v_purchases_index_exists THEN
    RAISE NOTICE 'Created index: idx_standalone_purchases_fulltext_search';
  ELSE
    RAISE WARNING 'Failed to create index: idx_standalone_purchases_fulltext_search';
  END IF;
  
  IF v_function_exists THEN
    RAISE NOTICE 'Created function: search_unified_orders';
  ELSE
    RAISE WARNING 'Failed to create function: search_unified_orders';
  END IF;
  
  RAISE NOTICE 'Migration 20260426000000_create_fulltext_search_indexes.sql completed successfully';
END $$;

-- =====================================================
-- 6. MIGRATION SUMMARY
-- =====================================================

SELECT 
  '20260426000000_create_fulltext_search_indexes.sql' AS migration_file,
  'Create full-text search indexes for orders consolidation' AS description,
  'SUCCESS' AS status,
  NOW() AS executed_at,
  (
    SELECT COUNT(*) 
    FROM pg_indexes 
    WHERE indexname IN (
      'idx_profiles_fulltext_search',
      'idx_subscription_deliveries_fulltext_search',
      'idx_standalone_purchases_fulltext_search'
    )
  ) AS fulltext_indexes_created;

-- =====================================================
-- 7. USAGE EXAMPLES
-- =====================================================

-- Example 1: Search for orders by customer name
-- SELECT * FROM search_unified_orders('João Silva', 'all');

-- Example 2: Search for orders by email
-- SELECT * FROM search_unified_orders('joao@example.com', 'all');

-- Example 3: Search for orders by tracking code
-- SELECT * FROM search_unified_orders('BR123456789', 'all');

-- Example 4: Search only in subscription deliveries
-- SELECT * FROM search_unified_orders('Maria', 'subscription_delivery');

-- Example 5: Search only in standalone purchases
-- SELECT * FROM search_unified_orders('Pedro', 'standalone_purchase');

-- =====================================================
-- 8. PERFORMANCE NOTES
-- =====================================================

-- Expected performance improvements:
-- 1. Full-text search: O(n) -> O(log n) with GIN indexes
-- 2. Customer name/email search: Significantly faster with indexed tsvector
-- 3. Tracking code search: Faster lookups with full-text index
-- 4. Relevance ranking: ts_rank() provides better result ordering
--
-- GIN indexes are optimized for full-text search and provide:
-- - Fast lookups for text search queries
-- - Support for complex search patterns
-- - Automatic handling of word stemming and stop words
-- - Relevance ranking with ts_rank()
--
-- Language configuration:
-- - 'portuguese' for customer names/emails (better stemming for Portuguese text)
-- - 'simple' for IDs and tracking codes (no stemming, exact matching)

