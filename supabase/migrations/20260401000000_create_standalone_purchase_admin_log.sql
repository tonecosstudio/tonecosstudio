-- Migration: Create standalone_purchase_admin_log table
-- Description: Tracks all admin actions on standalone purchases for audit trail
-- Requirements: 15.3
-- Created: 2026-04-01 00:00:00 UTC

-- =====================================================
-- STANDALONE_PURCHASE_ADMIN_LOG - Admin Action Audit Trail
-- =====================================================

CREATE TABLE IF NOT EXISTS standalone_purchase_admin_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES standalone_purchases(id) ON DELETE CASCADE,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  action_type TEXT NOT NULL CHECK (action_type IN (
    'mark_production_complete',
    'cancel_order',
    'approve_deposit_voucher',
    'reject_deposit_voucher',
    'approve_balance_voucher',
    'reject_balance_voucher',
    'update_status',
    'add_tracking_code'
  )),
  previous_status TEXT,
  new_status TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_standalone_admin_log_purchase ON standalone_purchase_admin_log(purchase_id, created_at DESC);
CREATE INDEX idx_standalone_admin_log_admin ON standalone_purchase_admin_log(admin_user_id);
CREATE INDEX idx_standalone_admin_log_action ON standalone_purchase_admin_log(action_type);
CREATE INDEX idx_standalone_admin_log_created ON standalone_purchase_admin_log(created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE standalone_purchase_admin_log ENABLE ROW LEVEL SECURITY;

-- Admins can view all logs
CREATE POLICY "Admins can view admin action logs"
  ON standalone_purchase_admin_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- System can insert logs (no user context required for service operations)
CREATE POLICY "System can insert admin action logs"
  ON standalone_purchase_admin_log FOR INSERT
  WITH CHECK (true);

-- No updates or deletes allowed (audit trail must be immutable)
CREATE POLICY "No updates allowed"
  ON standalone_purchase_admin_log FOR UPDATE
  USING (false);

CREATE POLICY "No deletes allowed"
  ON standalone_purchase_admin_log FOR DELETE
  USING (false);

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE standalone_purchase_admin_log IS 'Audit trail of all admin actions on standalone purchases. Records who did what, when, and why.';

COMMENT ON COLUMN standalone_purchase_admin_log.action_type IS 'Type of admin action: mark_production_complete, cancel_order, approve_deposit_voucher, reject_deposit_voucher, approve_balance_voucher, reject_balance_voucher, update_status, add_tracking_code';
COMMENT ON COLUMN standalone_purchase_admin_log.previous_status IS 'Purchase status before the action';
COMMENT ON COLUMN standalone_purchase_admin_log.new_status IS 'Purchase status after the action';
COMMENT ON COLUMN standalone_purchase_admin_log.notes IS 'Additional notes or reason for the action (e.g., cancellation reason, rejection reason)';
COMMENT ON COLUMN standalone_purchase_admin_log.metadata IS 'Additional structured data about the action (e.g., tracking code, voucher URL)';

-- =====================================================
-- HELPER FUNCTION TO LOG ADMIN ACTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION log_standalone_admin_action(
  p_purchase_id UUID,
  p_admin_user_id UUID,
  p_action_type TEXT,
  p_previous_status TEXT DEFAULT NULL,
  p_new_status TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO standalone_purchase_admin_log (
    purchase_id,
    admin_user_id,
    action_type,
    previous_status,
    new_status,
    notes,
    metadata
  ) VALUES (
    p_purchase_id,
    p_admin_user_id,
    p_action_type,
    p_previous_status,
    p_new_status,
    p_notes,
    p_metadata
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_standalone_admin_action IS 'Helper function to log admin actions on standalone purchases. Used by Edge Functions to record audit trail.';
