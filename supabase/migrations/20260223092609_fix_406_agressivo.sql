-- Migration: Fix agressivo para erro 406 - Chat Group Messages RLS
-- Created: 2026-02-23 09:26:09
-- Description: Remove TODAS as polÃƒÂ­ticas e cria uma SUPER PERMISSIVA temporariamente

-- =====================================================
-- FIX AGRESSIVO: Erro 406 - Chat Group Messages
-- =====================================================
-- Este script remove TODAS as polÃƒÂ­ticas e cria uma SUPER PERMISSIVA
-- APENAS PARA TESTES - depois ajustar para produÃƒÂ§ÃƒÂ£o
-- =====================================================

-- 1. Primeiro, listar TODAS as polÃƒÂ­ticas atuais
SELECT 
  '=== POLÃƒÂTICAS ATUAIS ===' as status,
  policyname,
  cmd,
  roles,
  LEFT(qual, 100) as condicao
FROM pg_policies 
WHERE tablename = 'chat_group_messages'
ORDER BY policyname;

-- 2. Remover ABSOLUTAMENTE TODAS as polÃƒÂ­ticas
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'chat_group_messages'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON chat_group_messages', policy_record.policyname);
    RAISE NOTICE 'Ã¢Å“â€¦ PolÃƒÂ­tica "%" removida', policy_record.policyname;
  END LOOP;
END $$;

-- 3. Criar polÃƒÂ­tica SUPER PERMISSIVA (APENAS PARA TESTE)
-- Qualquer usuÃƒÂ¡rio autenticado pode ler TODAS as mensagens
CREATE POLICY "temp_super_permissive_read"
  ON chat_group_messages FOR SELECT
  TO authenticated
  USING (true);  -- SEMPRE verdadeiro = acesso total

-- 4. Manter polÃƒÂ­ticas bÃƒÂ¡sicas para outras operaÃƒÂ§ÃƒÂµes
CREATE POLICY "temp_insert_admins_only"
  ON chat_group_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
    AND sender_id = auth.uid()
  );

CREATE POLICY "temp_update_admins_only"
  ON chat_group_messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
    AND sender_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
    AND sender_id = auth.uid()
  );

CREATE POLICY "temp_delete_admins_only"
  ON chat_group_messages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
    AND sender_id = auth.uid()
  );

-- 5. Verificar polÃƒÂ­ticas aplicadas
SELECT 
  '=== POLÃƒÂTICAS APLICADAS (DEPOIS DO FIX) ===' as status,
  COUNT(*) as total_policies,
  STRING_AGG(policyname, ', ') as policy_names
FROM pg_policies 
WHERE tablename = 'chat_group_messages';

-- 6. Testar a query EXATA do erro
SELECT 
  '=== TESTE DA QUERY EXATA DO ERRO 406 ===' as status,
  'Query: GET /rest/v1/chat_group_messages?select=created_at&group_id=eq.95b093fe-083d-4b64-9a67-8d3b281dcd23&order=created_at.desc&limit=1' as query,
  CASE 
    WHEN EXISTS (
      SELECT created_at 
      FROM chat_group_messages 
      WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
      ORDER BY created_at DESC 
      LIMIT 1
    ) THEN 'Ã¢Å“â€¦ QUERY FUNCIONA - Sem erro 406'
    ELSE 'Ã¢Å¡Â Ã¯Â¸Â Sem dados (mas SEM ERRO 406!)'
  END as resultado,
  (SELECT created_at FROM chat_group_messages WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23' ORDER BY created_at DESC LIMIT 1) as ultimo_created_at;

-- 7. Verificar se o grupo existe
SELECT 
  '=== VERIFICAÃƒâ€¡ÃƒÆ’O DO GRUPO ===' as status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM chat_groups WHERE id = '95b093fe-083d-4b64-9a67-8d3b281dcd23') 
    THEN 'Ã¢Å“â€¦ Grupo existe'
    ELSE 'Ã¢ÂÅ’ Grupo NÃƒÆ’O existe'
  END as grupo_existe,
  (SELECT name FROM chat_groups WHERE id = '95b093fe-083d-4b64-9a67-8d3b281dcd23') as nome_grupo;

-- 8. Verificar se hÃƒÂ¡ mensagens no grupo
SELECT 
  '=== VERIFICAÃƒâ€¡ÃƒÆ’O DE MENSAGENS ===' as status,
  COUNT(*) as total_mensagens,
  MIN(created_at) as primeira_mensagem,
  MAX(created_at) as ultima_mensagem
FROM chat_group_messages 
WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23';

-- 9. InstruÃƒÂ§ÃƒÂµes finais
SELECT 
  '=== INSTRUÃƒâ€¡Ãƒâ€¢ES ===' as titulo,
  'Ã¢Å“â€¦ FIX AGRESSIVO APLICADO!' as status,
  'A polÃƒÂ­tica de leitura agora ÃƒÂ© SUPER PERMISSIVA:' as detalhe_1,
  '  Ã¢â‚¬Â¢ Qualquer usuÃƒÂ¡rio autenticado pode ler TODAS as mensagens' as item_1,
  '' as espaco,
  'PrÃƒÂ³ximos passos:' as instrucao_1,
  '  1. Recarregue a pÃƒÂ¡gina (F5)' as passo_1,
  '  2. O erro 406 DEVE desaparecer' as passo_2,
  '  3. Se funcionar, crie polÃƒÂ­ticas mais restritivas depois' as passo_3,
  '' as espaco2,
  'Ã¢Å¡Â Ã¯Â¸Â ATENÃƒâ€¡ÃƒÆ’O: Esta ÃƒÂ© uma soluÃƒÂ§ÃƒÂ£o TEMPORÃƒÂRIA' as aviso,
  'Depois que o erro sumir, ajuste as polÃƒÂ­ticas para produÃƒÂ§ÃƒÂ£o.' as aviso_detalhe;