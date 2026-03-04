-- Migration: Fix collection_choice_history foreign key constraints
-- Description: Drop and reCREATE TABLE IF NOT EXISTS with named constraints for Supabase relationship queries
-- Created: 2026-02-28

-- Drop existing table (this will cascade delete all history records)
DROP TABLE IF EXISTS collection_choice_history CASCADE;

-- ReCREATE TABLE IF NOT EXISTS with named foreign key constraints
CREATE TABLE IF NOT EXISTS collection_choice_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES subscription_deliveries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  previous_collection_id UUID,
  new_collection_id UUID NOT NULL,
  change_reason TEXT NOT NULL CHECK (change_reason IN (
    'manual', 'automatic_maintenance', 'admin_override'
  )),
  changed_by_admin BOOLEAN DEFAULT false,
  admin_user_id UUID,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Named foreign key constraints for proper Supabase relationship queries
  CONSTRAINT collection_choice_history_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id),
  CONSTRAINT collection_choice_history_previous_collection_id_fkey 
    FOREIGN KEY (previous_collection_id) REFERENCES collections(id),
  CONSTRAINT collection_choice_history_new_collection_id_fkey 
    FOREIGN KEY (new_collection_id) REFERENCES collections(id),
  CONSTRAINT collection_choice_history_admin_user_id_fkey 
    FOREIGN KEY (admin_user_id) REFERENCES profiles(id)
);

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_choice_history_delivery ON collection_choice_history(delivery_id);
CREATE INDEX IF NOT EXISTS idx_choice_history_user ON collection_choice_history(user_id);
CREATE INDEX IF NOT EXISTS idx_choice_history_created ON collection_choice_history(created_at DESC);

-- Enable Row Level Security
ALTER TABLE collection_choice_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own collection choice history
CREATE POLICY "Users view own history"
  ON collection_choice_history FOR SELECT
  USING (user_id = auth.uid());

-- RLS Policy: Users can insert their own history records (for manual changes)
CREATE POLICY "Users insert own history"
  ON collection_choice_history FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- RLS Policy: Admins can view all history records
CREATE POLICY "Admins view all history"
  ON collection_choice_history FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
  );

-- RLS Policy: Admins can insert history records
CREATE POLICY "Admins insert all history"
  ON collection_choice_history FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
  );

-- RLS Policy: No updates or deletes allowed (audit trail must be immutable)
CREATE POLICY "No updates allowed"
  ON collection_choice_history FOR UPDATE
  USING (false);

CREATE POLICY "No deletes allowed"
  ON collection_choice_history FOR DELETE
  USING (false);

-- Recreate the function
CREATE OR REPLACE FUNCTION record_collection_change(
  p_delivery_id UUID,
  p_user_id UUID,
  p_previous_collection_id UUID,
  p_new_collection_id UUID,
  p_change_reason TEXT,
  p_changed_by_admin BOOLEAN DEFAULT false,
  p_admin_user_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_history_id UUID;
BEGIN
  IF p_change_reason NOT IN ('manual', 'automatic_maintenance', 'admin_override') THEN
    RAISE EXCEPTION 'Invalid change_reason: %', p_change_reason;
  END IF;
  
  INSERT INTO collection_choice_history (
    delivery_id,
    user_id,
    previous_collection_id,
    new_collection_id,
    change_reason,
    changed_by_admin,
    admin_user_id,
    ip_address,
    user_agent
  ) VALUES (
    p_delivery_id,
    p_user_id,
    p_previous_collection_id,
    p_new_collection_id,
    p_change_reason,
    p_changed_by_admin,
    p_admin_user_id,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO v_history_id;
  
  RETURN v_history_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
