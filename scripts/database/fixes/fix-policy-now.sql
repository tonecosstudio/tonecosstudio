-- =====================================================
-- FIX: Chat Group Messages RLS Policies
-- =====================================================
-- This fixes the 406 (Not Acceptable) error when querying chat_group_messages
-- Issue: RLS policies were too restrictive or not properly configured
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Members can read group messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Admins can send messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Admins can update messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Admins can delete messages" ON chat_group_messages;

-- =====================================================
-- SELECT Policies (READ)
-- =====================================================

-- Policy 1: Admins can read all messages
CREATE POLICY "Admins can read all group messages"
  ON chat_group_messages FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Policy 2: Members can read messages from their groups
CREATE POLICY "Members can read their group messages"
  ON chat_group_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_group_members
      WHERE chat_group_members.group_id = chat_group_messages.group_id
      AND chat_group_members.user_id = auth.uid()
    )
  );

-- =====================================================
-- INSERT Policies (CREATE)
-- =====================================================

-- Only admins can send messages to groups
CREATE POLICY "Admins can send group messages"
  ON chat_group_messages FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    AND sender_id = auth.uid()
  );

-- =====================================================
-- UPDATE Policies (EDIT)
-- =====================================================

-- Admins can update their own messages
CREATE POLICY "Admins can update their messages"
  ON chat_group_messages FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND sender_id = auth.uid()
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    AND sender_id = auth.uid()
  );

-- =====================================================
-- DELETE Policies (REMOVE)
-- =====================================================

-- Admins can delete their own messages
CREATE POLICY "Admins can delete their messages"
  ON chat_group_messages FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND sender_id = auth.uid()
  );

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check if policies are applied correctly
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'chat_group_messages'
ORDER BY policyname;

-- Test query to verify access (run as authenticated user)
-- SELECT created_at 
-- FROM chat_group_messages 
-- WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
-- ORDER BY created_at DESC 
-- LIMIT 1;
