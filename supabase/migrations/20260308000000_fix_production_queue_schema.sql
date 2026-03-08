-- =====================================================
-- FIX: Remove user_id column from production_queue
-- Date: 2026-03-08
-- Issue: Table has both user_id and customer_id, but should only have customer_id
-- Root cause: Migration 20260307000003 incorrectly added user_id column
-- =====================================================

-- Remove user_id column if it exists (it shouldn't)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'production_queue' 
    AND column_name = 'user_id'
  ) THEN
    RAISE NOTICE 'Removing incorrect user_id column from production_queue...';
    ALTER TABLE production_queue DROP COLUMN user_id;
    RAISE NOTICE '✅ Column user_id removed successfully';
  ELSE
    RAISE NOTICE '✅ Column user_id does not exist (correct state)';
  END IF;
END $$;

-- Ensure customer_id exists and is nullable (correct schema)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'production_queue' 
    AND column_name = 'customer_id'
  ) THEN
    RAISE NOTICE 'Adding customer_id column...';
    ALTER TABLE production_queue 
    ADD COLUMN customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Column customer_id added successfully';
  ELSE
    RAISE NOTICE '✅ Column customer_id already exists (correct state)';
  END IF;
END $$;

-- Validation
DO $$
DECLARE
  v_has_user_id BOOLEAN;
  v_has_customer_id BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'production_queue' AND column_name = 'user_id'
  ) INTO v_has_user_id;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'production_queue' AND column_name = 'customer_id'
  ) INTO v_has_customer_id;
  
  IF v_has_user_id THEN
    RAISE EXCEPTION '❌ VALIDATION FAILED: user_id column still exists';
  END IF;
  
  IF NOT v_has_customer_id THEN
    RAISE EXCEPTION '❌ VALIDATION FAILED: customer_id column does not exist';
  END IF;
  
  RAISE NOTICE '✅ VALIDATION PASSED: Schema is correct';
  RAISE NOTICE '   - user_id: does not exist ✓';
  RAISE NOTICE '   - customer_id: exists ✓';
END $$;
