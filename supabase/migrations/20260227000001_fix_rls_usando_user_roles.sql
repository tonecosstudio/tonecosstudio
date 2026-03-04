-- =====================================================
-- Migration: Fix RLS Usando user_roles Corretamente
-- Date: 2026-02-27
-- Problem: Migration anterior usava profiles.role que nÃƒÂ£o existe
-- Solution: Usar user_roles.role corretamente
-- =====================================================

-- =====================================================
-- STEP 1: Limpar TODAS as polÃƒÂ­ticas existentes
-- =====================================================

-- chat_groups
DROP POLICY IF EXISTS "Admins can view all groups" ON chat_groups;
DROP POLICY IF EXISTS "Members can view their groups" ON chat_groups;
DROP POLICY IF EXISTS "Admins can create groups" ON chat_groups;
DROP POLICY IF EXISTS "Admins can update groups" ON chat_groups;
DROP POLICY IF EXISTS "Admins can delete groups" ON chat_groups;
DROP POLICY IF EXISTS "authenticated_select_groups" ON chat_groups;
DROP POLICY IF EXISTS "Users can view groups" ON chat_groups;
DROP POLICY IF EXISTS "Users can create groups" ON chat_groups;
DROP POLICY IF EXISTS "Users can update groups" ON chat_groups;
DROP POLICY IF EXISTS "Users can delete groups" ON chat_groups;
DROP POLICY IF EXISTS "full_access" ON chat_groups;
DROP POLICY IF EXISTS "open_access_chat_groups" ON chat_groups;
DROP POLICY IF EXISTS "select_groups" ON chat_groups;
DROP POLICY IF EXISTS "admin_manage_groups" ON chat_groups;

-- chat_group_members
DROP POLICY IF EXISTS "Members can view their own membership" ON chat_group_members;
DROP POLICY IF EXISTS "Admins can view all memberships" ON chat_group_members;
DROP POLICY IF EXISTS "Admins can manage memberships" ON chat_group_members;
DROP POLICY IF EXISTS "authenticated_select_all" ON chat_group_members;
DROP POLICY IF EXISTS "authenticated_insert_self" ON chat_group_members;
DROP POLICY IF EXISTS "authenticated_update_own" ON chat_group_members;
DROP POLICY IF EXISTS "authenticated_delete_own" ON chat_group_members;
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
DROP POLICY IF EXISTS "select_members" ON chat_group_members;
DROP POLICY IF EXISTS "admin_manage_members" ON chat_group_members;
DROP POLICY IF EXISTS "admin_delete_members" ON chat_group_members;
DROP POLICY IF EXISTS "update_members" ON chat_group_members;
DROP POLICY IF EXISTS "admin_update_members" ON chat_group_members;
DROP POLICY IF EXISTS "user_update_own_last_viewed" ON chat_group_members;

-- chat_group_messages
DROP POLICY IF EXISTS "Members can read group messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Admins can send messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Admins can update messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Admins can delete messages" ON chat_group_messages;
DROP POLICY IF EXISTS "authenticated_select_messages" ON chat_group_messages;
DROP POLICY IF EXISTS "authenticated_insert_messages" ON chat_group_messages;
DROP POLICY IF EXISTS "authenticated_update_own_messages" ON chat_group_messages;
DROP POLICY IF EXISTS "authenticated_delete_own_messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Members and admins can read group messages" ON chat_group_messages;
DROP POLICY IF EXISTS "authenticated_users_read_group_messages" ON chat_group_messages;
DROP POLICY IF EXISTS "fix_406_simple_read_policy" ON chat_group_messages;
DROP POLICY IF EXISTS "Users can view messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Users can send messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Users can update messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Users can delete messages" ON chat_group_messages;
DROP POLICY IF EXISTS "full_access" ON chat_group_messages;
DROP POLICY IF EXISTS "open_access_chat_group_messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Enable all access" ON chat_group_messages;
DROP POLICY IF EXISTS "select_messages" ON chat_group_messages;
DROP POLICY IF EXISTS "admin_insert_messages" ON chat_group_messages;
DROP POLICY IF EXISTS "admin_update_own_messages" ON chat_group_messages;
DROP POLICY IF EXISTS "admin_delete_own_messages" ON chat_group_messages;

-- chat_group_attachments
DROP POLICY IF EXISTS "Members can view attachments" ON chat_group_attachments;
DROP POLICY IF EXISTS "Admins can upload attachments" ON chat_group_attachments;
DROP POLICY IF EXISTS "Admins can delete attachments" ON chat_group_attachments;
DROP POLICY IF EXISTS "select_attachments" ON chat_group_attachments;
DROP POLICY IF EXISTS "admin_insert_attachments" ON chat_group_attachments;
DROP POLICY IF EXISTS "admin_delete_own_attachments" ON chat_group_attachments;

-- =====================================================
-- STEP 2: Garantir que RLS estÃƒÂ¡ habilitado
-- =====================================================

ALTER TABLE chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_group_attachments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 3: Criar polÃƒÂ­ticas CORRETAS para chat_groups
-- =====================================================

-- SELECT: Admins veem tudo, membros veem seus grupos nÃƒÂ£o deletados
CREATE POLICY "select_groups"
  ON chat_groups FOR SELECT
  TO authenticated
  USING (
    -- Admin vÃƒÂª tudo (incluindo deletados)
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::app_role
    )
    OR
    -- Membro vÃƒÂª apenas seus grupos nÃƒÂ£o deletados
    (
      deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM chat_group_members
        WHERE group_id = chat_groups.id
        AND user_id = auth.uid()
      )
    )
  );

-- INSERT/UPDATE/DELETE: Apenas admins
CREATE POLICY "admin_manage_groups"
  ON chat_groups FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::app_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::app_role
    )
  );

-- =====================================================
-- STEP 4: Criar polÃƒÂ­ticas CORRETAS para chat_group_members
-- =====================================================

-- SELECT: Admins veem tudo, usuÃƒÂ¡rios veem apenas seus memberships
CREATE POLICY "select_members"
  ON chat_group_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::app_role
    )
    OR user_id = auth.uid()
  );

-- INSERT/DELETE: Apenas admins
CREATE POLICY "admin_manage_members"
  ON chat_group_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::app_role
    )
  );

CREATE POLICY "admin_delete_members"
  ON chat_group_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::app_role
    )
  );

-- UPDATE: Admins podem tudo, usuÃƒÂ¡rios podem atualizar apenas last_viewed_at
CREATE POLICY "admin_update_members"
  ON chat_group_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::app_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::app_role
    )
  );

CREATE POLICY "user_update_own_last_viewed"
  ON chat_group_members FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- STEP 5: Criar polÃƒÂ­ticas CORRETAS para chat_group_messages
-- =====================================================

-- SELECT: Apenas membros do grupo podem ver mensagens
CREATE POLICY "select_messages"
  ON chat_group_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_group_members
      WHERE group_id = chat_group_messages.group_id
      AND user_id = auth.uid()
    )
  );

-- INSERT: Apenas admins podem enviar mensagens
CREATE POLICY "admin_insert_messages"
  ON chat_group_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::app_role
    )
  );

-- UPDATE: Apenas admins podem atualizar suas prÃƒÂ³prias mensagens
CREATE POLICY "admin_update_own_messages"
  ON chat_group_messages FOR UPDATE
  TO authenticated
  USING (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::app_role
    )
  )
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::app_role
    )
  );

-- DELETE: Apenas admins podem deletar suas prÃƒÂ³prias mensagens
CREATE POLICY "admin_delete_own_messages"
  ON chat_group_messages FOR DELETE
  TO authenticated
  USING (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::app_role
    )
  );

-- =====================================================
-- STEP 6: Criar polÃƒÂ­ticas CORRETAS para chat_group_attachments
-- =====================================================

-- SELECT: Apenas membros do grupo podem ver anexos
CREATE POLICY "select_attachments"
  ON chat_group_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM chat_group_messages cgm
      INNER JOIN chat_group_members cgmem ON cgmem.group_id = cgm.group_id
      WHERE cgm.id = chat_group_attachments.message_id
      AND cgmem.user_id = auth.uid()
    )
  );

-- INSERT: Apenas admins podem fazer upload
CREATE POLICY "admin_insert_attachments"
  ON chat_group_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::app_role
    )
  );

-- DELETE: Apenas admins podem deletar seus prÃƒÂ³prios anexos
CREATE POLICY "admin_delete_own_attachments"
  ON chat_group_attachments FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::app_role
    )
  );

-- =====================================================
-- STEP 7: Criar ÃƒÂ­ndices para otimizar polÃƒÂ­ticas RLS
-- =====================================================

-- Otimizar verificaÃƒÂ§ÃƒÂ£o de admin
CREATE INDEX IF NOT EXISTS idx_user_roles_user_admin 
ON user_roles(user_id) WHERE role = 'admin'::app_role;

CREATE INDEX IF NOT EXISTS idx_user_roles_user_role 
ON user_roles(user_id, role);

-- Otimizar verificaÃƒÂ§ÃƒÂ£o de membership (jÃƒÂ¡ existe, mas garantir)
CREATE INDEX IF NOT EXISTS idx_chat_group_members_user_group 
ON chat_group_members(user_id, group_id);

CREATE INDEX IF NOT EXISTS idx_chat_group_members_group_user 
ON chat_group_members(group_id, user_id);

-- Otimizar listagem de mensagens (jÃƒÂ¡ existe, mas garantir)
CREATE INDEX IF NOT EXISTS idx_chat_group_messages_group_created 
ON chat_group_messages(group_id, created_at DESC);

-- Otimizar verificaÃƒÂ§ÃƒÂ£o de sender
CREATE INDEX IF NOT EXISTS idx_chat_group_messages_sender 
ON chat_group_messages(sender_id);

-- Otimizar verificaÃƒÂ§ÃƒÂ£o de anexos
CREATE INDEX IF NOT EXISTS idx_chat_group_attachments_message 
ON chat_group_attachments(message_id);

-- =====================================================
-- STEP 8: Notificar PostgREST
-- =====================================================

NOTIFY pgrst, 'reload schema';

-- =====================================================
-- STEP 9: VerificaÃƒÂ§ÃƒÂ£o
-- =====================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  -- Contar polÃƒÂ­ticas em chat_groups
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'chat_groups';
  
  RAISE NOTICE 'chat_groups: % polÃƒÂ­ticas', policy_count;
  
  -- Contar polÃƒÂ­ticas em chat_group_members
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'chat_group_members';
  
  RAISE NOTICE 'chat_group_members: % polÃƒÂ­ticas', policy_count;
  
  -- Contar polÃƒÂ­ticas em chat_group_messages
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'chat_group_messages';
  
  RAISE NOTICE 'chat_group_messages: % polÃƒÂ­ticas', policy_count;
  
  -- Contar polÃƒÂ­ticas em chat_group_attachments
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'chat_group_attachments';
  
  RAISE NOTICE 'chat_group_attachments: % polÃƒÂ­ticas', policy_count;
  
  RAISE NOTICE 'Ã¢Å“â€¦ Migration aplicada com sucesso!';
END $$;
