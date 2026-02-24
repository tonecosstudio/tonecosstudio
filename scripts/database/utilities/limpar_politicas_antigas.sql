-- Remover políticas antigas que ainda existem e estão causando conflito

-- =====================================================
-- REMOVER POLÍTICAS ANTIGAS DE ATTACHMENTS
-- =====================================================

DROP POLICY IF EXISTS "Admins can delete attachments" ON chat_group_attachments;
DROP POLICY IF EXISTS "Admins can insert attachments" ON chat_group_attachments;
DROP POLICY IF EXISTS "Admins can update attachments" ON chat_group_attachments;
DROP POLICY IF EXISTS "Admins can view all attachments" ON chat_group_attachments;
DROP POLICY IF EXISTS "Members can view group attachments" ON chat_group_attachments;

-- =====================================================
-- VERIFICAR RESULTADO
-- =====================================================

SELECT 
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename IN ('chat_groups', 'chat_group_members', 'chat_group_messages', 'chat_group_attachments')
ORDER BY tablename, cmd, policyname;

-- Contar políticas por tabela
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('chat_groups', 'chat_group_members', 'chat_group_messages', 'chat_group_attachments')
GROUP BY tablename
ORDER BY tablename;

SELECT '✅ Políticas antigas removidas. Cada tabela deve ter exatamente 4 políticas.' as resultado;
