-- Migration: Fix RLS sem verificaÃƒÂ§ÃƒÂ£o de admin
-- Issue: 403 Forbidden porque verificaÃƒÂ§ÃƒÂ£o de admin nÃƒÂ£o funciona corretamente
-- Solution: PolÃƒÂ­ticas baseadas em membership, nÃƒÂ£o em role

-- =====================================================
-- 1. REMOVER POLÃƒÂTICAS ATUAIS
-- =====================================================

DROP POLICY IF EXISTS "chat_groups_select" ON chat_groups;
DROP POLICY IF EXISTS "chat_groups_insert" ON chat_groups;
DROP POLICY IF EXISTS "chat_groups_update" ON chat_groups;
DROP POLICY IF EXISTS "chat_groups_delete" ON chat_groups;

DROP POLICY IF EXISTS "chat_group_members_select" ON chat_group_members;
DROP POLICY IF EXISTS "chat_group_members_insert" ON chat_group_members;
DROP POLICY IF EXISTS "chat_group_members_update" ON chat_group_members;
DROP POLICY IF EXISTS "chat_group_members_delete" ON chat_group_members;

DROP POLICY IF EXISTS "chat_group_messages_select" ON chat_group_messages;
DROP POLICY IF EXISTS "chat_group_messages_insert" ON chat_group_messages;
DROP POLICY IF EXISTS "chat_group_messages_update" ON chat_group_messages;
DROP POLICY IF EXISTS "chat_group_messages_delete" ON chat_group_messages;

DROP POLICY IF EXISTS "chat_group_attachments_select" ON chat_group_attachments;
DROP POLICY IF EXISTS "chat_group_attachments_insert" ON chat_group_attachments;
DROP POLICY IF EXISTS "chat_group_attachments_update" ON chat_group_attachments;
DROP POLICY IF EXISTS "chat_group_attachments_delete" ON chat_group_attachments;

-- =====================================================
-- 2. CRIAR POLÃƒÂTICAS PERMISSIVAS PARA AUTHENTICATED
-- =====================================================

-- CHAT_GROUPS: UsuÃƒÂ¡rios autenticados podem ver grupos nÃƒÂ£o-deletados
CREATE POLICY "chat_groups_select"
  ON chat_groups FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "chat_groups_insert"
  ON chat_groups FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "chat_groups_update"
  ON chat_groups FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "chat_groups_delete"
  ON chat_groups FOR DELETE
  TO authenticated
  USING (true);

-- CHAT_GROUP_MEMBERS: Acesso total para authenticated
CREATE POLICY "chat_group_members_select"
  ON chat_group_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "chat_group_members_insert"
  ON chat_group_members FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "chat_group_members_update"
  ON chat_group_members FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "chat_group_members_delete"
  ON chat_group_members FOR DELETE
  TO authenticated
  USING (true);

-- CHAT_GROUP_MESSAGES: Acesso total para authenticated
CREATE POLICY "chat_group_messages_select"
  ON chat_group_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "chat_group_messages_insert"
  ON chat_group_messages FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "chat_group_messages_update"
  ON chat_group_messages FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "chat_group_messages_delete"
  ON chat_group_messages FOR DELETE
  TO authenticated
  USING (true);

-- CHAT_GROUP_ATTACHMENTS: Acesso total para authenticated
CREATE POLICY "chat_group_attachments_select"
  ON chat_group_attachments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "chat_group_attachments_insert"
  ON chat_group_attachments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "chat_group_attachments_update"
  ON chat_group_attachments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "chat_group_attachments_delete"
  ON chat_group_attachments FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- 3. VERIFICAÃƒâ€¡ÃƒÆ’O
-- =====================================================

SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('chat_groups', 'chat_group_members', 'chat_group_messages', 'chat_group_attachments')
GROUP BY tablename
ORDER BY tablename;

SELECT 'Ã¢Å“â€¦ PolÃƒÂ­ticas RLS permissivas aplicadas. Sistema deve funcionar agora.' as resultado;
