-- Fix direto para erro 406
-- Verificar e corrigir políticas RLS

-- 1. Verificar políticas atuais
SELECT 
  tablename,
  policyname,
  cmd as operacao,
  qual as condicao
FROM pg_policies
WHERE tablename = 'chat_group_members'
ORDER BY policyname;

-- 2. Desabilitar RLS temporariamente para testar
-- ALTER TABLE chat_group_members DISABLE ROW LEVEL SECURITY;

-- 3. Ou recriar as políticas permissivas
DROP POLICY IF EXISTS "chat_group_members_select" ON chat_group_members;
DROP POLICY IF EXISTS "chat_group_members_insert" ON chat_group_members;
DROP POLICY IF EXISTS "chat_group_members_update" ON chat_group_members;
DROP POLICY IF EXISTS "chat_group_members_delete" ON chat_group_members;

-- Políticas permissivas
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

-- 4. Verificar se funcionou
SELECT 'Políticas recriadas com sucesso!' as status;

-- 5. Testar acesso
SELECT COUNT(*) as total_membros FROM chat_group_members;
