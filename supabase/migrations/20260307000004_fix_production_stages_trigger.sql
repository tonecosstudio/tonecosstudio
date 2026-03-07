-- =====================================================
-- MIGRATION: Fix Production Stages Trigger
-- Date: 2026-03-07
-- Description: Fixes the initialize_production_stages trigger to handle schema correctly
-- =====================================================

-- =====================================================
-- 1. DROP AND RECREATE THE TRIGGER FUNCTION
-- =====================================================

-- Drop the trigger first
DROP TRIGGER IF EXISTS trigger_initialize_production_stages ON production_queue;

-- Recreate the function with proper error handling
CREATE OR REPLACE FUNCTION initialize_production_stages()
RETURNS TRIGGER AS $$
BEGIN
  -- Create all 6 stages for the new production queue item
  -- Using explicit column list to avoid issues with extra columns
  INSERT INTO production_stages (
    production_queue_id,
    stage_name,
    stage_order,
    status,
    estimated_duration
  ) VALUES
    (NEW.id, 'awaiting_choice', 1, 'pending', 168), -- 7 days
    (NEW.id, 'design', 2, 'pending', 48),           -- 2 days
    (NEW.id, 'production', 3, 'pending', 120),      -- 5 days
    (NEW.id, 'quality_check', 4, 'pending', 24),    -- 1 day
    (NEW.id, 'packaging', 5, 'pending', 12),        -- 12 hours
    (NEW.id, 'shipped', 6, 'pending', 0)            -- 0 hours (instant)
  ON CONFLICT (production_queue_id, stage_order) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the production_queue insert
    RAISE WARNING 'Failed to initialize production stages for queue %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION initialize_production_stages IS 
  'Initializes all 6 production stages when a new item is added to production_queue. Includes error handling to prevent blocking queue inserts.';

-- Recreate the trigger
CREATE TRIGGER trigger_initialize_production_stages
  AFTER INSERT ON production_queue
  FOR EACH ROW
  EXECUTE FUNCTION initialize_production_stages();

-- =====================================================
-- 2. VALIDATE MIGRATION
-- =====================================================

DO $$
BEGIN
  -- Check if trigger was created
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'trigger_initialize_production_stages'
  ) THEN
    RAISE EXCEPTION 'Trigger trigger_initialize_production_stages was not created';
  END IF;
  
  RAISE NOTICE '✓ Trigger recreated successfully with error handling';
  RAISE NOTICE 'Migration 20260307000004_fix_production_stages_trigger.sql completed successfully';
END $$;
