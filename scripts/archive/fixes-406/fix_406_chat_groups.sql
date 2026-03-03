-- Fix 406 Not Acceptable error on chat_group_members
-- O erro 406 geralmente indica problema com RLS ou configuração do PostgREST

-- =====================================================
-- 1. VERIFICAR ESTADO ATUAL
-- =====================================================

-- Ver se RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('chat_groups', 'chat_group_members', 'chat_group_messages', 'chat_group_attachments');

-- Ver políticas existentes
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
WHERE tablename IN ('chat_groups', 'chat_group_members', 'chat_group_messages', 'chat_group_attachments')
ORDER BY tablename, policyname;

-- =====================================================
-- 2. REMOVER TODAS AS POLÍTICAS ANTIGAS
-- =====================================================

-- chat_groups
DROP POLICY IF EXISTS "Authenticated users can view groups" ON chat_groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON chat_groups;
DROP POLICY IF EXISTS "Authenticated users can update groups" ON chat_groups;
DROP POLICY IF EXISTS "Authenticated users can delete groups" ON chat_groups;
DROP POLICY IF EXISTS "full_access" ON chat_groups;
DROP POLICY IF EXISTS "open_access_chat_groups" ON chat_groups;

-- chat_group_members
DROP POLICY IF EXISTS "Authenticated users can view members" ON chat_group_members;
DROP POLICY IF EXISTS "Authenticated users can add members" ON chat_group_members;
DROP POLICY IF EXISTS "Authenticated users can update members" ON chat_group_members;
DROP POLICY IF EXISTS "Authenticated users can remove members" ON chat_group_members;
DROP POLICY IF EXISTS "full_access" ON chat_group_members;
DROP POLICY IF EXISTS "open_access_chat_group_members" ON chat_group_members;

-- chat_group_messages
DROP POLICY IF EXISTS "Authenticated users can view messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Authenticated users can send messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Authenticated users can update messages" ON chat_group_messages;
DROP POLICY IF EXISTS "full_access" ON chat_group_messages;
DROP POLICY IF EXISTS "open_access_chat_group_messages" ON chat_group_messages;

-- chat_group_attachments
DROP POLICY IF EXISTS "Authenticated users can view attachments" ON chat_group_attachments;
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON chat_group_attachments;
DROP POLICY IF EXISTS "full_access" ON chat_group_attachments;
DROP POLICY IF EXISTS "open_access_chat_group_attachments" ON chat_group_attachments;

-- =====================================================
-- 3. CRIAR POLÍTICAS SIMPLES E PERMISSIVAS
-- =====================================================

-- chat_groups: Acesso total para authenticated
CREATE POLICY "allow_all_authenticated_chat_groups"
  ON chat_groups
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- chat_group_members: Acesso total para authenticated
CREATE POLICY "allow_all_authenticated_chat_group_members"
  ON chat_group_members
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- chat_group_messages: Acesso total para authenticated
CREATE POLICY "allow_all_authenticated_chat_group_messages"
  ON chat_group_messages
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- chat_group_attachments: Acesso total para authenticated
CREATE POLICY "allow_all_authenticated_chat_group_attachments"
  ON chat_group_attachments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 4. GARANTIR QUE RLS ESTÁ HABILITADO
-- =====================================================

ALTER TABLE chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_group_attachments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON chat_groups TO authenticated;
GRANT ALL ON chat_group_members TO authenticated;
GRANT ALL ON chat_group_messages TO authenticated;
GRANT ALL ON chat_group_attachments TO authenticated;

GRANT USAGE ON SCHEMA public TO authenticated;

-- =====================================================
-- 6. VERIFICAR RESULTADO
-- =====================================================

SELECT 
  'Políticas criadas:' as status,
  COUNT(*) as total
FROM pg_policies 
WHERE tablename IN ('chat_groups', 'chat_group_members', 'chat_group_messages', 'chat_group_attachments');

-- Listar políticas
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename IN ('chat_groups', 'chat_group_members', 'chat_group_messages', 'chat_group_attachments')
ORDER BY tablename;

SELECT 'Fix 406 aplicado com sucesso!' as resultado;
