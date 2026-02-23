-- =====================================================
-- VERIFICAÇÃO COMPLETA DA ESTRUTURA DA TABELA
-- =====================================================

-- 1. Verificar se a tabela existe e sua estrutura
SELECT 
  '1️⃣ ESTRUTURA DA TABELA' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'chat_group_messages'
ORDER BY ordinal_position;

-- 2. Verificar se há dados
SELECT 
  '2️⃣ DADOS NA TABELA' as info,
  COUNT(*) as total_rows
FROM chat_group_messages;

-- 3. Verificar se há dados no grupo específico
SELECT 
  '3️⃣ DADOS NO GRUPO DO ERRO' as info,
  COUNT(*) as mensagens_no_grupo
FROM chat_group_messages
WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23';

-- 4. Tentar a query exata que está falhando
SELECT 
  '4️⃣ TESTE DA QUERY EXATA' as info,
  'Tentando executar: SELECT created_at FROM chat_group_messages WHERE group_id = ...' as query;

-- Executar a query diretamente
SELECT 
  created_at,
  group_id,
  message
FROM chat_group_messages
WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
ORDER BY created_at DESC
LIMIT 1;

-- 5. Verificar foreign keys
SELECT 
  '5️⃣ FOREIGN KEYS' as info,
  conname,
  attname,
  confrelid::regclass as referenced_table
FROM pg_constraint
JOIN pg_attribute ON pg_attribute.attrelid = pg_constraint.conrelid
WHERE pg_constraint.conrelid = 'chat_group_messages'::regclass;

-- 6. Verificar índices
SELECT 
  '6️⃣ ÍNDICES' as info,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'chat_group_messages';

-- 7. Verificar RLS status
SELECT 
  '7️⃣ STATUS RLS' as info,
  relname,
  relrowsecurity as rls_enabled,
  relforcesecurity as rls_forced
FROM pg_class
WHERE relname = 'chat_group_messages';

-- 8. Verificar políticas (se existirem)
SELECT 
  '8️⃣ POLÍTICAS' as info,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'chat_group_messages';

-- 9. Verificar grants
SELECT 
  '9️⃣ GRANTS' as info,
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'chat_group_messages';

-- 10. Verificar se a tabela está visível para o PostgREST
SELECT 
  '🔟 VISIBILIDADE POSTGREST' as info,
  schemaname,
  tablename,
  tableowner
FROM information_schema.tables
WHERE table_schema = 'public' 
AND table_name = 'chat_group_messages';