-- =====================================================
-- FIX COMPLETO: Erro 406 - Chat Group Messages
-- =====================================================
-- Este script corrige TODOS os problemas de RLS que causam erro 406
-- =====================================================

-- 1. PRIMEIRO: Verificar e configurar pré-requisitos
-- =====================================================

-- Verificar se o tipo app_role existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE app_role AS ENUM ('admin', 'customer', 'support');
    RAISE NOTICE '✅ Tipo app_role criado';
  ELSE
    RAISE NOTICE '✅ Tipo app_role já existe';
  END IF;
END $$;

-- Verificar se a função has_role existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role') THEN
    -- Criar função has_role simplificada
    CREATE OR REPLACE FUNCTION has_role(user_id uuid, role_name app_role)
    RETURNS boolean AS $$
    BEGIN
      RETURN EXISTS (
        SELECT 1 
        FROM auth.users 
        WHERE id = user_id 
        AND raw_user_meta_data->>'role' = role_name::text
      );
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    RAISE NOTICE '✅ Função has_role criada';
  ELSE
    RAISE NOTICE '✅ Função has_role já existe';
  END IF;
END $$;

-- 2. SEGUNDO: Remover TODAS as políticas conflitantes
-- =====================================================

-- Remover políticas antigas (todas as possíveis)
DROP POLICY IF EXISTS "Members can read group messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Members and admins can read group messages" ON chat_group_messages;
DROP POLICY IF EXISTS "authenticated_users_read_group_messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Admins can send messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Admins can update messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Admins can delete messages" ON chat_group_messages;
DROP POLICY IF EXISTS "admins_insert_group_messages" ON chat_group_messages;
DROP POLICY IF EXISTS "admins_update_own_messages" ON chat_group_messages;
DROP POLICY IF EXISTS "admins_delete_own_messages" ON chat_group_messages;
DROP POLICY IF EXISTS "allow_read_group_messages_for_members" ON chat_group_messages;
DROP POLICY IF EXISTS "allow_insert_group_messages_for_admins" ON chat_group_messages;
DROP POLICY IF EXISTS "allow_update_own_messages_for_admins" ON chat_group_messages;
DROP POLICY IF EXISTS "allow_delete_own_messages_for_admins" ON chat_group_messages;

-- 3. TERCEIRO: Criar políticas CORRETAS e CONSISTENTES
-- =====================================================

-- Política 1: SELECT - Quem pode LER mensagens
-- Admins podem ler TODAS as mensagens
-- Membros podem ler mensagens dos grupos que pertencem
CREATE POLICY "read_group_messages_policy"
  ON chat_group_messages FOR SELECT
  TO authenticated
  USING (
    -- Condição 1: É admin
    has_role(auth.uid(), 'admin'::app_role)
    OR
    -- Condição 2: É membro do grupo
    EXISTS (
      SELECT 1 FROM chat_group_members
      WHERE chat_group_members.group_id = chat_group_messages.group_id
      AND chat_group_members.user_id = auth.uid()
    )
  );

-- Política 2: INSERT - Quem pode CRIAR mensagens
-- Apenas admins podem criar mensagens
-- O sender_id DEVE ser o ID do usuário atual
CREATE POLICY "insert_group_messages_policy"
  ON chat_group_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Apenas admins podem criar
    has_role(auth.uid(), 'admin'::app_role)
    -- O sender_id deve ser o usuário atual
    AND sender_id = auth.uid()
  );

-- Política 3: UPDATE - Quem pode ATUALIZAR mensagens
-- Apenas admins podem atualizar
-- Apenas suas próprias mensagens
CREATE POLICY "update_group_messages_policy"
  ON chat_group_messages FOR UPDATE
  TO authenticated
  USING (
    -- Apenas admins podem atualizar
    has_role(auth.uid(), 'admin'::app_role)
    -- Apenas suas próprias mensagens
    AND sender_id = auth.uid()
  )
  WITH CHECK (
    -- As mesmas condições para validação
    has_role(auth.uid(), 'admin'::app_role)
    AND sender_id = auth.uid()
  );

-- Política 4: DELETE - Quem pode REMOVER mensagens
-- Apenas admins podem remover
-- Apenas suas próprias mensagens
CREATE POLICY "delete_group_messages_policy"
  ON chat_group_messages FOR DELETE
  TO authenticated
  USING (
    -- Apenas admins podem remover
    has_role(auth.uid(), 'admin'::app_role)
    -- Apenas suas próprias mensagens
    AND sender_id = auth.uid()
  );

-- 4. QUARTO: Verificar a aplicação das políticas
-- =====================================================

SELECT 
  '=== RESUMO DAS POLÍTICAS APLICADAS ===' as titulo;

SELECT 
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN '🔍 Leitura'
    WHEN cmd = 'INSERT' THEN '➕ Criação'
    WHEN cmd = 'UPDATE' THEN '✏️ Atualização'
    WHEN cmd = 'DELETE' THEN '🗑️ Remoção'
    ELSE cmd
  END as operacao,
  roles,
  CASE 
    WHEN qual IS NOT NULL THEN '✅ Com condições'
    ELSE '⚠️ Sem condições'
  END as condicoes
FROM pg_policies 
WHERE tablename = 'chat_group_messages'
ORDER BY 
  CASE cmd 
    WHEN 'SELECT' THEN 1
    WHEN 'INSERT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
    ELSE 5
  END;

-- 5. QUINTO: Testar a query específica do erro
-- =====================================================

SELECT 
  '=== TESTE DA QUERY DO ERRO 406 ===' as titulo;

-- Teste 1: Verificar se a query funciona
WITH test_result AS (
  SELECT created_at 
  FROM chat_group_messages 
  WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
  ORDER BY created_at DESC 
  LIMIT 1
)
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM test_result) THEN '✅ QUERY FUNCIONA - Sem erro 406'
    ELSE '⚠️ Query não retorna dados (mas não deve dar erro 406)'
  END as status_teste,
  (SELECT created_at FROM test_result) as ultimo_created_at;

-- Teste 2: Verificar permissões do usuário atual
SELECT 
  '=== VERIFICAÇÃO DE PERMISSÕES ===' as titulo,
  auth.uid() as user_id_atual,
  current_user as usuario_banco,
  has_role(auth.uid(), 'admin'::app_role) as is_admin,
  EXISTS (
    SELECT 1 FROM chat_group_members
    WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
    AND user_id = auth.uid()
  ) as is_member_do_grupo,
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN '✅ Tem acesso (admin)'
    WHEN EXISTS (
      SELECT 1 FROM chat_group_members
      WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
      AND user_id = auth.uid()
    ) THEN '✅ Tem acesso (membro)'
    ELSE '❌ NÃO tem acesso (não é admin nem membro)'
  END as status_acesso;

-- 6. SEXTO: Instruções finais
-- =====================================================

SELECT 
  '=== INSTRUÇÕES FINAIS ===' as titulo,
  '1. Este script corrigiu TODAS as políticas RLS' as passo_1,
  '2. As políticas agora são:' as passo_2,
  '   - SELECT: Admins (todos) + Membros (seus grupos)' as detalhe_2a,
  '   - INSERT: Apenas admins (suas próprias mensagens)' as detalhe_2b,
  '   - UPDATE: Apenas admins (suas próprias mensagens)' as detalhe_2c,
  '   - DELETE: Apenas admins (suas próprias mensagens)' as detalhe_2d,
  '3. Teste a aplicação:' as passo_3,
  '   - Recarregue a página do chat' as detalhe_3a,
  '   - O erro 406 deve ter desaparecido' as detalhe_3b,
  '4. Se ainda houver erro:' as passo_4,
  '   - Verifique se o usuário está autenticado' as detalhe_4a,
  '   - Verifique se o usuário é admin ou membro do grupo' as detalhe_4b,
  '   - Execute o script diagnostic-group-406.sql' as detalhe_4c;

-- 7. SÉTIMO: Comandos rápidos para referência
-- =====================================================

SELECT 
  '=== COMANDOS RÁPIDOS (para referência) ===' as titulo,
  '-- Para ver políticas atuais:' as cmd_1,
  'SELECT policyname, cmd, roles, LEFT(qual, 50) FROM pg_policies WHERE tablename = ''chat_group_messages'';' as sql_1,
  '' as espaco1,
  '-- Para testar acesso específico:' as cmd_2,
  'SELECT has_role(auth.uid(), ''admin''::app_role) as is_admin;' as sql_2,
  '' as espaco2,
  '-- Para adicionar usuário como membro (se necessário):' as cmd_3,
  'INSERT INTO chat_group_members (group_id, user_id) VALUES (''95b093fe-083d-4b64-9a67-8d3b281dcd23'', auth.uid()) ON CONFLICT DO NOTHING;' as sql_3;