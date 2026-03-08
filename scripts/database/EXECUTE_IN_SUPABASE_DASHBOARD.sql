-- ============================================================================
-- MIGRATION: Update Production Stages (6 → 12 stages)
-- Execute this SQL in Supabase Dashboard > SQL Editor
-- ============================================================================

-- Step 1: Remove old constraint FIRST
ALTER TABLE production_queue
DROP CONSTRAINT IF EXISTS production_queue_current_stage_check;

-- Step 2: Migrate existing data (NOW we can update without constraint blocking)
UPDATE production_queue 
SET current_stage = 'model_preparation'
WHERE current_stage = 'design';

UPDATE production_queue 
SET current_stage = 'printing'
WHERE current_stage = 'production';

-- Step 3: Update production_stages table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'production_stages') THEN
    UPDATE production_stages 
    SET stage_name = 'model_preparation'
    WHERE stage_name = 'design';
    
    UPDATE production_stages 
    SET stage_name = 'printing'
    WHERE stage_name = 'production';
  END IF;
END $$;

-- Step 4: Add new constraint with 12 stages (AFTER data migration)
ALTER TABLE production_queue
ADD CONSTRAINT production_queue_current_stage_check
CHECK (current_stage IN (
  'awaiting_payment', 'payment_confirmed', 'awaiting_choice',
  'model_preparation', 'printing', 'post_processing', 'painting',
  'quality_check', 'packaging', 'ready_to_ship', 'shipped', 'delivered'
));

-- Step 5: Verification query
SELECT 
  current_stage,
  COUNT(*) as count
FROM production_queue
GROUP BY current_stage
ORDER BY count DESC;

-- ============================================================================
-- Expected Result:
-- - No items with 'design' or 'production' stages
-- - All items have valid new stage names
-- - Constraint successfully applied
-- ============================================================================
