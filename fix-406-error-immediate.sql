-- =====================================================
-- FIX IMEDIATO: Erro 406 (Not Acceptable) - Chat Group Messages
-- =====================================================
-- Problema: Usuário não tem permissão para ler mensagens do grupo
-- Solução: Políticas mais permissivas para leitura
-- =====================================================

-- 1. Primeiro, verificar o status atual das políticas
SELECT 
  '=== STATUS ATUAL DAS POLÍTICAS ===' as info;

SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'chat_group_messages'
ORDER BY cmd, policyname;

-- 2. Remover todas as políticas existentes para recomeçar
DROP POLICY IF EXISTS "authenticated_users_read_group_messages" ON chat_group_messages;
DROP POLICY IF EXISTS "admins_insert_group_messages" ON chat_group_messages;
DROP POLICY IF EXISTS "admins_update_own_messages" ON chat_group_messages;
DROP POLICY IF EXISTS "admins_delete_own_messages" ON chat_group_messages;

-- 3. Criar políticas SIMPLIFICADAS e PERMISSIVAS para leitura
-- Política 1: Qualquer usuário autenticado pode ler mensagens de grupos que é membro
CREATE POLICY "allow_read_group_messages_for_members"
  ON chat_group_messages FOR SELECT
  TO authenticated
  USING (
    -- Verificar se o usuário é membro do grupo
    EXISTS (
      SELECT 1 FROM chat_group_members
      WHERE chat_group_members.group_id = chat_group_messages.group_id
      AND chat_group_members.user_id = auth.uid()
    )
    OR
    -- OU se o usuário é admin
    has_role(auth.uid(), 'admin'::app_role)
  );

-- 4. Política para INSERT (apenas admins podem criar mensagens)
CREATE POLICY "allow_insert_group_messages_for_admins"
  ON chat_group_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    AND sender_id = auth.uid()
  );

-- 5. Política para UPDATE (apenas admins podem atualizar suas próprias mensagens)
CREATE POLICY "allow_update_own_messages_for_admins"
  ON chat_group_messages FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND sender_id = auth.uid()
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    AND sender_id = auth.uid()
  );

-- 6. Política para DELETE (apenas admins podem deletar suas próprias mensagens)
CREATE POLICY "allow_delete_own_messages_for_admins"
  ON chat_group_messages FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND sender_id = auth.uid()
  );

-- =====================================================
-- VERIFICAÇÃO E TESTE
-- =====================================================

-- 7. Verificar se as políticas foram aplicadas
SELECT 
  '=== POLÍTICAS APLICADAS ===' as info;

SELECT 
  policyname,
  cmd,
  roles,
  CASE 
    WHEN qual IS NOT NULL THEN 'Com condição'
    ELSE 'Sem condição'
  END as condicao
FROM pg_policies 
WHERE tablename = 'chat_group_messages'
ORDER BY cmd, policyname;

-- 8. Testar a consulta que estava falhando
SELECT 
  '=== TESTE DA CONSULTA ORIGINAL ===' as info;

-- Primeiro, verificar se o grupo existe
SELECT 
  'Verificando grupo:' as status,
  id,
  name,
  type
FROM chat_groups 
WHERE id = '95b093fe-083d-4b64-9a67-8d3b281dcd23';

-- Segundo, verificar se há membros no grupo
SELECT 
  'Membros do grupo:' as status,
  COUNT(*) as total_membros
FROM chat_group_members 
WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23';

-- Terceiro, verificar se há mensagens no grupo
SELECT 
  'Mensagens no grupo:' as status,
  COUNT(*) as total_mensagens,
  MAX(created_at) as ultima_mensagem
FROM chat_group_messages 
WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23';

-- 9. Testar a consulta específica (simulando o que o frontend faz)
-- NOTA: Esta consulta só funcionará se você estiver autenticado como um membro do grupo ou admin
SELECT 
  '=== TESTE DA CONSULTA ESPECÍFICA ===' as info,
  created_at 
FROM chat_group_messages 
WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
ORDER BY created_at DESC 
LIMIT 1;

-- 10. Verificar o usuário atual
SELECT 
  '=== USUÁRIO ATUAL ===' as info,
  auth.uid() as user_id,
  current_user as database_user,
  inet_client_addr() as client_ip;

-- 11. Verificar se o usuário atual tem role de admin
SELECT 
  '=== VERIFICAÇÃO DE ROLE ===' as info,
  has_role(auth.uid(), 'admin'::app_role) as is_admin;

-- 12. Verificar se o usuário atual é membro do grupo específico
SELECT 
  '=== VERIFICAÇÃO DE MEMBRO DO GRUPO ===' as info,
  EXISTS (
    SELECT 1 FROM chat_group_members
    WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
    AND user_id = auth.uid()
  ) as is_member_of_group;

-- =====================================================
-- SOLUÇÃO ALTERNATIVA SE AINDA FALHAR
-- =====================================================

-- Se ainda estiver falhando, criar uma política SEM CONDIÇÕES temporária
-- (APENAS PARA TESTES - REMOVER DEPOIS)
SELECT 
  '=== SOLUÇÃO ALTERNATIVA (TEMPORÁRIA) ===' as info;

-- Criar política temporária sem restrições (APENAS PARA DIAGNÓSTICO)
-- DROP POLICY IF EXISTS "temp_allow_all_read" ON chat_group_messages;
-- CREATE POLICY "temp_allow_all_read"
--   ON chat_group_messages FOR SELECT
--   TO authenticated
--   USING (true);

-- =====================================================
-- INSTRUÇÕES PARA RESOLVER O PROBLEMA
-- =====================================================

SELECT 
  '=== INSTRUÇÕES ===' as titulo,
  '1. Execute este script completo no SQL Editor do Supabase' as passo_1,
  '2. Verifique se todas as políticas foram criadas' as passo_2,
  '3. Teste a consulta específica (linha 78)' as passo_3,
  '4. Se ainda falhar, verifique:' as passo_4,
  '   - O usuário está autenticado?' as sub_4a,
  '   - O grupo existe?' as sub_4b,
  '   - O usuário é membro do grupo?' as sub_4c,
  '   - O usuário tem role de admin?' as sub_4d,
  '5. Se necessário, use a solução alternativa temporária' as passo_5,
  '6. Depois de testar, remova a política temporária' as passo_6;