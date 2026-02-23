-- =====================================================
-- POLÍTICA TOTALMENTE ABERTA (para teste)
-- =====================================================
-- Problema: 406 persiste mesmo com políticas corretas
-- Solução: Criar política que permite TUDO para todos os roles
-- =====================================================

-- 1. Remover todas as políticas existentes
DROP POLICY IF EXISTS "anon_can_read" ON chat_group_messages;
DROP POLICY IF EXISTS "authenticated_can_read" ON chat_group_messages;
DROP POLICY IF EXISTS "admins_can_insert" ON chat_group_messages;
DROP POLICY IF EXISTS "admins_can_update" ON chat_group_messages;
DROP POLICY IF EXISTS "admins_can_delete" ON chat_group_messages;

-- 2. Criar política TOTALMENTE ABERTA (apenas para teste)
-- Esta política permite QUALQUER usuário fazer QUALQUER operação
CREATE POLICY "open_access_all" ON chat_group_messages
  FOR ALL
  TO postgres, anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Verificar políticas
SELECT 
  '✅ POLÍTICAS ATUAIS' as status,
  policyname,
  cmd,
  roles::text
FROM pg_policies
WHERE tablename = 'chat_group_messages'
ORDER BY cmd;

-- 4. Teste
SELECT 
  '🧪 TESTE' as status,
  'Agora a tabela deve estar completamente aberta' as info,
  'Tente acessar a API novamente' as instrucao;