-- =====================================================
-- DIAGNÓSTICO COMPLETO DO ERRO 406
-- =====================================================

-- 1. Verificar se a tabela existe
SELECT 
  '1️⃣ TABELA EXISTE?' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_group_messages')
    THEN '✅ Sim'
    ELSE '❌ Não existe!'
  END as resultado;

-- 2. Verificar estrutura da tabela
SELECT 
  '2️⃣ ESTRUTURA DA TABELA' as check_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'chat_group_messages'
ORDER BY ordinal_position;

-- 3. Verificar se RLS está habilitado
SELECT 
  '3️⃣ RLS HABILITADO?' as check_name,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'chat_group_messages';

-- 4. Listar TODAS as políticas
SELECT 
  '4️⃣ POLÍTICAS RLS' as check_name,
  policyname,
  cmd,
  roles::text,
  permissive
FROM pg_policies 
WHERE tablename = 'chat_group_messages'
ORDER BY cmd, policyname;

-- 5. Verificar se há dados na tabela
SELECT 
  '5️⃣ DADOS NA TABELA' as check_name,
  COUNT(*) as total_rows,
  COUNT(DISTINCT group_id) as total_groups
FROM chat_group_messages;

-- 6. Testar query específica que está falhando
SELECT 
  '6️⃣ TESTE DA QUERY EXATA' as check_name,
  'Tentando: SELECT created_at FROM chat_group_messages WHERE group_id = ... ORDER BY created_at DESC LIMIT 1' as query;

-- Tentar executar a query
DO $$
BEGIN
  PERFORM created_at 
  FROM chat_group_messages 
  WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
  ORDER BY created_at DESC 
  LIMIT 1;
  
  RAISE NOTICE '✅ Query executou sem erro!';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Erro ao executar query: %', SQLERRM;
END $$;

-- 7. Verificar contexto do usuário
SELECT 
  '7️⃣ CONTEXTO DO USUÁRIO' as check_name,
  current_user as db_user,
  session_user,
  auth.uid() as auth_user_id;

-- 8. Verificar se usuário é admin
SELECT 
  '8️⃣ USUÁRIO É ADMIN?' as check_name,
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN '✅ Sim, é admin'
    ELSE '❌ Não é admin'
  END as resultado;

-- 9. Verificar se usuário é membro do grupo
SELECT 
  '9️⃣ USUÁRIO É MEMBRO DO GRUPO?' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM chat_group_members 
      WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
      AND user_id = auth.uid()
    ) THEN '✅ Sim, é membro'
    ELSE '❌ Não é membro'
  END as resultado;

-- 10. Verificar se há foreign keys problemáticas
SELECT 
  '🔟 FOREIGN KEYS' as check_name,
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'chat_group_messages'::regclass;

-- 11. Verificar grants/permissões
SELECT 
  '1️⃣1️⃣ PERMISSÕES DA TABELA' as check_name,
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'chat_group_messages'
ORDER BY grantee, privilege_type;

-- 12. Resumo final
SELECT 
  '📊 RESUMO DO DIAGNÓSTICO' as titulo,
  '' as espaco,
  'Execute este script no Supabase SQL Editor' as instrucao_1,
  'Copie TODOS os resultados e compartilhe' as instrucao_2,
  'Isso vai revelar exatamente o que está errado' as instrucao_3;
