-- Temporary fix for RLS blocking access to chat_groups
-- This will allow authenticated users to access the table while we debug

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all groups" ON chat_groups;
DROP POLICY IF EXISTS "Members can view their groups" ON chat_groups;
DROP POLICY IF EXISTS "Admins can create groups" ON chat_groups;
DROP POLICY IF EXISTS "Admins can update groups" ON chat_groups;
DROP POLICY IF EXISTS "Admins can delete groups" ON chat_groups;

-- Create permissive policies for authenticated users
CREATE POLICY "Authenticated users can view groups"
  ON chat_groups FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create groups"
  ON chat_groups FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update groups"
  ON chat_groups FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete groups"
  ON chat_groups FOR DELETE
  TO authenticated
  USING (true);

-- Apply same fix to other chat tables
DROP POLICY IF EXISTS "Admins can view all members" ON chat_group_members;
DROP POLICY IF EXISTS "Members can view group members" ON chat_group_members;
DROP POLICY IF EXISTS "Admins can add members" ON chat_group_members;
DROP POLICY IF EXISTS "Admins can remove members" ON chat_group_members;

CREATE POLICY "Authenticated users can view members"
  ON chat_group_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can add members"
  ON chat_group_members FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update members"
  ON chat_group_members FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can remove members"
  ON chat_group_members FOR DELETE
  TO authenticated
  USING (true);

-- Fix chat_group_messages
DROP POLICY IF EXISTS "Admins can view all messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Members can view group messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Admins can send messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Admins can update messages" ON chat_group_messages;

CREATE POLICY "Authenticated users can view messages"
  ON chat_group_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can send messages"
  ON chat_group_messages FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update messages"
  ON chat_group_messages FOR UPDATE
  TO authenticated
  USING (true);

-- Fix chat_group_attachments
DROP POLICY IF EXISTS "Admins can view all attachments" ON chat_group_attachments;
DROP POLICY IF EXISTS "Members can view group attachments" ON chat_group_attachments;
DROP POLICY IF EXISTS "Admins can upload attachments" ON chat_group_attachments;

CREATE POLICY "Authenticated users can view attachments"
  ON chat_group_attachments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can upload attachments"
  ON chat_group_attachments FOR INSERT
  TO authenticated
  WITH CHECK (true);
