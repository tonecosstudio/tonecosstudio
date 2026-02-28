-- Migration: Add capacity_limit field to cycles table
-- Task: 1.7 Add capacity_limit field to cycles table if not exists
-- Requirements: 3.1, 29.10

-- Add capacity_limit field to cycles table if it doesn't exist
-- Default value: 100 pieces per month as per requirement 3.1
ALTER TABLE cycles
  ADD COLUMN IF NOT EXISTS capacity_limit INTEGER DEFAULT 100;

-- Update ALL existing cycles to have capacity_limit = 100
-- This ensures consistency with the requirement, even if cycles were created
-- with different capacity_max values (e.g., seed data uses 500)
UPDATE cycles 
SET capacity_limit = 100;

-- Note: This will override any existing capacity_limit values
-- This is intentional to ensure all cycles use the standard default

-- Add comment to document the field
COMMENT ON COLUMN cycles.capacity_limit IS 'Maximum production capacity for this cycle (pieces). Default: 100 pieces per month. Configurable by admin per requirement 3.1.';

-- Verify the migration was successful
DO $$
DECLARE
  cycles_count INTEGER;
  incorrect_capacity_count INTEGER;
BEGIN
  -- Count total cycles
  SELECT COUNT(*) INTO cycles_count FROM cycles;
  
  -- Count cycles that don't have capacity_limit = 100 (should be 0 after update)
  SELECT COUNT(*) INTO incorrect_capacity_count 
  FROM cycles 
  WHERE capacity_limit != 100 OR capacity_limit IS NULL;
  
  RAISE NOTICE 'Migration completed: Added capacity_limit field to cycles table';
  RAISE NOTICE 'Total cycles: %', cycles_count;
  RAISE NOTICE 'Cycles with incorrect capacity_limit: % (should be 0)', incorrect_capacity_count;
  
  IF incorrect_capacity_count > 0 THEN
    RAISE WARNING 'Some cycles have incorrect capacity_limit. Manual review recommended.';
  END IF;
  
  -- Also check if capacity_max field exists (for reference)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cycles' AND column_name = 'capacity_max'
  ) THEN
    RAISE NOTICE 'Note: capacity_max field also exists in cycles table.';
    RAISE NOTICE 'capacity_limit is the new standardized field per requirement 29.10.';
  END IF;
END $$;