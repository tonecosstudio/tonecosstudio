-- =====================================================
-- MIGRATION: Create production_stages table
-- Date: 2026-04-28
-- Description: Creates production stages table for tracking detailed production stage history
-- Requirements: 2.3.1, 2.3.2, 2.3.3, 2.3.4, 2.3.5
-- =====================================================

-- =====================================================
-- 1. CREATE PRODUCTION_STAGES TABLE
-- =====================================================

CREATE TABLE production_stages (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Production queue reference
  production_queue_id UUID NOT NULL REFERENCES production_queue(id) ON DELETE CASCADE,
  
  -- Stage details
  stage_name TEXT NOT NULL CHECK (stage_name IN (
    'awaiting_choice',
    'design',
    'production',
    'quality_check',
    'packaging',
    'shipped'
  )),
  stage_order INTEGER NOT NULL CHECK (stage_order BETWEEN 1 AND 6),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'in_progress',
    'completed',
    'blocked'
  )),
  
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_duration INTEGER NOT NULL DEFAULT 24, -- hours
  actual_duration INTEGER, -- hours (calculated)
  
  -- Assignment
  assigned_to UUID REFERENCES auth.users(id),
  assigned_to_name TEXT,
  assigned_at TIMESTAMPTZ,
  
  -- Documentation
  notes TEXT,
  photos TEXT[] DEFAULT '{}', -- Array of storage URLs
  
  -- Blocking issues
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  block_reason TEXT,
  blocked_at TIMESTAMPTZ,
  unblocked_at TIMESTAMPTZ,
  
  -- Audit timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_stage_dates CHECK (
    started_at IS NULL OR 
    completed_at IS NULL OR 
    started_at <= completed_at
  ),
  CONSTRAINT valid_block_reason CHECK (
    NOT is_blocked OR 
    (block_reason IS NOT NULL AND block_reason != '')
  ),
  CONSTRAINT valid_blocked_at CHECK (
    NOT is_blocked OR 
    blocked_at IS NOT NULL
  ),
  CONSTRAINT valid_completion CHECK (
    status != 'completed' OR 
    completed_at IS NOT NULL
  ),
  CONSTRAINT unique_stage_per_queue UNIQUE (production_queue_id, stage_order)
);

-- =====================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for production queue lookups (most common query)
CREATE INDEX idx_production_stages_queue ON production_stages(production_queue_id);

-- Index for status filtering
CREATE INDEX idx_production_stages_status ON production_stages(status);

-- Index for blocked items queries
CREATE INDEX idx_production_stages_blocked ON production_stages(is_blocked, blocked_at) 
  WHERE is_blocked = true;

-- Index for assignment queries
CREATE INDEX idx_production_stages_assigned ON production_stages(assigned_to) 
  WHERE assigned_to IS NOT NULL;

-- Composite index for queue and stage order (for sequential stage queries)
CREATE INDEX idx_production_stages_queue_order ON production_stages(production_queue_id, stage_order);

-- Index for in-progress stages
CREATE INDEX idx_production_stages_in_progress ON production_stages(started_at) 
  WHERE status = 'in_progress' AND completed_at IS NULL;

-- =====================================================
-- 3. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE production_stages IS 'Tracks detailed history of each production stage for every production queue item';

COMMENT ON COLUMN production_stages.production_queue_id IS 'ID of the production queue item this stage belongs to';
COMMENT ON COLUMN production_stages.stage_name IS 'Name of the production stage';
COMMENT ON COLUMN production_stages.stage_order IS 'Sequential order of the stage (1-6)';
COMMENT ON COLUMN production_stages.status IS 'Current status of the stage (pending/in_progress/completed/blocked)';
COMMENT ON COLUMN production_stages.started_at IS 'Timestamp when stage was started';
COMMENT ON COLUMN production_stages.completed_at IS 'Timestamp when stage was completed';
COMMENT ON COLUMN production_stages.estimated_duration IS 'Estimated duration for this stage in hours';
COMMENT ON COLUMN production_stages.actual_duration IS 'Actual duration in hours (auto-calculated from started_at and completed_at)';
COMMENT ON COLUMN production_stages.assigned_to IS 'ID of team member assigned to this stage';
COMMENT ON COLUMN production_stages.assigned_to_name IS 'Name of assigned team member (denormalized for performance)';
COMMENT ON COLUMN production_stages.assigned_at IS 'Timestamp when stage was assigned';
COMMENT ON COLUMN production_stages.notes IS 'Notes about this stage (e.g., issues encountered, special instructions)';
COMMENT ON COLUMN production_stages.photos IS 'Array of photo URLs from Supabase Storage';
COMMENT ON COLUMN production_stages.is_blocked IS 'Whether this stage is currently blocked';
COMMENT ON COLUMN production_stages.block_reason IS 'Reason why stage is blocked (required if is_blocked = true)';
COMMENT ON COLUMN production_stages.blocked_at IS 'Timestamp when stage was blocked';
COMMENT ON COLUMN production_stages.unblocked_at IS 'Timestamp when stage was unblocked';

-- =====================================================
-- 4. CREATE TRIGGER FOR UPDATED_AT TIMESTAMP
-- =====================================================

CREATE OR REPLACE FUNCTION update_production_stages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_production_stages_updated_at
  BEFORE UPDATE ON production_stages
  FOR EACH ROW
  EXECUTE FUNCTION update_production_stages_updated_at();

-- =====================================================
-- 5. CREATE FUNCTION TO CALCULATE ACTUAL DURATION
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_stage_actual_duration()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate actual duration when stage is completed
  IF NEW.completed_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
    NEW.actual_duration := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) / 3600;
  ELSE
    NEW.actual_duration := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_stage_actual_duration
  BEFORE INSERT OR UPDATE OF started_at, completed_at
  ON production_stages
  FOR EACH ROW
  EXECUTE FUNCTION calculate_stage_actual_duration();

-- =====================================================
-- 6. CREATE FUNCTION TO SYNC STAGE STATUS TO PRODUCTION QUEUE
-- =====================================================

CREATE OR REPLACE FUNCTION sync_production_stage_to_queue()
RETURNS TRIGGER AS $$
DECLARE
  v_stage_name TEXT;
  v_all_completed BOOLEAN;
BEGIN
  -- Get the stage name
  v_stage_name := NEW.stage_name;
  
  -- When a stage is completed, update production_queue current_stage
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    -- Check if this is the last stage
    IF v_stage_name = 'shipped' THEN
      UPDATE production_queue
      SET 
        current_stage = 'shipped',
        production_status = 'completed',
        production_completed_at = NEW.completed_at
      WHERE id = NEW.production_queue_id;
    ELSE
      -- Move to next stage
      UPDATE production_queue
      SET current_stage = CASE v_stage_name
        WHEN 'awaiting_choice' THEN 'design'
        WHEN 'design' THEN 'production'
        WHEN 'production' THEN 'quality_check'
        WHEN 'quality_check' THEN 'packaging'
        WHEN 'packaging' THEN 'shipped'
        ELSE current_stage
      END
      WHERE id = NEW.production_queue_id;
    END IF;
  END IF;
  
  -- When a stage is blocked, update production_queue status
  IF NEW.is_blocked = true AND (OLD IS NULL OR OLD.is_blocked = false) THEN
    UPDATE production_queue
    SET production_status = 'on_hold'
    WHERE id = NEW.production_queue_id;
  END IF;
  
  -- When a stage is unblocked, update production_queue status
  IF NEW.is_blocked = false AND OLD IS NOT NULL AND OLD.is_blocked = true THEN
    -- Check if all stages are completed
    SELECT NOT EXISTS (
      SELECT 1 FROM production_stages
      WHERE production_queue_id = NEW.production_queue_id
        AND status != 'completed'
        AND id != NEW.id
    ) INTO v_all_completed;
    
    IF v_all_completed THEN
      UPDATE production_queue
      SET production_status = 'completed'
      WHERE id = NEW.production_queue_id;
    ELSE
      UPDATE production_queue
      SET production_status = 'in_production'
      WHERE id = NEW.production_queue_id;
    END IF;
  END IF;
  
  -- When first stage starts, update production_started_at
  IF NEW.status = 'in_progress' AND NEW.started_at IS NOT NULL AND (OLD IS NULL OR OLD.status != 'in_progress') THEN
    UPDATE production_queue
    SET 
      production_started_at = COALESCE(production_started_at, NEW.started_at),
      production_status = CASE 
        WHEN production_status = 'ready_for_production' THEN 'in_production'
        ELSE production_status
      END
    WHERE id = NEW.production_queue_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_production_stage_to_queue
  AFTER INSERT OR UPDATE ON production_stages
  FOR EACH ROW
  EXECUTE FUNCTION sync_production_stage_to_queue();

-- =====================================================
-- 7. CREATE FUNCTION TO INITIALIZE STAGES FOR NEW PRODUCTION QUEUE ITEMS
-- =====================================================

CREATE OR REPLACE FUNCTION initialize_production_stages()
RETURNS TRIGGER AS $$
BEGIN
  -- Create all 6 stages for the new production queue item
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
    (NEW.id, 'shipped', 6, 'pending', 0);           -- 0 hours (instant)
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_initialize_production_stages
  AFTER INSERT ON production_queue
  FOR EACH ROW
  EXECUTE FUNCTION initialize_production_stages();

-- =====================================================
-- 8. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE production_stages ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all production stages
CREATE POLICY "Admins can view all production stages"
  ON production_stages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Admins can insert production stages
CREATE POLICY "Admins can insert production stages"
  ON production_stages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Admins can update production stages
CREATE POLICY "Admins can update production stages"
  ON production_stages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Admins can delete production stages
CREATE POLICY "Admins can delete production stages"
  ON production_stages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Customers can view stages for their own orders
CREATE POLICY "Customers can view their own production stages"
  ON production_stages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM production_queue
      WHERE production_queue.id = production_stages.production_queue_id
      AND production_queue.customer_id = auth.uid()
    )
  );

-- =====================================================
-- 9. GRANT PERMISSIONS
-- =====================================================

-- Grant SELECT to authenticated users (via RLS)
GRANT SELECT ON production_stages TO authenticated;

-- Grant INSERT, UPDATE, DELETE to authenticated users (via RLS)
GRANT INSERT, UPDATE, DELETE ON production_stages TO authenticated;

-- Grant all to service role
GRANT ALL ON production_stages TO service_role;

-- =====================================================
-- 10. VALIDATE MIGRATION
-- =====================================================

DO $$
BEGIN
  -- Check if table was created
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'production_stages'
  ) THEN
    RAISE EXCEPTION 'Table production_stages was not created';
  END IF;
  
  -- Check if indexes were created
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'production_stages' 
    AND indexname = 'idx_production_stages_queue'
  ) THEN
    RAISE EXCEPTION 'Index idx_production_stages_queue was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'production_stages' 
    AND indexname = 'idx_production_stages_status'
  ) THEN
    RAISE EXCEPTION 'Index idx_production_stages_status was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'production_stages' 
    AND indexname = 'idx_production_stages_queue_order'
  ) THEN
    RAISE EXCEPTION 'Index idx_production_stages_queue_order was not created';
  END IF;
  
  -- Check if triggers were created
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_update_production_stages_updated_at'
  ) THEN
    RAISE EXCEPTION 'Trigger trigger_update_production_stages_updated_at was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_calculate_stage_actual_duration'
  ) THEN
    RAISE EXCEPTION 'Trigger trigger_calculate_stage_actual_duration was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_sync_production_stage_to_queue'
  ) THEN
    RAISE EXCEPTION 'Trigger trigger_sync_production_stage_to_queue was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_initialize_production_stages'
  ) THEN
    RAISE EXCEPTION 'Trigger trigger_initialize_production_stages was not created';
  END IF;
  
  -- Check if RLS is enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'production_stages' 
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS is not enabled on production_stages table';
  END IF;
  
  RAISE NOTICE 'Migration 20260428000002_create_production_stages.sql completed successfully';
END $$;

-- =====================================================
-- 11. MIGRATION SUMMARY
-- =====================================================

SELECT 
  '20260428000002_create_production_stages.sql' AS migration_file,
  'Create production_stages table with stage tracking and auto-initialization' AS description,
  'SUCCESS' AS status,
  NOW() AS executed_at,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'production_stages') AS table_created,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'production_stages') AS indexes_created,
  (SELECT COUNT(*) FROM pg_trigger WHERE tgname LIKE '%production_stages%') AS triggers_created,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'production_stages') AS policies_created;

