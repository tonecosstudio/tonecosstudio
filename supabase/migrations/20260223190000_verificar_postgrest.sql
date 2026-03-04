-- =====================================================
-- DIAGNÃƒâ€œSTICO: Por que o PostgREST retorna 406?
-- =====================================================

-- 1. Verificar se a tabela estÃƒÂ¡ no schema correto
SELECT 
  '1Ã¯Â¸ÂÃ¢Æ’Â£ SCHEMA DA TABELA' as check,
  table_schema,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_name = 'chat_group_messages';

-- 2. Verificar se a tabela estÃƒÂ¡ visÃƒÂ­vel para o PostgREST
SELECT 
  '2Ã¯Â¸ÂÃ¢Æ’Â£ VISIBILIDADE POSTGREST' as check,
  c.relname as table_name,
  n.nspname as schema_name,
  c.relrowsecurity as rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'chat_group_messages';

-- 3. Verificar foreign keys que podem causar problemas
SELECT 
  '3Ã¯Â¸ÂÃ¢Æ’Â£ FOREIGN KEYS' as check,
  conname as constraint_name,
  confrelid::regclass as referenced_table,
  confdeltype as on_delete
FROM pg_constraint
WHERE conrelid = 'chat_group_messages'::regclass;

-- 4. Verificar se a tabela referenciada (chat_groups) existe
SELECT 
  '4Ã¯Â¸ÂÃ¢Æ’Â£ TABELA CHAT_GROUPS EXISTE?' as check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'chat_groups')
    THEN 'Ã¢Å“â€¦ Existe'
    ELSE 'Ã¢ÂÅ’ NÃƒÆ’O EXISTE!'
  END as status;

-- 5. Verificar se a tabela referenciada (auth.users) existe
SELECT 
  '5Ã¯Â¸ÂÃ¢Æ’Â£ TABELA AUTH.USERS EXISTE?' as check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'users' AND schemaname = 'auth')
    THEN 'Ã¢Å“â€¦ Existe'
    ELSE 'Ã¢ÂÅ’ NÃƒÆ’O EXISTE!'
  END as status;

-- 6. Verificar triggers na tabela
SELECT 
  '6Ã¯Â¸ÂÃ¢Æ’Â£ TRIGGERS' as check,
  tgname as trigger_name,
  tgenabled as enabled
FROM pg_trigger
WHERE tgrelid = 'chat_group_messages'::regclass;

-- 7. Verificar se hÃƒÂ¡ dados ÃƒÂ³rfÃƒÂ£os (group_id que nÃƒÂ£o existe)
SELECT 
  '7Ã¯Â¸ÂÃ¢Æ’Â£ DADOS Ãƒâ€œRFÃƒÆ’OS' as check,
  COUNT(*) as mensagens_orfas
FROM chat_group_messages m
WHERE NOT EXISTS (
  SELECT 1 FROM chat_groups g WHERE g.id = m.group_id
);

-- 8. Verificar a estrutura exata da tabela
SELECT 
  '8Ã¯Â¸ÂÃ¢Æ’Â£ ESTRUTURA COMPLETA' as check,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'chat_group_messages'
ORDER BY ordinal_position;

-- 9. Verificar polÃƒÂ­ticas ativas
SELECT 
  '9Ã¯Â¸ÂÃ¢Æ’Â£ POLÃƒÂTICAS' as check,
  policyname,
  cmd,
  permissive,
  roles::text
FROM pg_policies
WHERE tablename = 'chat_group_messages';

-- 10. Testar a query diretamente no PostgreSQL
SELECT 
  'Ã°Å¸â€Å¸ TESTE DIRETO NO PG' as check,
  'Executando query...' as status;

-- Esta query deve funcionar diretamente no PG
SELECT created_at 
FROM chat_group_messages 
WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
ORDER BY created_at DESC 
LIMIT 1;

-- 11. Verificar se o problema ÃƒÂ© a foreign key para auth.users
-- Tentar uma query sem a foreign key
SELECT 
  '1Ã¯Â¸ÂÃ¢Æ’Â£1Ã¯Â¸ÂÃ¢Æ’Â£ TESTE SEM FOREIGN KEY' as check,
  COUNT(*) as total
FROM chat_group_messages;

-- 12. Verificar se hÃƒÂ¡ alguma funÃƒÂ§ÃƒÂ£o ou extensÃƒÂ£o problemÃƒÂ¡tica
SELECT 
  '1Ã¯Â¸ÂÃ¢Æ’Â£2Ã¯Â¸ÂÃ¢Æ’Â£ EXTENSÃƒâ€¢ES' as check,
  extname,
  extversion
FROM pg_extension
WHERE extname IN ('pgcrypto', 'uuid-ossp');

-- 13. Verificar o owner da tabela
SELECT 
  '1Ã¯Â¸ÂÃ¢Æ’Â£3Ã¯Â¸ÂÃ¢Æ’Â£ OWNER' as check,
  relname,
  rolname as owner
FROM pg_class c
JOIN pg_roles r ON r.oid = c.relowner
WHERE c.relname = 'chat_group_messages';

-- 14. Verificar grants
SELECT 
  '1Ã¯Â¸ÂÃ¢Æ’Â£4Ã¯Â¸ÂÃ¢Æ’Â£ GRANTS' as check,
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.table_privileges
WHERE table_name = 'chat_group_messages';

-- 15. Resumo
SELECT 
  'Ã°Å¸â€œÅ  RESUMO' as titulo,
  'Execute este script no SQL Editor do Supabase' as instrucao,
  'Copie todos os resultados e compartilhe' as instrucao2,
  'Isso vai revelar exatamente o que estÃƒÂ¡ acontecendo' as instrucao3;