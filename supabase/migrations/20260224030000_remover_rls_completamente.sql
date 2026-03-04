-- =====================================================
-- REMOVER RLS COMPLETAMENTE (SOLUÃƒâ€¡ÃƒÆ’O FINAL)
-- =====================================================
-- Problema: Erro 406 persiste mesmo com polÃƒÂ­ticas abertas
-- SoluÃƒÂ§ÃƒÂ£o: Desabilitar RLS completamente e criar polÃƒÂ­tica simples
-- =====================================================

-- 1. Desabilitar RLS em todas as tabelas de chat
ALTER TABLE chat_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_group_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_group_attachments DISABLE ROW LEVEL SECURITY;

-- 2. Remover todas as polÃƒÂ­ticas existentes
DROP POLICY IF EXISTS "open_access_all" ON chat_group_messages;
DROP POLICY IF EXISTS "open_access_chat_groups" ON chat_groups;
DROP POLICY IF EXISTS "open_access_chat_group_members" ON chat_group_members;
DROP POLICY IF EXISTS "open_access_chat_group_attachments" ON chat_group_attachments;

-- 3. Habilitar RLS novamente
ALTER TABLE chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_group_attachments ENABLE ROW LEVEL SECURITY;

-- 4. Criar polÃƒÂ­tica ÃƒÅ¡NICA e SIMPLES para cada tabela
-- Esta polÃƒÂ­tica permite TUDO para todos os roles
CREATE POLICY "full_access" ON chat_groups FOR ALL TO postgres, anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "full_access" ON chat_group_members FOR ALL TO postgres, anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "full_access" ON chat_group_messages FOR ALL TO postgres, anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "full_access" ON chat_group_attachments FOR ALL TO postgres, anon, authenticated USING (true) WITH CHECK (true);

-- 5. Verificar status
SELECT 
  'Ã¢Å“â€¦ STATUS DAS TABELAS' as status,
  relname as tabela,
  relrowsecurity as rls_ativo
FROM pg_class
WHERE relname LIKE 'chat_%'
ORDER BY relname;

-- 6. Verificar polÃƒÂ­ticas
SELECT 
  'Ã¢Å“â€¦ POLÃƒÂTICAS' as status,
  tablename,
  policyname,
  cmd,
  roles::text
FROM pg_policies
WHERE tablename LIKE 'chat_%'
ORDER BY tablename, cmd;

-- 7. Teste
SELECT 
  'Ã°Å¸Â§Âª TESTE' as status,
  'Agora todas as tabelas de chat devem estar completamente abertas' as info;