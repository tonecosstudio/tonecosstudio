-- =====================================================
-- VERIFICAÃƒâ€¡ÃƒÆ’O FINAL: A tabela existe?
-- =====================================================

-- 1. A tabela existe?
SELECT 
  '1Ã¯Â¸ÂÃ¢Æ’Â£ TABELA EXISTE?' as check,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'chat_group_messages'
    ) THEN 'Ã¢Å“â€¦ SIM'
    ELSE 'Ã¢ÂÅ’ NÃƒÆ’O!'
  END as status;

-- 2. Se existe, qual ÃƒÂ© a estrutura?
SELECT 
  '2Ã¯Â¸ÂÃ¢Æ’Â£ ESTRUTURA' as check,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'chat_group_messages'
ORDER BY ordinal_position;

-- 3. Tem dados?
SELECT 
  '3Ã¯Â¸ÂÃ¢Æ’Â£ DADOS' as check,
  COUNT(*) as total_rows
FROM chat_group_messages;

-- 4. Tem primary key?
SELECT 
  '4Ã¯Â¸ÂÃ¢Æ’Â£ PRIMARY KEY' as check,
  a.attname as column_name
FROM pg_index i
JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
WHERE i.indrelid = 'chat_group_messages'::regclass
AND i.indisprimary;

-- 5. Quais sÃƒÂ£o as polÃƒÂ­ticas?
SELECT 
  '5Ã¯Â¸ÂÃ¢Æ’Â£ POLÃƒÂTICAS' as check,
  policyname,
  cmd,
  permissive,
  roles::text
FROM pg_policies
WHERE tablename = 'chat_group_messages';

-- 6. Quais sÃƒÂ£o os grants?
SELECT 
  '6Ã¯Â¸ÂÃ¢Æ’Â£ GRANTS' as check,
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'chat_group_messages';

-- 7. RLS estÃƒÂ¡ habilitado?
SELECT 
  '7Ã¯Â¸ÂÃ¢Æ’Â£ RLS' as check,
  relname,
  relrowsecurity as rls_enabled
FROM pg_class
WHERE relname = 'chat_group_messages';

-- 8. FAZER UM TESTE DIRETO - isso deve funcionar!
SELECT 
  '8Ã¯Â¸ÂÃ¢Æ’Â£ TESTE DIRETO' as check,
  'Executando query direta...' as status;

-- Esta query deve funcionar diretamente no PostgreSQL
SELECT 
  id,
  group_id,
  created_at
FROM chat_group_messages
LIMIT 1;

-- 9. Comparar com outra tabela que funciona
SELECT 
  '9Ã¯Â¸ÂÃ¢Æ’Â£ COMPARAÃƒâ€¡ÃƒÆ’O' as check,
  'Verificando se hÃƒÂ¡ outras tabelas de chat...' as status;

SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE '%chat%'
ORDER BY tablename;

-- 10. Verificar se hÃƒÂ¡ algum problema com a tabela
SELECT 
  'Ã°Å¸â€Å¸ PROBLEMAS?' as check,
  'Se todas as verificaÃƒÂ§ÃƒÂµes acima passaram Ã¢Å“â€¦,' as info_1,
  'mas a API ainda retorna 406,' as info_2,
  'o problema estÃƒÂ¡ no PostgREST ou no cache do Supabase.' as info_3;