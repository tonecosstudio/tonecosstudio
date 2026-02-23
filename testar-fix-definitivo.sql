-- =====================================================
-- TESTE DO FIX DEFINITIVO
-- =====================================================
-- Execute este script DEPOIS de aplicar a migration
-- =====================================================

-- 1. Verificar políticas atuais
SELECT 
  '1️⃣ POLÍTICAS ATUAIS' as status,
  policyname,
  cmd,
  roles::text as roles,
  CASE 
    WHEN qual IS NOT NULL THEN 'USING: ' || LEFT(qual, 80)
    WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || LEFT(with_check, 80)
    ELSE 'N/A'
  END as condicao
FROM pg_policies 
WHERE tablename = 'chat_group_messages'
ORDER BY cmd, policyname;

-- 2. Testar query EXATA que causava erro 406
SELECT 
  '2️⃣ TESTE DA QUERY DO ERRO 406' as status,
  'GET /rest/v1/chat_group_messages?select=created_at&group_id=eq.95b093fe-083d-4b64-9a67-8d3b281dcd23&order=created_at.desc&limit=1' as query_original;

SELECT 
  '   RESULTADO:' as status,
  CASE 
    WHEN EXISTS (
      SELECT created_at 
      FROM chat_group_messages 
      WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
      ORDER BY created_at DESC 
      LIMIT 1
    ) THEN '✅ Query funciona!'
    ELSE '⚠️ Sem mensagens (mas query funciona)'
  END as resultado;

-- 3. Verificar se há mensagens no grupo
SELECT 
  '3️⃣ MENSAGENS NO GRUPO' as status,
  COUNT(*) as total_mensagens,
  MIN(created_at) as primeira_mensagem,
  MAX(created_at) as ultima_mensagem
FROM chat_group_messages 
WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23';

-- 4. Verificar estrutura da tabela
SELECT 
  '4️⃣ ESTRUTURA DA TABELA' as status,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'chat_group_messages'
ORDER BY ordinal_position;

-- 5. Verificar se RLS está habilitado
SELECT 
  '5️⃣ STATUS DO RLS' as status,
  schemaname,
  tablename,
  rowsecurity as rls_habilitado
FROM pg_tables 
WHERE tablename = 'chat_group_messages';

-- 6. Verificar contexto do usuário atual
SELECT 
  '6️⃣ CONTEXTO DO USUÁRIO' as status,
  auth.uid() as user_id,
  current_user as db_user,
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN '✅ É admin'
    ELSE '❌ Não é admin'
  END as is_admin;

-- 7. Verificar membros do grupo
SELECT 
  '7️⃣ MEMBROS DO GRUPO' as status,
  COUNT(*) as total_membros
FROM chat_group_members
WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23';

-- 8. Resumo final
SELECT 
  '✅✅✅ RESUMO DO TESTE' as titulo,
  '' as espaco,
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'chat_group_messages') = 5 
    THEN '✅ 5 políticas criadas corretamente'
    ELSE '❌ Número incorreto de políticas: ' || (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'chat_group_messages')::text
  END as check_1,
  CASE 
    WHEN (SELECT rowsecurity FROM pg_tables WHERE tablename = 'chat_group_messages') = true
    THEN '✅ RLS habilitado'
    ELSE '❌ RLS desabilitado'
  END as check_2,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_group_messages' AND column_name = 'created_at')
    THEN '✅ Coluna created_at existe'
    ELSE '❌ Coluna created_at não existe'
  END as check_3,
  '' as espaco2,
  'PRÓXIMOS PASSOS:' as instrucoes,
  '1. Se todos os checks estão ✅, recarregue a página (F5)' as passo_1,
  '2. O erro 406 deve ter desaparecido' as passo_2,
  '3. Teste criar e visualizar mensagens no grupo' as passo_3;
