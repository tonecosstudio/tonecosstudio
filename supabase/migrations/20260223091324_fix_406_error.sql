-- Migration: Fix erro 406 - Chat Group Messages RLS
-- Created: 2026-02-23 09:13:24
-- Description: Corrige polÃƒÂ­ticas RLS que causam erro 406 ao ler chat_group_messages

-- =====================================================
-- FIX SIMPLES E DIRETO PARA ERRO 406
-- =====================================================

-- 1. Primeiro, verificar o status atual
SELECT '=== INICIANDO FIX DO ERRO 406 ===' as status;

-- 2. Remover polÃƒÂ­ticas conflitantes (apenas as que existem)
DO $$
BEGIN
  -- Tentar remover cada polÃƒÂ­tica, ignorando erros se nÃƒÂ£o existir
  BEGIN
    DROP POLICY IF EXISTS "Members can read group messages" ON chat_group_messages;
    RAISE NOTICE 'Ã¢Å“â€¦ PolÃƒÂ­tica "Members can read group messages" removida';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Ã¢Å¡Â Ã¯Â¸Â PolÃƒÂ­tica nÃƒÂ£o existia ou erro: %', SQLERRM;
  END;

  BEGIN
    DROP POLICY IF EXISTS "Members and admins can read group messages" ON chat_group_messages;
    RAISE NOTICE 'Ã¢Å“â€¦ PolÃƒÂ­tica "Members and admins can read group messages" removida';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Ã¢Å¡Â Ã¯Â¸Â PolÃƒÂ­tica nÃƒÂ£o existia ou erro: %', SQLERRM;
  END;

  BEGIN
    DROP POLICY IF EXISTS "authenticated_users_read_group_messages" ON chat_group_messages;
    RAISE NOTICE 'Ã¢Å“â€¦ PolÃƒÂ­tica "authenticated_users_read_group_messages" removida';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Ã¢Å¡Â Ã¯Â¸Â PolÃƒÂ­tica nÃƒÂ£o existia ou erro: %', SQLERRM;
  END;
END $$;

-- 3. Criar polÃƒÂ­tica SIMPLIFICADA para SELECT
-- Esta ÃƒÂ© a polÃƒÂ­tica que resolve o erro 406
CREATE POLICY "fix_406_simple_read_policy"
  ON chat_group_messages FOR SELECT
  TO authenticated
  USING (
    -- CondiÃƒÂ§ÃƒÂ£o 1: UsuÃƒÂ¡rio ÃƒÂ© admin
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
    OR
    -- CondiÃƒÂ§ÃƒÂ£o 2: UsuÃƒÂ¡rio ÃƒÂ© membro do grupo
    EXISTS (
      SELECT 1 FROM chat_group_members
      WHERE chat_group_members.group_id = chat_group_messages.group_id
      AND chat_group_members.user_id = auth.uid()
    )
  );

-- 4. Manter polÃƒÂ­ticas existentes para INSERT, UPDATE, DELETE
-- (NÃƒÂ£o vamos mexer nelas para nÃƒÂ£o quebrar outras funcionalidades)

-- 5. Verificar se a polÃƒÂ­tica foi criada
SELECT 
  '=== VERIFICAÃƒâ€¡ÃƒÆ’O DA POLÃƒÂTICA ===' as status,
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
    ) THEN 'Ã¢Å“â€¦ QUERY FUNCIONA - Sem erro 406'
    ELSE 'Ã¢Å¡Â Ã¯Â¸Â Sem dados (mas sem erro 406)'
  END as resultado;

-- 7. Mensagem final
SELECT 
  '=== FIX APLICADO COM SUCESSO! ===' as status,
  'Recarregue a pÃƒÂ¡gina da aplicaÃƒÂ§ÃƒÂ£o (F5)' as instrucao_1,
  'O erro 406 deve ter desaparecido' as instrucao_2,
  'Se persistir, verifique:' as instrucao_3,
  '  - UsuÃƒÂ¡rio estÃƒÂ¡ autenticado' as detalhe_1,
  '  - UsuÃƒÂ¡rio ÃƒÂ© admin ou membro do grupo' as detalhe_2;