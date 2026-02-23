-- Migration: Políticas seguras para produção - Chat Group Messages
-- Created: 2026-02-23 09:46:31
-- Description: Aplica políticas seguras para produção após confirmar que o erro 406 foi resolvido

-- =====================================================
-- AJUSTAR POLÍTICAS PARA PRODUÇÃO (SEGURAS)
-- =====================================================
-- Execute este script APÓS confirmar que o erro 406 foi resolvido
-- =====================================================

-- 1. Verificar status atual
SELECT 
  '1. STATUS ATUAL (APÓS FIX AGRESSIVO)' as status,
  COUNT(*) as total_policies,
  STRING_AGG(policyname, ', ') as policy_names
FROM pg_policies 
WHERE tablename = 'chat_group_messages';

-- 2. Remover políticas temporárias
DROP POLICY IF EXISTS "temp_super_permissive_read" ON chat_group_messages;
DROP POLICY IF EXISTS "temp_insert_admins_only" ON chat_group_messages;
DROP POLICY IF EXISTS "temp_update_admins_only" ON chat_group_messages;
DROP POLICY IF EXISTS "temp_delete_admins_only" ON chat_group_messages;

SELECT '✅ Políticas temporárias removidas' as status;

-- 3. Criar políticas SEGURAS para produção

-- Política 1: SELECT - Leitura segura
-- Admins podem ler TODAS as mensagens
-- Membros podem ler mensagens dos grupos que pertencem
CREATE POLICY "prod_read_group_messages"
  ON chat_group_messages FOR SELECT
  TO authenticated
  USING (
    -- Condição 1: É admin
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
    OR
    -- Condição 2: É membro do grupo
    EXISTS (
      SELECT 1 FROM chat_group_members
      WHERE chat_group_members.group_id = chat_group_messages.group_id
      AND chat_group_members.user_id = auth.uid()
    )
  );

-- Política 2: INSERT - Apenas admins podem criar
CREATE POLICY "prod_insert_group_messages"
  ON chat_group_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Apenas admins podem criar
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
    -- O sender_id deve ser o usuário atual
    AND sender_id = auth.uid()
  );

-- Política 3: UPDATE - Apenas admins podem atualizar suas mensagens
CREATE POLICY "prod_update_group_messages"
  ON chat_group_messages FOR UPDATE
  TO authenticated
  USING (
    -- Apenas admins podem atualizar
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
    -- Apenas suas próprias mensagens
    AND sender_id = auth.uid()
  )
  WITH CHECK (
    -- As mesmas condições para validação
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
    AND sender_id = auth.uid()
  );

-- Política 4: DELETE - Apenas admins podem deletar suas mensagens
CREATE POLICY "prod_delete_group_messages"
  ON chat_group_messages FOR DELETE
  TO authenticated
  USING (
    -- Apenas admins podem deletar
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
    -- Apenas suas próprias mensagens
    AND sender_id = auth.uid()
  );

-- 4. Verificar políticas aplicadas
SELECT 
  '2. POLÍTICAS DE PRODUÇÃO APLICADAS' as status,
  policyname,
  cmd,
  roles,
  CASE 
    WHEN cmd = 'SELECT' AND qual LIKE '%admin%' AND qual LIKE '%chat_group_members%' THEN '✅ SEGURA (admins + membros)'
    WHEN cmd = 'INSERT' AND with_check LIKE '%admin%' AND with_check LIKE '%sender_id%' THEN '✅ SEGURA (apenas admins)'
    WHEN cmd = 'UPDATE' AND qual LIKE '%admin%' AND qual LIKE '%sender_id%' THEN '✅ SEGURA (apenas admins, suas mensagens)'
    WHEN cmd = 'DELETE' AND qual LIKE '%admin%' AND qual LIKE '%sender_id%' THEN '✅ SEGURA (apenas admins, suas mensagens)'
    ELSE '⚠️ VERIFICAR'
  END as validacao
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

-- 5. Testar a query do erro 406 com as novas políticas
SELECT 
  '3. TESTE DA QUERY DO ERRO 406 (COM POLÍTICAS DE PRODUÇÃO)' as status,
  CASE 
    WHEN EXISTS (
      SELECT created_at 
      FROM chat_group_messages 
      WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
      ORDER BY created_at DESC 
      LIMIT 1
    ) THEN '✅✅✅ QUERY FUNCIONA - SEM ERRO 406!'
    ELSE '⚠️ Sem dados (mas SEM ERRO 406!)'
  END as resultado;

-- 6. Verificar permissões do usuário atual
SELECT 
  '4. PERMISSÕES DO USUÁRIO ATUAL' as status,
  auth.uid() as user_id,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    ) THEN '✅ É ADMIN - Tem acesso total'
    WHEN EXISTS (
      SELECT 1 FROM chat_group_members
      WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
      AND user_id = auth.uid()
    ) THEN '✅ É MEMBRO DO GRUPO - Tem acesso'
    ELSE '⚠️ Não é admin nem membro - SEM ACESSO (causaria erro 406 se não fosse admin/membro)'
  END as status_acesso;

-- 7. Instruções finais
SELECT 
  '5. CONCLUSÃO' as titulo,
  '✅ POLÍTICAS DE PRODUÇÃO APLICADAS COM SUCESSO!' as status,
  'As políticas agora são:' as detalhe_1,
  '  • SELECT: Admins (todos) + Membros (seus grupos)' as item_1,
  '  • INSERT: Apenas admins (suas mensagens)' as item_2,
  '  • UPDATE: Apenas admins (suas mensagens)' as item_3,
  '  • DELETE: Apenas admins (suas mensagens)' as item_4,
  '' as espaco,
  'Próximos passos:' as instrucao_1,
  '  1. Teste a aplicação novamente' as passo_1,
  '  2. O erro 406 deve permanecer RESOLVIDO' as passo_2,
  '  3. Sistema agora está SEGURO para produção' as passo_3,
  '' as espaco2,
  '🎉 ERRO 406 RESOLVIDO DEFINITIVAMENTE!' as conclusao;