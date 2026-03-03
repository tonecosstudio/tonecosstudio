-- =====================================================
-- FIX RÁPIDO: Erro 406 - Chat Group Messages
-- =====================================================
-- Execute este script NO SQL EDITOR DO SUPABASE
-- =====================================================

-- 1. Remover políticas conflitantes
DROP POLICY IF EXISTS "Members can read group messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Members and admins can read group messages" ON chat_group_messages;
DROP POLICY IF EXISTS "authenticated_users_read_group_messages" ON chat_group_messages;

-- 2. Criar política SIMPLIFICADA para SELECT
-- Admins podem ler TODAS as mensagens
-- Membros podem ler mensagens dos grupos que pertencem
CREATE POLICY "fix_406_read_policy"
  ON chat_group_messages FOR SELECT
  TO authenticated
  USING (
    -- É admin OU é membro do grupo
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM chat_group_members
      WHERE chat_group_members.group_id = chat_group_messages.group_id
      AND chat_group_members.user_id = auth.uid()
    )
  );

-- 3. Testar a query que estava falhando
SELECT 
  'TESTE DA QUERY DO ERRO 406' as status,
  CASE 
    WHEN EXISTS (
      SELECT created_at 
      FROM chat_group_messages 
      WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
      LIMIT 1
    ) THEN '✅ FUNCIONANDO - Sem erro 406'
    ELSE '⚠️ Sem dados (mas sem erro 406)'
  END as resultado;

-- 4. Verificar políticas aplicadas
SELECT 
  'POLÍTICAS APLICADAS' as status,
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename = 'chat_group_messages'
ORDER BY cmd;

-- 5. Instruções finais
SELECT 
  'INSTRUÇÕES' as titulo,
  '1. Recarregue a página da aplicação (F5)' as passo_1,
  '2. O erro 406 deve ter desaparecido' as passo_2,
  '3. Se persistir, verifique:' as passo_3,
  '   - Usuário está autenticado' as sub_3a,
  '   - Usuário é admin ou membro do grupo' as sub_3b;