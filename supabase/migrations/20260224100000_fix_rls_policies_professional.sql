-- Migration: Fix RLS Policies for Chat Groups System
-- Feature: chat-groups-system
-- Issue: 406 Not Acceptable error caused by ambiguous/conflicting RLS policies
-- Solution: Clean slate with proper, non-conflicting policies

-- =====================================================
-- 1. REMOVE ALL EXISTING POLICIES
-- =====================================================

-- chat_groups
DROP POLICY IF EXISTS "Admins can view all groups" ON chat_groups;
DROP POLICY IF EXISTS "Members can view their groups" ON chat_groups;
DROP POLICY IF EXISTS "Admins can create groups" ON chat_groups;
DROP POLICY IF EXISTS "Admins can update groups" ON chat_groups;
DROP POLICY IF EXISTS "Admins can delete groups" ON chat_groups;
DROP POLICY IF EXISTS "Authenticated users can view groups" ON chat_groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON chat_groups;
DROP POLICY IF EXISTS "Authenticated users can update groups" ON chat_groups;
DROP POLICY IF EXISTS "Authenticated users can delete groups" ON chat_groups;
DROP POLICY IF EXISTS "full_access" ON chat_groups;
DROP POLICY IF EXISTS "open_access_chat_groups" ON chat_groups;
DROP POLICY IF EXISTS "allow_all_authenticated_chat_groups" ON chat_groups;

-- chat_group_members
DROP POLICY IF EXISTS "Members can view their own membership" ON chat_group_members;
DROP POLICY IF EXISTS "Admins can view all memberships" ON chat_group_members;
DROP POLICY IF EXISTS "Admins can manage memberships" ON chat_group_members;
DROP POLICY IF EXISTS "Authenticated users can view members" ON chat_group_members;
DROP POLICY IF EXISTS "Authenticated users can add members" ON chat_group_members;
DROP POLICY IF EXISTS "Authenticated users can update members" ON chat_group_members;
DROP POLICY IF EXISTS "Authenticated users can remove members" ON chat_group_members;
DROP POLICY IF EXISTS "full_access" ON chat_group_members;
DROP POLICY IF EXISTS "open_access_chat_group_members" ON chat_group_members;
DROP POLICY IF EXISTS "allow_all_authenticated_chat_group_members" ON chat_group_members;

-- chat_group_messages
DROP POLICY IF EXISTS "Members can read group messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Admins can send messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Admins can update messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Admins can delete messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Authenticated users can view messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Authenticated users can send messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Authenticated users can update messages" ON chat_group_messages;
DROP POLICY IF EXISTS "full_access" ON chat_group_messages;
DROP POLICY IF EXISTS "open_access_chat_group_messages" ON chat_group_messages;
DROP POLICY IF EXISTS "allow_all_authenticated_chat_group_messages" ON chat_group_messages;

-- chat_group_attachments
DROP POLICY IF EXISTS "Admins can view all attachments" ON chat_group_attachments;
DROP POLICY IF EXISTS "Members can view group attachments" ON chat_group_attachments;
DROP POLICY IF EXISTS "Admins can upload attachments" ON chat_group_attachments;
DROP POLICY IF EXISTS "Authenticated users can view attachments" ON chat_group_attachments;
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON chat_group_attachments;
DROP POLICY IF EXISTS "full_access" ON chat_group_attachments;
DROP POLICY IF EXISTS "open_access_chat_group_attachments" ON chat_group_attachments;
DROP POLICY IF EXISTS "allow_all_authenticated_chat_group_attachments" ON chat_group_attachments;

-- =====================================================
-- 2. ENSURE RLS IS ENABLED
-- =====================================================

ALTER TABLE chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_group_attachments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. CREATE PROPER RLS POLICIES
-- =====================================================

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = user_id
    AND raw_user_meta_data->>'role' = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- CHAT_GROUPS POLICIES
-- =====================================================

-- SELECT: Admins see all, users see non-deleted groups they're members of
CREATE POLICY "chat_groups_select_policy"
  ON chat_groups FOR SELECT
  TO authenticated
  USING (
    is_admin(auth.uid())
    OR (
      deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM chat_group_members
        WHERE group_id = chat_groups.id
        AND user_id = auth.uid()
      )
    )
  );

-- INSERT: Only admins can create groups
CREATE POLICY "chat_groups_insert_policy"
  ON chat_groups FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

-- UPDATE: Only admins can update groups
CREATE POLICY "chat_groups_update_policy"
  ON chat_groups FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- DELETE: Only admins can delete groups
CREATE POLICY "chat_groups_delete_policy"
  ON chat_groups FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

-- =====================================================
-- CHAT_GROUP_MEMBERS POLICIES
-- =====================================================

-- SELECT: Users see their own memberships, admins see all
CREATE POLICY "chat_group_members_select_policy"
  ON chat_group_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_admin(auth.uid())
  );

-- INSERT: Only admins can add members
CREATE POLICY "chat_group_members_insert_policy"
  ON chat_group_members FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

-- UPDATE: Only admins can update memberships
CREATE POLICY "chat_group_members_update_policy"
  ON chat_group_members FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- DELETE: Only admins can remove members
CREATE POLICY "chat_group_members_delete_policy"
  ON chat_group_members FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

-- =====================================================
-- CHAT_GROUP_MESSAGES POLICIES
-- =====================================================

-- SELECT: Users see messages from groups they're members of, admins see all
CREATE POLICY "chat_group_messages_select_policy"
  ON chat_group_messages FOR SELECT
  TO authenticated
  USING (
    is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM chat_group_members
      WHERE group_id = chat_group_messages.group_id
      AND user_id = auth.uid()
    )
  );

-- INSERT: Only admins can send messages
CREATE POLICY "chat_group_messages_insert_policy"
  ON chat_group_messages FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

-- UPDATE: Only admins can update messages
CREATE POLICY "chat_group_messages_update_policy"
  ON chat_group_messages FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- DELETE: Only admins can delete messages
CREATE POLICY "chat_group_messages_delete_policy"
  ON chat_group_messages FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

-- =====================================================
-- CHAT_GROUP_ATTACHMENTS POLICIES
-- =====================================================

-- SELECT: Users see attachments from groups they're members of, admins see all
CREATE POLICY "chat_group_attachments_select_policy"
  ON chat_group_attachments FOR SELECT
  TO authenticated
  USING (
    is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM chat_group_messages m
      JOIN chat_group_members mem ON mem.group_id = m.group_id
      WHERE m.id = chat_group_attachments.message_id
      AND mem.user_id = auth.uid()
    )
  );

-- INSERT: Only admins can upload attachments
CREATE POLICY "chat_group_attachments_insert_policy"
  ON chat_group_attachments FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

-- UPDATE: Only admins can update attachments
CREATE POLICY "chat_group_attachments_update_policy"
  ON chat_group_attachments FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- DELETE: Only admins can delete attachments
CREATE POLICY "chat_group_attachments_delete_policy"
  ON chat_group_attachments FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

-- =====================================================
-- 4. GRANT NECESSARY PERMISSIONS
-- =====================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_group_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_group_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_group_attachments TO authenticated;

-- =====================================================
-- 5. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON POLICY "chat_groups_select_policy" ON chat_groups IS 
  'Admins can view all groups. Regular users can only view non-deleted groups they are members of.';

COMMENT ON POLICY "chat_group_members_select_policy" ON chat_group_members IS 
  'Users can view their own memberships. Admins can view all memberships.';

COMMENT ON POLICY "chat_group_messages_select_policy" ON chat_group_messages IS 
  'Users can view messages from groups they are members of. Admins can view all messages.';

COMMENT ON FUNCTION is_admin(UUID) IS 
  'Helper function to check if a user has admin role. Used by RLS policies.';

-- =====================================================
-- 6. VERIFICATION
-- =====================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename IN ('chat_groups', 'chat_group_members', 'chat_group_messages', 'chat_group_attachments');
  
  RAISE NOTICE 'Ã¢Å“â€¦ RLS policies recreated successfully';
  RAISE NOTICE 'Total policies created: %', policy_count;
  RAISE NOTICE 'Expected: 16 policies (4 per table)';
  
  IF policy_count != 16 THEN
    RAISE WARNING 'Policy count mismatch! Expected 16, got %', policy_count;
  END IF;
END $$;

-- List all policies for verification
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as operation,
  roles
FROM pg_policies
WHERE tablename IN ('chat_groups', 'chat_group_members', 'chat_group_messages', 'chat_group_attachments')
ORDER BY tablename, cmd;
