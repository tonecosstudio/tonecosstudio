-- =====================================================
-- CORRIGIR POLÍTICAS PARA POSTGREST (anon/authenticated)
-- =====================================================
-- Problema: Políticas estão configuradas para 'postgres' 
-- mas PostgREST usa 'anon' ou 'authenticated'
-- =====================================================

-- 1. Remover políticas antigas
DROP POLICY IF EXISTS "Enable all access" ON chat_group_messages;
DROP POLICY IF EXISTS "all_auth_users_read" ON chat_group_messages;

-- 2. Criar política para ANON (acesso público/leitura)
CREATE POLICY "anon_can_read" ON chat_group_messages
  FOR SELECT
  TO anon
  USING (true);

-- 3. Criar política para AUTHENTICATED (usuários logados)
CREATE POLICY "authenticated_can_read" ON chat_group_messages
  FOR SELECT
  TO authenticated
  USING (true);

-- 4. Criar política para INSERT por admins
CREATE POLICY "admins_can_insert" ON chat_group_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- 5. Criar política para UPDATE por admins
CREATE POLICY "admins_can_update" ON chat_group_messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- 6. Criar política para DELETE por admins
CREATE POLICY "admins_can_delete" ON chat_group_messages
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- 7. Verificar políticas criadas
SELECT 
  '✅ POLÍTICAS CRIADAS' as status,
  policyname,
  cmd,
  roles::text
FROM pg_policies
WHERE tablename = 'chat_group_messages'
ORDER BY cmd;

-- 8. Teste
SELECT 
  '🧪 TESTE' as status,
  'Agora teste a API com a anon key' as instrucao;