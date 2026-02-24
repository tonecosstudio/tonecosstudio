-- =====================================================
-- FIX IMEDIATO: Aplicar políticas RLS permissivas
-- =====================================================
-- Execute este SQL no Dashboard do Supabase:
-- https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/editor
-- =====================================================

-- Limpar políticas antigas de chat_groups
DROP POLICY IF EXISTS "Admins can view all groups" ON chat_groups;
DROP POLICY IF EXISTS "Members can view their groups" ON chat_groups;
DROP POLICY IF EXISTS "Admins can create groups" ON chat_groups;
DROP POLICY IF EXISTS "Admins can update groups" ON chat_groups;
DROP POLICY IF EXISTS "Admins can delete groups" ON chat_groups;

-- Criar políticas permissivas para chat_groups
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

-- Limpar políticas antigas de chat_group_members
DROP POLICY IF EXISTS "Admins can view all members" ON chat_group_members;
DROP POLICY IF EXISTS "Members can view group members" ON chat_group_members;
DROP POLICY IF EXISTS "Admins can add members" ON chat_group_members;
DROP POLICY IF EXISTS "Admins can remove members" ON chat_group_members;

-- Criar políticas permissivas para chat_group_members
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

-- Limpar políticas antigas de chat_group_messages
DROP POLICY IF EXISTS "Admins can view all messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Members can view group messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Members can read group messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Admins can send messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Admins can update messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Admins can delete messages" ON chat_group_messages;

-- Criar políticas permissivas para chat_group_messages
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

CREATE POLICY "Authenticated users can delete messages"
  ON chat_group_messages FOR DELETE
  TO authenticated
  USING (true);

-- Limpar políticas antigas de chat_group_attachments
DROP POLICY IF EXISTS "Admins can view all attachments" ON chat_group_attachments;
DROP POLICY IF EXISTS "Members can view group attachments" ON chat_group_attachments;
DROP POLICY IF EXISTS "Admins can upload attachments" ON chat_group_attachments;

-- Criar políticas permissivas para chat_group_attachments
CREATE POLICY "Authenticated users can view attachments"
  ON chat_group_attachments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can upload attachments"
  ON chat_group_attachments FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Verificar se as políticas foram criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('chat_groups', 'chat_group_members', 'chat_group_messages', 'chat_group_attachments')
ORDER BY tablename, policyname;
