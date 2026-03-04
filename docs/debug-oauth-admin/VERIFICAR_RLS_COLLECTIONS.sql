-- ============================================
-- VERIFICAR POLÍTICAS RLS DAS TABELAS USADAS NA PÁGINA COLLECTIONS
-- ============================================

-- 1. Verificar políticas da tabela collections
SELECT 
  '=== TABELA: collections ===' as info;

SELECT 
  policyname,
  cmd as operation,
  roles,
  qual as using_expression
FROM pg_policies
WHERE tablename = 'collections'
ORDER BY cmd, policyname;

-- 2. Verificar políticas da tabela collection_characters
SELECT 
  '=== TABELA: collection_characters ===' as info;

SELECT 
  policyname,
  cmd as operation,
  roles,
  qual as using_expression
FROM pg_policies
WHERE tablename = 'collection_characters'
ORDER BY cmd, policyname;

-- 3. Verificar políticas da tabela subscription_plans
SELECT 
  '=== TABELA: subscription_plans ===' as info;

SELECT 
  policyname,
  cmd as operation,
  roles,
  qual as using_expression
FROM pg_policies
WHERE tablename = 'subscription_plans'
ORDER BY cmd, policyname;

-- 4. Verificar políticas da tabela entry_cycles
SELECT 
  '=== TABELA: entry_cycles ===' as info;

SELECT 
  policyname,
  cmd as operation,
  roles,
  qual as using_expression
FROM pg_policies
WHERE tablename = 'entry_cycles'
ORDER BY cmd, policyname;

-- 5. Verificar políticas da tabela system_settings
SELECT 
  '=== TABELA: system_settings ===' as info;

SELECT 
  policyname,
  cmd as operation,
  roles,
  qual as using_expression
FROM pg_policies
WHERE tablename = 'system_settings'
ORDER BY cmd, policyname;

-- 6. Testar queries como usuário anônimo
SELECT 
  '=== TESTE: Buscar collections como anônimo ===' as info;

SET ROLE anon;

SELECT 
  id,
  name,
  slug,
  is_active
FROM collections
WHERE is_active = true
LIMIT 5;

RESET ROLE;

-- 7. Se não houver políticas ou estiverem bloqueando, criar políticas básicas
-- IMPORTANTE: Execute apenas se necessário

-- Permitir leitura pública de collections ativas
DROP POLICY IF EXISTS "public_read_active_collections" ON collections;
CREATE POLICY "public_read_active_collections"
ON collections
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Permitir leitura pública de collection_characters
DROP POLICY IF EXISTS "public_read_collection_characters" ON collection_characters;
CREATE POLICY "public_read_collection_characters"
ON collection_characters
FOR SELECT
TO anon, authenticated
USING (true);

-- Permitir leitura pública de subscription_plans ativos
DROP POLICY IF EXISTS "public_read_active_plans" ON subscription_plans;
CREATE POLICY "public_read_active_plans"
ON subscription_plans
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Permitir leitura pública de entry_cycles
DROP POLICY IF EXISTS "public_read_entry_cycles" ON entry_cycles;
CREATE POLICY "public_read_entry_cycles"
ON entry_cycles
FOR SELECT
TO anon, authenticated
USING (true);

-- Permitir leitura pública de system_settings
DROP POLICY IF EXISTS "public_read_system_settings" ON system_settings;
CREATE POLICY "public_read_system_settings"
ON system_settings
FOR SELECT
TO anon, authenticated
USING (true);
