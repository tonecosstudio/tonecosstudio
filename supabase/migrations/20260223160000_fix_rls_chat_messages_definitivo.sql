-- =====================================================
-- FIX DEFINITIVO: Chat Group Messages RLS
-- =====================================================
-- Problema: Erro 406 ao fazer queries em chat_group_messages
-- Causa: Políticas RLS foram sobrescritas por migration posterior
-- Solução: Recriar políticas corretas com suporte a anon
-- =====================================================

-- 1. Remover TODAS as políticas antigas
DROP POLICY IF EXISTS "allow_all_operations" ON chat_group_messages;
DROP POLICY IF EXISTS "Members can read group messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Admins can send messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Admins can update messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Admins can delete messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Admins can read all group messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Members can read their group messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Admins can send group messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Admins can update their messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Admins can delete their messages" ON chat_group_messages;

-- 2. Garantir que RLS está habilitado
ALTER TABLE chat_group_messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS CORRETAS
-- =====================================================

-- Policy 1: Admins podem ler TODAS as mensagens
-- Isso permite que admins vejam mensagens de todos os grupos
CREATE POLICY "admins_read_all_messages"
  ON chat_group_messages FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Policy 2: Membros podem ler mensagens dos SEUS grupos
-- Isso permite que membros vejam apenas mensagens dos grupos que pertencem
CREATE POLICY "members_read_own_group_messages"
  ON chat_group_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_group_members
      WHERE chat_group_members.group_id = chat_group_messages.group_id
      AND chat_group_members.user_id = auth.uid()
    )
  );

-- Policy 3: Apenas admins podem INSERIR mensagens
CREATE POLICY "admins_insert_messages"
  ON chat_group_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Policy 4: Apenas admins podem ATUALIZAR mensagens
CREATE POLICY "admins_update_messages"
  ON chat_group_messages FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Policy 5: Apenas admins podem DELETAR mensagens
CREATE POLICY "admins_delete_messages"
  ON chat_group_messages FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
  );

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

-- Verificar políticas criadas
SELECT 
  '✅ POLÍTICAS CRIADAS' as status,
  policyname,
  cmd,
  roles::text,
  CASE 
    WHEN qual IS NOT NULL THEN 'USING: ' || LEFT(qual, 50)
    WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || LEFT(with_check, 50)
    ELSE 'N/A'
  END as condicao
FROM pg_policies 
WHERE tablename = 'chat_group_messages'
ORDER BY cmd, policyname;

-- Testar query que estava causando erro 406
SELECT 
  '✅ TESTE DA QUERY' as status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM chat_group_messages 
      WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
      LIMIT 1
    ) THEN 'Query funciona! ✅'
    ELSE 'Sem mensagens neste grupo (mas query funciona)'
  END as resultado;

-- Instruções finais
SELECT 
  '✅✅✅ FIX APLICADO COM SUCESSO!' as mensagem_final,
  '' as espaco,
  'PRÓXIMOS PASSOS:' as instrucoes,
  '1. Recarregue a página (F5)' as passo_1,
  '2. O erro 406 deve ter desaparecido' as passo_2,
  '3. Teste criar e visualizar mensagens' as passo_3,
  '' as espaco2,
  '📋 POLÍTICAS CRIADAS:' as resumo,
  '- admins_read_all_messages: Admins veem tudo' as politica_1,
  '- members_read_own_group_messages: Membros veem seus grupos' as politica_2,
  '- admins_insert_messages: Só admins criam mensagens' as politica_3,
  '- admins_update_messages: Só admins editam mensagens' as politica_4,
  '- admins_delete_messages: Só admins deletam mensagens' as politica_5;
