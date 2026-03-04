-- =====================================================
-- CORRIGIR TODAS AS TABELAS DE CHAT
-- =====================================================
-- Problema: Erro 406 em chat_groups, chat_group_members, etc.
-- SoluÃƒÂ§ÃƒÂ£o: Aplicar polÃƒÂ­ticas abertas para todas as tabelas
-- =====================================================

-- =====================================================
-- TABELA: chat_groups
-- =====================================================
DROP POLICY IF EXISTS "open_access_chat_groups" ON chat_groups;
CREATE POLICY "open_access_chat_groups" ON chat_groups
  FOR ALL
  TO postgres, anon, authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- TABELA: chat_group_members
-- =====================================================
DROP POLICY IF EXISTS "open_access_chat_group_members" ON chat_group_members;
CREATE POLICY "open_access_chat_group_members" ON chat_group_members
  FOR ALL
  TO postgres, anon, authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- TABELA: chat_group_messages
-- =====================================================
DROP POLICY IF EXISTS "open_access_all" ON chat_group_messages;
CREATE POLICY "open_access_all" ON chat_group_messages
  FOR ALL
  TO postgres, anon, authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- TABELA: chat_group_attachments
-- =====================================================
DROP POLICY IF EXISTS "open_access_chat_group_attachments" ON chat_group_attachments;
CREATE POLICY "open_access_chat_group_attachments" ON chat_group_attachments
  FOR ALL
  TO postgres, anon, authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- VERIFICAR TODAS AS POLÃƒÂTICAS
-- =====================================================
SELECT 
  'Ã¢Å“â€¦ POLÃƒÂTICAS APLICADAS' as status,
  tablename,
  policyname,
  cmd,
  roles::text
FROM pg_policies
WHERE tablename LIKE 'chat_%'
ORDER BY tablename, cmd;

-- =====================================================
-- RESUMO
-- =====================================================
SELECT 
  'Ã°Å¸Å½â€° CORREÃƒâ€¡ÃƒÆ’O APLICADA!' as titulo,
  'Todas as tabelas de chat agora estÃƒÂ£o abertas' as info,
  'Tente acessar a pÃƒÂ¡gina novamente' as instrucao;