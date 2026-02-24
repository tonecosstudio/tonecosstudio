-- =====================================================
-- FIX FINAL PARA ERRO 406 - APLICAR NO SQL EDITOR
-- =====================================================

-- 1. REMOVER TODAS AS POLÍTICAS EXISTENTES
DROP POLICY IF EXISTS "chat_groups_select_policy" ON chat_groups;
DROP POLICY IF EXISTS "chat_groups_insert_policy" ON chat_groups;
DROP POLICY IF EXISTS "chat_groups_update_policy" ON chat_groups;
DROP POLICY IF EXISTS "chat_groups_delete_policy" ON chat_groups;
DROP POLICY IF EXISTS "chat_groups_select" ON chat_groups;
DROP POLICY IF EXISTS "chat_groups_insert" ON chat_groups;
DROP POLICY IF EXISTS "chat_groups_update" ON chat_groups;
DROP POLICY IF EXISTS "chat_groups_delete" ON chat_groups;

DROP POLICY IF EXISTS "chat_group_members_select_policy" ON chat_group_members;
DROP POLICY IF EXISTS "chat_group_members_insert_policy" ON chat_group_members;
DROP POLICY IF EXISTS "chat_group_members_update_policy" ON chat_group_members;
DROP POLICY IF EXISTS "chat_group_members_delete_policy" ON chat_group_members;
DROP POLICY IF EXISTS "chat_group_members_select" ON chat_group_members;
DROP POLICY IF EXISTS "chat_group_members_insert" ON chat_group_members;
DROP POLICY IF EXISTS "chat_group_members_update" ON chat_group_members;
DROP POLICY IF EXISTS "chat_group_members_delete" ON chat_group_members;

DROP POLICY IF EXISTS "chat_group_messages_select_policy" ON chat_group_messages;
DROP POLICY IF EXISTS "chat_group_messages_insert_policy" ON chat_group_messages;
DROP POLICY IF EXISTS "chat_group_messages_update_policy" ON chat_group_messages;
DROP POLICY IF EXISTS "chat_group_messages_delete_policy" ON chat_group_messages;
DROP POLICY IF EXISTS "chat_group_messages_select" ON chat_group_messages;
DROP POLICY IF EXISTS "chat_group_messages_insert" ON chat_group_messages;
DROP POLICY IF EXISTS "chat_group_messages_update" ON chat_group_messages;
DROP POLICY IF EXISTS "chat_group_messages_delete" ON chat_group_messages;

DROP POLICY IF EXISTS "chat_group_attachments_select_policy" ON chat_group_attachments;
DROP POLICY IF EXISTS "chat_group_attachments_insert_policy" ON chat_group_attachments;
DROP POLICY IF EXISTS "chat_group_attachments_update_policy" ON chat_group_attachments;
DROP POLICY IF EXISTS "chat_group_attachments_delete_policy" ON chat_group_attachments;
DROP POLICY IF EXISTS "chat_group_attachments_select" ON chat_group_attachments;
DROP POLICY IF EXISTS "chat_group_attachments_insert" ON chat_group_attachments;
DROP POLICY IF EXISTS "chat_group_attachments_update" ON chat_group_attachments;
DROP POLICY IF EXISTS "chat_group_attachments_delete" ON chat_group_attachments;

-- 2. REMOVER FUNÇÃO is_admin
DROP FUNCTION IF EXISTS is_admin(UUID);

-- 3. CRIAR POLÍTICAS SIMPLIFICADAS

-- CHAT_GROUPS
CREATE POLICY "chat_groups_select"
  ON chat_groups FOR SELECT
  TO authenticated
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
    OR
    (
      deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM chat_group_members m
        WHERE m.group_id = chat_groups.id
        AND m.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "chat_groups_insert"
  ON chat_groups FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "chat_groups_update"
  ON chat_groups FOR UPDATE
  TO authenticated
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "chat_groups_delete"
  ON chat_groups FOR DELETE
  TO authenticated
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

-- CHAT_GROUP_MEMBERS
CREATE POLICY "chat_group_members_select"
  ON chat_group_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "chat_group_members_insert"
  ON chat_group_members FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "chat_group_members_update"
  ON chat_group_members FOR UPDATE
  TO authenticated
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "chat_group_members_delete"
  ON chat_group_members FOR DELETE
  TO authenticated
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

-- CHAT_GROUP_MESSAGES
CREATE POLICY "chat_group_messages_select"
  ON chat_group_messages FOR SELECT
  TO authenticated
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
    OR
    EXISTS (
      SELECT 1 FROM chat_group_members m
      WHERE m.group_id = chat_group_messages.group_id
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "chat_group_messages_insert"
  ON chat_group_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "chat_group_messages_update"
  ON chat_group_messages FOR UPDATE
  TO authenticated
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "chat_group_messages_delete"
  ON chat_group_messages FOR DELETE
  TO authenticated
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

-- CHAT_GROUP_ATTACHMENTS
CREATE POLICY "chat_group_attachments_select"
  ON chat_group_attachments FOR SELECT
  TO authenticated
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
    OR
    EXISTS (
      SELECT 1 FROM chat_group_messages msg
      JOIN chat_group_members m ON m.group_id = msg.group_id
      WHERE msg.id = chat_group_attachments.message_id
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "chat_group_attachments_insert"
  ON chat_group_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "chat_group_attachments_update"
  ON chat_group_attachments FOR UPDATE
  TO authenticated
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "chat_group_attachments_delete"
  ON chat_group_attachments FOR DELETE
  TO authenticated
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

-- 4. VERIFICAÇÃO
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('chat_groups', 'chat_group_members', 'chat_group_messages', 'chat_group_attachments')
GROUP BY tablename
ORDER BY tablename;

SELECT '✅ Fix RLS aplicado! Recarregue a página do chat.' as resultado;
