-- =====================================================
-- EXPOR TABELA NA API DO SUPABASE
-- =====================================================
-- Problema: Tabela não está exposta na API (causa do erro 406)
-- Solução: Expor a tabela usando o sistema de grants do PostgreSQL
-- =====================================================

-- 1. Verificar grants atuais
SELECT 
  '1️⃣ GRANTS ATUAIS' as status,
  grantee,
  privilege_type,
  table_name
FROM information_schema.table_privileges
WHERE table_name = 'chat_group_messages';

-- 2. Conceder acesso ao role 'anon' (necessário para API pública)
GRANT SELECT ON chat_group_messages TO anon, authenticated, postgres;

-- 3. Conceder acesso ao role 'authenticated' (usuários logados)
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_group_messages TO authenticated;

-- 4. Verificar se a tabela está visível
SELECT 
  '2️⃣ TABELA VISÍVEL' as status,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'chat_group_messages';

-- 5. Verificar políticas RLS
SELECT 
  '3️⃣ POLÍTICAS RLS' as status,
  policyname,
  cmd,
  permissive,
  roles::text
FROM pg_policies
WHERE tablename = 'chat_group_messages';

-- 6. Teste: a tabela deve responder a queries
SELECT 
  '4️⃣ TESTE DE ACESSO' as status,
  COUNT(*) as total_rows
FROM chat_group_messages;

-- 7. Instruções para o Dashboard do Supabase
SELECT 
  '📋 INSTRUÇÕES' as titulo,
  '' as espaco,
  'Se o erro 406 persistir, faça manualmente no Dashboard:' as passo_1,
  '' as espaco2,
  '1. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud' as url,
  '2. Vá em: Database > Tables' as passo_2,
  '3. Procure por: chat_group_messages' as passo_3,
  '4. Clique na tabela' as passo_4,
  '5. Verifique se há um toggle "Enable API" ou "Expose via API"' as passo_5,
  '6. Se estiver OFF, clique para habilitar' as passo_6,
  '' as espaco3,
  'OU use o SQL Editor:' as alternativa,
  '1. Vá em: SQL Editor' as alt_1,
  '2. Execute: ALTER TABLE chat_group_messages ENABLE ROW LEVEL SECURITY;' as alt_2,
  '3. Execute: CREATE POLICY "Enable all access" ON chat_group_messages FOR ALL TO postgres USING (true) WITH CHECK (true);' as alt_3;