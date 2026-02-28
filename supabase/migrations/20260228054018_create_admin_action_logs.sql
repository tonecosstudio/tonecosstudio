-- Migration: Create admin_action_logs table
-- 
-- Creates a table to log all administrative actions on deliveries
-- for audit trail and security compliance.
-- 
-- Requirements: 33.6 (Log all administrative actions with timestamp and admin user)
-- Task: 21.4

CREATE TABLE IF NOT EXISTS admin_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES subscription_deliveries(id) ON DELETE CASCADE,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'status_update',
    'tracking_update',
    'collection_change',
    'reschedule',
    'other'
  )),
  previous_status TEXT,
  new_status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_admin_action_logs_delivery ON admin_action_logs(delivery_id);
CREATE INDEX idx_admin_action_logs_admin ON admin_action_logs(admin_user_id);
CREATE INDEX idx_admin_action_logs_created ON admin_action_logs(created_at DESC);
CREATE INDEX idx_admin_action_logs_action_type ON admin_action_logs(action_type);

-- Enable RLS
ALTER TABLE admin_action_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all logs
CREATE POLICY "Admins can view all action logs"
  ON admin_action_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: System can insert logs (via service role)
CREATE POLICY "Service role can insert action logs"
  ON admin_action_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE admin_action_logs IS 'Audit trail of all administrative actions on deliveries';
COMMENT ON COLUMN admin_action_logs.action_type IS 'Type of action performed: status_update, tracking_update, collection_change, reschedule, other';
COMMENT ON COLUMN admin_action_logs.previous_status IS 'Previous status before the action (for status updates)';
COMMENT ON COLUMN admin_action_logs.new_status IS 'New status after the action (for status updates)';
COMMENT ON COLUMN admin_action_logs.notes IS 'Optional notes or reason for the action';
