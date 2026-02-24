-- =====================================================
-- VERIFICAÇÃO COMPLETA: Tabela chat_group_messages
-- =====================================================

-- 1. Verificar se a tabela existe
SELECT 
  table_schema,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_name = 'chat_group_messages';

-- 2. Verificar colunas da tabela
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'chat_group_messages'
ORDER BY ordinal_position;

-- 3. Verificar se a coluna created_at existe especificamente
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'chat_group_messages'
AND column_name = 'created_at';

-- 4. Verificar se há dados na tabela
SELECT COUNT(*) as total_rows
FROM chat_group_messages;

-- 5. Tentar fazer a query exata que está falhando
SELECT created_at
FROM chat_group_messages
WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
ORDER BY created_at DESC
LIMIT 1;

-- 6. Verificar se a tabela está no schema público
SELECT schemaname, tablename
FROM pg_tables
WHERE tablename = 'chat_group_messages';

-- 7. Verificar permissões da tabela
SELECT 
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'chat_group_messages';

-- 8. Verificar se PostgREST pode acessar a tabela
SELECT 
  n.nspname as schema,
  c.relname as table_name,
  c.relkind as type
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'chat_group_messages';
