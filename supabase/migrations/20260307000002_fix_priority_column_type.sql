-- =====================================================
-- MIGRATION: Fix Priority Column Type
-- Date: 2026-03-07
-- Description: Fixes priority column type mismatch in production_queue
-- =====================================================

-- The priority column should be TEXT (enum-like), not INTEGER
-- This migration fixes the type if it's wrong

DO $$
BEGIN
  -- Check current type
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'production_queue' 
      AND column_name = 'priority'
      AND data_type != 'text'
  ) THEN
    RAISE NOTICE 'Fixing priority column type from % to TEXT', 
      (SELECT data_type FROM information_schema.columns 
       WHERE table_name = 'production_queue' AND column_name = 'priority');
    
    -- Drop the trigger temporarily
    DROP TRIGGER IF EXISTS trigger_update_production_queue_priority ON production_queue;
    
    -- Change column type
    ALTER TABLE production_queue 
      ALTER COLUMN priority TYPE TEXT;
    
    -- Add constraint
    ALTER TABLE production_queue
      DROP CONSTRAINT IF EXISTS production_queue_priority_check;
    
    ALTER TABLE production_queue
      ADD CONSTRAINT production_queue_priority_check 
      CHECK (priority IN ('critical', 'high', 'normal', 'low'));
    
    -- Recreate the trigger
    CREATE TRIGGER trigger_update_production_queue_priority
      BEFORE INSERT OR UPDATE OF order_type, choice_deadline, created_at
      ON production_queue
      FOR EACH ROW
      EXECUTE FUNCTION update_production_queue_priority();
    
    RAISE NOTICE '✓ Priority column fixed';
  ELSE
    RAISE NOTICE '✓ Priority column type is already correct (TEXT)';
  END IF;
END $$;
