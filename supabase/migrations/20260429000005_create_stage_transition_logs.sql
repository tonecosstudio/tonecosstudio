-- =====================================================
-- MIGRATION: Create stage_transition_logs table
-- Date: 2026-04-29
-- Description: Creates table for logging all production stage transitions
-- Requirements: Task 4.1.3 - Stage validation and logging
-- =====================================================

-- =====================================================
-- 1. CREATE STAGE_TRANSITION_LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS stage_transition_logs (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Production queue reference
  production_queue_id UUID NOT NULL REFERENCES production_queue(id) ON DELETE CASCADE,
  
  -- Transition details
  from_stage TEXT CHECK (from_stage IN (
    'awaiting_choice',
    'design',
    'production',
    'quality_check',
    'packaging',
    'shipped'
  )),
  to_stage TEXT NOT NULL CHECK (to_stage IN (
    'awaiting_choice',
    'design',
    'production',
    'quality_check',
    'packaging',
    'shipped'
  )),
  
  -- User information
  user_id UUID NOT NULL REFERENCES auth.users(id),
  user_name TEXT NOT NULL,
  
  -- Override information
  is_override BOOLEAN NOT NULL DEFAULT false,
  justification TEXT,
  
  -- Timestamp
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_override_justification CHECK (
    NOT is_override OR 
    (justification IS NOT NULL AND justification != '')
  )
);

-- =====================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for production queue lookups
CREATE INDEX IF NOT EXISTS idx_stage_transition_logs_queue ON stage_transition_logs(production_queue_id);

-- Index for timestamp queries (most recent first)
CREATE INDEX IF NOT EXISTS idx_stage_transition_logs_timestamp ON stage_transition_logs(timestamp DESC);

-- Index for user activity queries
CREATE INDEX IF NOT EXISTS idx_stage_transition_logs_user ON stage_transition_logs(user_id);

-- Index for override queries
CREATE INDEX IF NOT EXISTS idx_stage_transition_logs_override ON stage_transition_logs(is_override) 
  WHERE is_override = true;

-- Composite index for queue and timestamp
CREATE INDEX IF NOT EXISTS idx_stage_transition_logs_queue_timestamp ON stage_transition_logs(production_queue_id, timestamp DESC);

-- =====================================================
-- 3. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE stage_transition_logs IS 'Logs all production stage transitions including admin overrides';

COMMENT ON COLUMN stage_transition_logs.production_queue_id IS 'ID of the production queue item';
COMMENT ON COLUMN stage_transition_logs.from_stage IS 'Previous stage (null if starting production)';
COMMENT ON COLUMN stage_transition_logs.to_stage IS 'New stage after transition';
COMMENT ON COLUMN stage_transition_logs.user_id IS 'ID of user who performed the transition';
COMMENT ON COLUMN stage_transition_logs.user_name IS 'Name of user (denormalized for performance)';
COMMENT ON COLUMN stage_transition_logs.is_override IS 'Whether this was an admin override of validation rules';
COMMENT ON COLUMN stage_transition_logs.justification IS 'Justification for admin override (required if is_override = true)';
COMMENT ON COLUMN stage_transition_logs.timestamp IS 'When the transition occurred';

-- =====================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE stage_transition_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all transition logs
CREATE POLICY "Admins can view all transition logs"
  ON stage_transition_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Admins can insert transition logs
CREATE POLICY "Admins can insert transition logs"
  ON stage_transition_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Service role can do everything (for automated logging)
CREATE POLICY "Service role full access"
  ON stage_transition_logs FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- 5. GRANT PERMISSIONS
-- =====================================================

-- Grant SELECT to authenticated users (via RLS)
GRANT SELECT ON stage_transition_logs TO authenticated;

-- Grant INSERT to authenticated users (via RLS)
GRANT INSERT ON stage_transition_logs TO authenticated;

-- Grant all to service role
GRANT ALL ON stage_transition_logs TO service_role;

-- =====================================================
-- 6. VALIDATE MIGRATION
-- =====================================================

DO $$
BEGIN
  -- Check if table was created
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'stage_transition_logs'
  ) THEN
    RAISE EXCEPTION 'Table stage_transition_logs was not created';
  END IF;
  
  -- Check if indexes were created
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'stage_transition_logs' 
    AND indexname = 'idx_stage_transition_logs_queue'
  ) THEN
    RAISE EXCEPTION 'Index idx_stage_transition_logs_queue was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'stage_transition_logs' 
    AND indexname = 'idx_stage_transition_logs_timestamp'
  ) THEN
    RAISE EXCEPTION 'Index idx_stage_transition_logs_timestamp was not created';
  END IF;
  
  -- Check if RLS is enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'stage_transition_logs' 
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS is not enabled on stage_transition_logs table';
  END IF;
  
  RAISE NOTICE 'Migration 20260429000005_create_stage_transition_logs.sql completed successfully';
END $$;

-- =====================================================
-- 7. MIGRATION SUMMARY
-- =====================================================

SELECT 
  '20260429000005_create_stage_transition_logs.sql' AS migration_file,
  'Create stage_transition_logs table for audit trail' AS description,
  'SUCCESS' AS status,
  NOW() AS executed_at,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stage_transition_logs') AS table_created,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'stage_transition_logs') AS indexes_created,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'stage_transition_logs') AS policies_created;
