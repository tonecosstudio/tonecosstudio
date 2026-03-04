-- =====================================================
-- MIGRATION: Fix standalone_purchases profile relationship
-- Date: 2026-04-21
-- Description: Changes user_id foreign key to reference profiles instead of auth.users
--              This allows Supabase to properly join with profiles table
-- =====================================================

-- =====================================================
-- 1. DROP EXISTING FOREIGN KEY CONSTRAINT
-- =====================================================

-- Drop the existing foreign key constraint that references auth.users
ALTER TABLE standalone_purchases
  DROP CONSTRAINT IF EXISTS standalone_purchases_user_id_fkey;

-- =====================================================
-- 2. ADD NEW FOREIGN KEY CONSTRAINT TO PROFILES
-- =====================================================

-- Add new foreign key constraint that references profiles
-- This works because profiles.id also references auth.users(id)
-- So the relationship chain is: standalone_purchases.user_id -> profiles.id -> auth.users.id
ALTER TABLE standalone_purchases
  ADD CONSTRAINT standalone_purchases_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- =====================================================
-- 3. VALIDATE THE CHANGE
-- =====================================================

DO $$
BEGIN
  -- Check if the new foreign key constraint exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'standalone_purchases_user_id_fkey'
    AND table_name = 'standalone_purchases'
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    RAISE EXCEPTION 'Foreign key constraint standalone_purchases_user_id_fkey was not created';
  END IF;
  
  -- Verify the constraint references profiles table
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.constraint_column_usage
    WHERE constraint_name = 'standalone_purchases_user_id_fkey'
    AND table_name = 'profiles'
  ) THEN
    RAISE EXCEPTION 'Foreign key constraint does not reference profiles table';
  END IF;
  
  RAISE NOTICE 'Migration 20260421000000_fix_standalone_purchases_profile_relationship.sql completed successfully';
END $$;

-- =====================================================
-- 4. MIGRATION SUMMARY
-- =====================================================

SELECT 
  '20260421000000_fix_standalone_purchases_profile_relationship.sql' AS migration_file,
  'Fix standalone_purchases profile relationship' AS description,
  'SUCCESS' AS status,
  NOW() AS executed_at;
