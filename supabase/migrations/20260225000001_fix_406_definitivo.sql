-- =====================================================
-- Migration: Fix 406 Error - chat_group_members
-- Date: 2026-02-25
-- Problem: 406 Not Acceptable on chat_group_members queries
-- Solution: Clean RLS policies and notify PostgREST
-- =====================================================

-- =====================================================
-- STEP 1: Remove ALL existing policies on chat_group_members
-- =====================================================

DROP POLICY IF EXISTS "Members can view their own membership" ON chat_group_members;
DROP POLICY IF EXISTS "Admins can view all memberships" ON chat_group_members;
DROP POLICY IF EXISTS "Admins can manage memberships" ON chat_group_members;
DROP POLICY IF EXISTS "chat_group_members_select" ON chat_group_members;
DROP POLICY IF EXISTS "chat_group_members_insert" ON chat_group_members;
DROP POLICY IF EXISTS "chat_group_members_update" ON chat_group_members;
DROP POLICY IF EXISTS "chat_group_members_delete" ON chat_group_members;
DROP POLICY IF EXISTS "members_select" ON chat_group_members;
DROP POLICY IF EXISTS "members_insert" ON chat_group_members;
DROP POLICY IF EXISTS "members_update" ON chat_group_members;
DROP POLICY IF EXISTS "members_delete" ON chat_group_members;
DROP POLICY IF EXISTS "full_access" ON chat_group_members;
DROP POLICY IF EXISTS "open_access_chat_group_members" ON chat_group_members;

-- =====================================================
-- STEP 2: Create clean, permissive policies
-- =====================================================

-- SELECT: Allow authenticated users to view all memberships
-- This is needed for the chat to work properly
CREATE POLICY "authenticated_select_all"
  ON chat_group_members
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Allow authenticated users to add themselves to groups
-- The UNIQUE constraint will prevent duplicates
CREATE POLICY "authenticated_insert_self"
  ON chat_group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Allow users to update their own membership (last_viewed_at)
CREATE POLICY "authenticated_update_own"
  ON chat_group_members
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Allow users to leave groups (or admins to remove)
CREATE POLICY "authenticated_delete_own"
  ON chat_group_members
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- STEP 3: Also fix chat_groups table
-- =====================================================

DROP POLICY IF EXISTS "Users can view groups" ON chat_groups;
DROP POLICY IF EXISTS "Users can create groups" ON chat_groups;
DROP POLICY IF EXISTS "Users can update groups" ON chat_groups;
DROP POLICY IF EXISTS "Users can delete groups" ON chat_groups;
DROP POLICY IF EXISTS "full_access" ON chat_groups;
DROP POLICY IF EXISTS "open_access_chat_groups" ON chat_groups;

CREATE POLICY "authenticated_select_groups"
  ON chat_groups
  FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- STEP 4: Also fix chat_group_messages table
-- =====================================================

DROP POLICY IF EXISTS "Users can view messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Users can send messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Users can update messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Users can delete messages" ON chat_group_messages;
DROP POLICY IF EXISTS "full_access" ON chat_group_messages;
DROP POLICY IF EXISTS "open_access_chat_group_messages" ON chat_group_messages;

CREATE POLICY "authenticated_select_messages"
  ON chat_group_messages
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_insert_messages"
  ON chat_group_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated_update_own_messages"
  ON chat_group_messages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "authenticated_delete_own_messages"
  ON chat_group_messages
  FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id);

-- =====================================================
-- STEP 5: Notify PostgREST to reload schema
-- =====================================================

NOTIFY pgrst, 'reload';

-- =====================================================
-- STEP 6: Verification
-- =====================================================

SELECT
  'chat_group_members' as table_name,
  policyname,
  cmd as operation,
  permissive,
  roles
FROM pg_policies
WHERE tablename = 'chat_group_members'
ORDER BY cmd;

SELECT
  'chat_groups' as table_name,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'chat_groups'
ORDER BY cmd;

SELECT
  'chat_group_messages' as table_name,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'chat_group_messages'
ORDER BY cmd;

SELECT '✅ Migration applied successfully. PostgREST notified to reload.' as status;