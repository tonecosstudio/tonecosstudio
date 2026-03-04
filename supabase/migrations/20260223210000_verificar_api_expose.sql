-- =====================================================
-- VERIFICAR SE A TABELA ESTÃƒÂ EXPOSTA NA API
-- =====================================================

-- 1. Verificar se a tabela estÃƒÂ¡ no schema public
SELECT 
  '1Ã¯Â¸ÂÃ¢Æ’Â£ SCHEMA' as check,
  table_schema,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_name = 'chat_group_messages';

-- 2. Verificar se a tabela tem dados
SELECT 
  '2Ã¯Â¸ÂÃ¢Æ’Â£ DADOS' as check,
  COUNT(*) as total_rows
FROM chat_group_messages;

-- 3. Verificar a estrutura da tabela
SELECT 
  '3Ã¯Â¸ÂÃ¢Æ’Â£ ESTRUTURA' as check,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'chat_group_messages'
ORDER BY ordinal_position;

-- 4. Verificar se a tabela tem primary key
SELECT 
  '4Ã¯Â¸ÂÃ¢Æ’Â£ PRIMARY KEY' as check,
  a.attname as column_name
FROM pg_index i
JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
WHERE i.indrelid = 'chat_group_messages'::regclass
AND i.indisprimary;

-- 5. Verificar polÃƒÂ­ticas
SELECT 
  '5Ã¯Â¸ÂÃ¢Æ’Â£ POLÃƒÂTICAS' as check,
  policyname,
  cmd,
  permissive,
  roles::text
FROM pg_policies
WHERE tablename = 'chat_group_messages';

-- 6. Verificar grants
SELECT 
  '6Ã¯Â¸ÂÃ¢Æ’Â£ GRANTS' as check,
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'chat_group_messages';

-- 7. Teste: fazer uma query direta
SELECT 
  '7Ã¯Â¸ÂÃ¢Æ’Â£ TESTE DIRETO' as check,
  'Tentando query direta...' as status;

SELECT 
  id,
  group_id,
  created_at
FROM chat_group_messages
LIMIT 1;

-- 8. Verificar todas as tabelas expostas
SELECT 
  '8Ã¯Â¸ÂÃ¢Æ’Â£ TODAS AS TABELAS' as check,
  tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 9. Verificar RLS status
SELECT 
  '9Ã¯Â¸ÂÃ¢Æ’Â£ RLS STATUS' as check,
  relname,
  relrowsecurity as rls_enabled
FROM pg_class
WHERE relname = 'chat_group_messages';

-- 10. Resumo
SELECT 
  'Ã°Å¸â€œÅ  INSTRUÃƒâ€¡Ãƒâ€¢ES' as titulo,
  'Se a query direta (passo 7) funcionou mas a API retorna 406,' as info_1,
  'o problema estÃƒÂ¡ na configuraÃƒÂ§ÃƒÂ£o do PostgREST.' as info_2,
  '' as espaco,
  'Verifique no Dashboard do Supabase:' as info_3,
  '- API Settings > Exposed Tables' as info_4,
  '- Table Editor > chat_group_messages > Enable API' as info_5;