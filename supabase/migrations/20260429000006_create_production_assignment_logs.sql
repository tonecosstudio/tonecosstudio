-- =====================================================
-- MIGRATION: Create production_assignment_logs table
-- Date: 2026-04-29
-- Description: Creates table to log all production item assignments and reassignments
-- Requirements: 4.2.2 - Track assignment history with timestamps and reasons
-- =====================================================

-- =====================================================
-- 1. CREATE PRODUCTION_ASSIGNMENT_LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS production_assignment_logs (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Production queue reference
  production_queue_id UUID NOT NULL REFERENCES production_queue(id) ON DELETE CASCADE,
  
  -- Assignment details
  assigned_to UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_to_name TEXT NOT NULL,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Reassignment tracking
  is_reassignment BOOLEAN NOT NULL DEFAULT false,
  previous_assignee UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  previous_assignee_name TEXT,
  reason TEXT,
  
  -- Timestamp
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for production queue lookups
CREATE INDEX IF NOT EXISTS idx_assignment_logs_production_queue 
  ON production_assignment_logs(production_queue_id);

-- Index for assigned user lookups
CREATE INDEX IF NOT EXISTS idx_assignment_logs_assigned_to 
  ON production_assignment_logs(assigned_to);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_assignment_logs_assigned_at 
  ON production_assignment_logs(assigned_at DESC);

-- Index for reassignment queries
CREATE INDEX IF NOT EXISTS idx_assignment_logs_reassignments 
  ON production_assignment_logs(is_reassignment) 
  WHERE is_reassignment = true;

-- =====================================================
-- 3. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE production_assignment_logs IS 
  'Logs all production item assignments and reassignments with timestamps and reasons';

COMMENT ON COLUMN production_assignment_logs.production_queue_id IS 
  'ID of the production queue item being assigned';

COMMENT ON COLUMN production_assignment_logs.assigned_to IS 
  'ID of the team member receiving the assignment';

COMMENT ON COLUMN production_assignment_logs.assigned_to_name IS 
  'Name of the team member (denormalized for performance)';

COMMENT ON COLUMN production_assignment_logs.assigned_by IS 
  'ID of the admin who made the assignment';

COMMENT ON COLUMN production_assignment_logs.is_reassignment IS 
  'True if this is a reassignment (item was previously assigned to someone else)';

COMMENT ON COLUMN production_assignment_logs.previous_assignee IS 
  'ID of the previous assignee (for reassignments)';

COMMENT ON COLUMN production_assignment_logs.previous_assignee_name IS 
  'Name of the previous assignee (for reassignments)';

COMMENT ON COLUMN production_assignment_logs.reason IS 
  'Reason for assignment or reassignment';

COMMENT ON COLUMN production_assignment_logs.assigned_at IS 
  'Timestamp when the assignment was made';

-- =====================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE production_assignment_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all assignment logs
CREATE POLICY "Admins can view all assignment logs"
  ON production_assignment_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Admins can insert assignment logs
CREATE POLICY "Admins can insert assignment logs"
  ON production_assignment_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Team members can view their own assignments
CREATE POLICY "Team members can view their own assignments"
  ON production_assignment_logs FOR SELECT
  USING (assigned_to = auth.uid());

-- =====================================================
-- 5. GRANT PERMISSIONS
-- =====================================================

-- Grant SELECT to authenticated users (via RLS)
GRANT SELECT ON production_assignment_logs TO authenticated;

-- Grant INSERT to authenticated users (via RLS)
GRANT INSERT ON production_assignment_logs TO authenticated;

-- Grant all to service role
GRANT ALL ON production_assignment_logs TO service_role;

-- =====================================================
-- 6. CREATE HELPER FUNCTION TO GET ASSIGNMENT HISTORY
-- =====================================================

CREATE OR REPLACE FUNCTION get_assignment_history(p_production_queue_id UUID)
RETURNS TABLE (
  id UUID,
  assigned_to_name TEXT,
  assigned_by_name TEXT,
  is_reassignment BOOLEAN,
  previous_assignee_name TEXT,
  reason TEXT,
  assigned_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pal.id,
    pal.assigned_to_name,
    COALESCE(p.full_name, p.email, 'Sistema') as assigned_by_name,
    pal.is_reassignment,
    pal.previous_assignee_name,
    pal.reason,
    pal.assigned_at
  FROM production_assignment_logs pal
  LEFT JOIN profiles p ON p.id = pal.assigned_by
  WHERE pal.production_queue_id = p_production_queue_id
  ORDER BY pal.assigned_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_assignment_history IS 
  'Returns the complete assignment history for a production queue item';

-- =====================================================
-- 7. VALIDATE MIGRATION
-- =====================================================

DO $$
BEGIN
  -- Check if table was created
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'production_assignment_logs'
  ) THEN
    RAISE EXCEPTION 'Table production_assignment_logs was not created';
  END IF;
  
  -- Check if indexes were created
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'production_assignment_logs' 
    AND indexname = 'idx_assignment_logs_production_queue'
  ) THEN
    RAISE EXCEPTION 'Index idx_assignment_logs_production_queue was not created';
  END IF;
  
  -- Check if RLS is enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'production_assignment_logs' 
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS is not enabled on production_assignment_logs table';
  END IF;
  
  RAISE NOTICE 'Migration 20260429000006_create_production_assignment_logs.sql completed successfully';
END $$;

-- =====================================================
-- 8. MIGRATION SUMMARY
-- =====================================================

SELECT 
  '20260429000006_create_production_assignment_logs.sql' AS migration_file,
  'Create production_assignment_logs table for tracking assignments' AS description,
  'SUCCESS' AS status,
  NOW() AS executed_at,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'production_assignment_logs') AS table_created,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'production_assignment_logs') AS indexes_created,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'production_assignment_logs') AS policies_created;
