-- Migration: Fix collections RLS for subscription joins (FINAL)
-- Purpose: Allow users to see collections through subscription_collections join
-- Date: 2026-05-03
-- Issue: 406 error when querying subscriptions with collections join

-- ============================================
-- Remove old conflicting policies
-- ============================================

DROP POLICY IF EXISTS "ColeÃƒÂ§ÃƒÂµes ativas sÃƒÂ£o pÃƒÂºblicas" ON collections;
DROP POLICY IF EXISTS "Admins podem ver todas as coleÃƒÂ§ÃƒÂµes" ON collections;
DROP POLICY IF EXISTS "Users can view active collections" ON collections;
DROP POLICY IF EXISTS "Users can view collections from their subscriptions" ON collections;
DROP POLICY IF EXISTS "Admins can view all collections" ON collections;

-- ============================================
-- Create new, correct policies
-- ============================================

-- Policy 1: Allow authenticated users to view active collections
-- Used for: Public catalog, browsing collections
CREATE POLICY "collections_select_active"
  ON collections FOR SELECT
  USING (is_active = true);

-- Policy 2: Allow users to view collections from their subscriptions
-- Used for: Join subscriptions Ã¢â€ â€™ subscription_collections Ã¢â€ â€™ collections
-- This is the KEY policy that fixes the 406 error!
CREATE POLICY "collections_select_from_subscriptions"
  ON collections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM subscription_collections sc
      JOIN subscriptions s ON s.id = sc.subscription_id
      WHERE sc.collection_id = collections.id
      AND s.user_id = auth.uid()
    )
  );

-- Policy 3: Allow admins to view all collections
-- Used for: Admin panel
CREATE POLICY "collections_select_admin"
  ON collections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- ============================================
-- Add comments for documentation
-- ============================================

COMMENT ON POLICY "collections_select_active" ON collections IS 
  'Allows authenticated users to view active collections (public catalog)';

COMMENT ON POLICY "collections_select_from_subscriptions" ON collections IS 
  'Allows users to view collections from their own subscriptions (fixes 406 error on joins)';

COMMENT ON POLICY "collections_select_admin" ON collections IS 
  'Allows admins to view all collections';

-- ============================================
-- Verification
-- ============================================

-- Log the policies that were created
DO $$
BEGIN
  RAISE NOTICE 'Ã¢Å“â€¦ Collections RLS policies updated successfully';
  RAISE NOTICE '   - collections_select_active';
  RAISE NOTICE '   - collections_select_from_subscriptions';
  RAISE NOTICE '   - collections_select_admin';
END $$;
