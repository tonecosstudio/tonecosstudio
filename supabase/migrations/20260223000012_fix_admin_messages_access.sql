-- Fix: Allow admins to read all messages for metrics calculation
-- This is needed because admins need to calculate metrics even if they're not members

-- Drop existing policy
DROP POLICY IF EXISTS "Members can read group messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Members and admins can read group messages" ON chat_group_messages;

-- Recreate with admin access (using has_role function)
CREATE POLICY "Members and admins can read group messages"
  ON chat_group_messages FOR SELECT
  USING (
    -- Admins can read all messages
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
    OR
    -- Members can read messages from groups they belong to
    EXISTS (
      SELECT 1 FROM chat_group_members
      WHERE group_id = chat_group_messages.group_id
      AND user_id = auth.uid()
    )
  );
