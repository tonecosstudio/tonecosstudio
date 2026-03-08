-- =====================================================
-- FIX: production_queue current_stage constraint
-- Date: 2026-03-08
-- Issue: Constraint may not include all valid stage values
-- Solution: Drop and recreate constraint with correct values
-- =====================================================

-- Drop existing constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'production_queue'::regclass 
    AND conname = 'production_queue_current_stage_check'
  ) THEN
    RAISE NOTICE 'Dropping existing current_stage constraint...';
    ALTER TABLE production_queue DROP CONSTRAINT production_queue_current_stage_check;
    RAISE NOTICE '✅ Constraint dropped';
  ELSE
    RAISE NOTICE '✅ No existing constraint to drop';
  END IF;
END $$;

-- Add correct constraint with all valid values
ALTER TABLE production_queue
ADD CONSTRAINT production_queue_current_stage_check
CHECK (current_stage IN (
  'awaiting_choice',
  'design',
  'production',
  'quality_check',
  'packaging',
  'shipped'
));

-- Validation
DO $$
DECLARE
  v_constraint_def TEXT;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO v_constraint_def
  FROM pg_constraint
  WHERE conrelid = 'production_queue'::regclass
  AND conname = 'production_queue_current_stage_check';
  
  IF v_constraint_def IS NULL THEN
    RAISE EXCEPTION '❌ VALIDATION FAILED: Constraint was not created';
  END IF;
  
  -- Check if all required values are in the constraint
  IF v_constraint_def NOT LIKE '%awaiting_choice%' THEN
    RAISE EXCEPTION '❌ VALIDATION FAILED: Missing awaiting_choice';
  END IF;
  
  IF v_constraint_def NOT LIKE '%design%' THEN
    RAISE EXCEPTION '❌ VALIDATION FAILED: Missing design';
  END IF;
  
  IF v_constraint_def NOT LIKE '%production%' THEN
    RAISE EXCEPTION '❌ VALIDATION FAILED: Missing production';
  END IF;
  
  IF v_constraint_def NOT LIKE '%quality_check%' THEN
    RAISE EXCEPTION '❌ VALIDATION FAILED: Missing quality_check';
  END IF;
  
  IF v_constraint_def NOT LIKE '%packaging%' THEN
    RAISE EXCEPTION '❌ VALIDATION FAILED: Missing packaging';
  END IF;
  
  IF v_constraint_def NOT LIKE '%shipped%' THEN
    RAISE EXCEPTION '❌ VALIDATION FAILED: Missing shipped';
  END IF;
  
  RAISE NOTICE '✅ VALIDATION PASSED: All stage values are in constraint';
  RAISE NOTICE '   Constraint: %', v_constraint_def;
END $$;

-- Test update to 'production' stage
DO $$
DECLARE
  v_test_id UUID;
BEGIN
  -- Get a test item
  SELECT id INTO v_test_id
  FROM production_queue
  WHERE current_stage = 'design'
  LIMIT 1;
  
  IF v_test_id IS NULL THEN
    RAISE NOTICE '⚠️ No item in "design" stage to test';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Testing update to "production" stage...';
  
  -- Try to update to 'production'
  UPDATE production_queue
  SET current_stage = 'production'
  WHERE id = v_test_id;
  
  -- Rollback the test
  UPDATE production_queue
  SET current_stage = 'design'
  WHERE id = v_test_id;
  
  RAISE NOTICE '✅ Test passed: "production" stage is now valid';
  
EXCEPTION
  WHEN check_violation THEN
    RAISE EXCEPTION '❌ Test failed: "production" stage is still invalid';
END $$;
