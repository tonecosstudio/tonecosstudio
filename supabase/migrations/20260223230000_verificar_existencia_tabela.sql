-- =====================================================
-- VERIFICAÇÃO FINAL: A tabela existe?
-- =====================================================

-- 1. A tabela existe?
SELECT 
  '1️⃣ TABELA EXISTE?' as check,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'chat_group_messages'
    ) THEN '✅ SIM'
    ELSE '❌ NÃO!'
  END as status;

-- 2. Se existe, qual é a estrutura?
SELECT 
  '2️⃣ ESTRUTURA' as check,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'chat_group_messages'
ORDER BY ordinal_position;

-- 3. Tem dados?
SELECT 
  '3️⃣ DADOS' as check,
  COUNT(*) as total_rows
FROM chat_group_messages;

-- 4. Tem primary key?
SELECT 
  '4️⃣ PRIMARY KEY' as check,
  a.attname as column_name
FROM pg_index i
JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
WHERE i.indrelid = 'chat_group_messages'::regclass
AND i.indisprimary;

-- 5. Quais são as políticas?
SELECT 
  '5️⃣ POLÍTICAS' as check,
  policyname,
  cmd,
  permissive,
  roles::text
FROM pg_policies
WHERE tablename = 'chat_group_messages';

-- 6. Quais são os grants?
SELECT 
  '6️⃣ GRANTS' as check,
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'chat_group_messages';

-- 7. RLS está habilitado?
SELECT 
  '7️⃣ RLS' as check,
  relname,
  relrowsecurity as rls_enabled
FROM pg_class
WHERE relname = 'chat_group_messages';

-- 8. FAZER UM TESTE DIRETO - isso deve funcionar!
SELECT 
  '8️⃣ TESTE DIRETO' as check,
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
  '9️⃣ COMPARAÇÃO' as check,
  'Verificando se há outras tabelas de chat...' as status;

SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE '%chat%'
ORDER BY tablename;

-- 10. Verificar se há algum problema com a tabela
SELECT 
  '🔟 PROBLEMAS?' as check,
  'Se todas as verificações acima passaram ✅,' as info_1,
  'mas a API ainda retorna 406,' as info_2,
  'o problema está no PostgREST ou no cache do Supabase.' as info_3;