-- =====================================================
-- POLÃƒÂTICA TOTALMENTE ABERTA (para teste)
-- =====================================================
-- Problema: 406 persiste mesmo com polÃƒÂ­ticas corretas
-- SoluÃƒÂ§ÃƒÂ£o: Criar polÃƒÂ­tica que permite TUDO para todos os roles
-- =====================================================

-- 1. Remover todas as polÃƒÂ­ticas existentes
DROP POLICY IF EXISTS "anon_can_read" ON chat_group_messages;
DROP POLICY IF EXISTS "authenticated_can_read" ON chat_group_messages;
DROP POLICY IF EXISTS "admins_can_insert" ON chat_group_messages;
DROP POLICY IF EXISTS "admins_can_update" ON chat_group_messages;
DROP POLICY IF EXISTS "admins_can_delete" ON chat_group_messages;

-- 2. Criar polÃƒÂ­tica TOTALMENTE ABERTA (apenas para teste)
-- Esta polÃƒÂ­tica permite QUALQUER usuÃƒÂ¡rio fazer QUALQUER operaÃƒÂ§ÃƒÂ£o
CREATE POLICY "open_access_all" ON chat_group_messages
  FOR ALL
  TO postgres, anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Verificar polÃƒÂ­ticas
SELECT 
  'Ã¢Å“â€¦ POLÃƒÂTICAS ATUAIS' as status,
  policyname,
  cmd,
  roles::text
FROM pg_policies
WHERE tablename = 'chat_group_messages'
ORDER BY cmd;

-- 4. Teste
SELECT 
  'Ã°Å¸Â§Âª TESTE' as status,
  'Agora a tabela deve estar completamente aberta' as info,
  'Tente acessar a API novamente' as instrucao;