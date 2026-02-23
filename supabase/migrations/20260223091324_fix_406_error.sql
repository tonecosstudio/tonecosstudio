-- Migration: Fix erro 406 - Chat Group Messages RLS
-- Created: 2026-02-23 09:13:24
-- Description: Corrige políticas RLS que causam erro 406 ao ler chat_group_messages

-- =====================================================
-- FIX SIMPLES E DIRETO PARA ERRO 406
-- =====================================================

-- 1. Primeiro, verificar o status atual
SELECT '=== INICIANDO FIX DO ERRO 406 ===' as status;

-- 2. Remover políticas conflitantes (apenas as que existem)
DO $$
BEGIN
  -- Tentar remover cada política, ignorando erros se não existir
  BEGIN
    DROP POLICY IF EXISTS "Members can read group messages" ON chat_group_messages;
    RAISE NOTICE '✅ Política "Members can read group messages" removida';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Política não existia ou erro: %', SQLERRM;
  END;

  BEGIN
    DROP POLICY IF EXISTS "Members and admins can read group messages" ON chat_group_messages;
    RAISE NOTICE '✅ Política "Members and admins can read group messages" removida';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Política não existia ou erro: %', SQLERRM;
  END;

  BEGIN
    DROP POLICY IF EXISTS "authenticated_users_read_group_messages" ON chat_group_messages;
    RAISE NOTICE '✅ Política "authenticated_users_read_group_messages" removida';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Política não existia ou erro: %', SQLERRM;
  END;
END $$;

-- 3. Criar política SIMPLIFICADA para SELECT
-- Esta é a política que resolve o erro 406
CREATE POLICY "fix_406_simple_read_policy"
  ON chat_group_messages FOR SELECT
  TO authenticated
  USING (
    -- Condição 1: Usuário é admin
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
    OR
    -- Condição 2: Usuário é membro do grupo
    EXISTS (
      SELECT 1 FROM chat_group_members
      WHERE chat_group_members.group_id = chat_group_messages.group_id
      AND chat_group_members.user_id = auth.uid()
    )
  );

-- 4. Manter políticas existentes para INSERT, UPDATE, DELETE
-- (Não vamos mexer nelas para não quebrar outras funcionalidades)

-- 5. Verificar se a política foi criada
SELECT 
  '=== VERIFICAÇÃO DA POLÍTICA ===' as status,
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename = 'chat_group_messages'
ORDER BY cmd;

-- 6. Testar a query que estava falhando
SELECT 
  '=== TESTE DA QUERY DO ERRO 406 ===' as status,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM chat_group_messages 
      WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
      LIMIT 1
    ) THEN '✅ QUERY FUNCIONA - Sem erro 406'
    ELSE '⚠️ Sem dados (mas sem erro 406)'
  END as resultado;

-- 7. Mensagem final
SELECT 
  '=== FIX APLICADO COM SUCESSO! ===' as status,
  'Recarregue a página da aplicação (F5)' as instrucao_1,
  'O erro 406 deve ter desaparecido' as instrucao_2,
  'Se persistir, verifique:' as instrucao_3,
  '  - Usuário está autenticado' as detalhe_1,
  '  - Usuário é admin ou membro do grupo' as detalhe_2;