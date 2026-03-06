-- =====================================================
-- DIAGNÓSTICO: Verificar por que PostgREST não vê a view
-- =====================================================

-- 1. Verificar se a view existe
SELECT 
  schemaname,
  viewname,
  viewowner,
  definition
FROM pg_views 
WHERE viewname = 'system_settings_grouped';

-- 2. Verificar permissões da view
SELECT 
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name = 'system_settings_grouped';

-- 3. Verificar se as roles necessárias existem
SELECT rolname 
FROM pg_roles 
WHERE rolname IN ('authenticated', 'anon', 'authenticator');

-- 4. Verificar se a tabela system_settings existe e tem dados
SELECT 
  COUNT(*) as total_settings,
  COUNT(DISTINCT key) as unique_keys
FROM system_settings;

-- 5. Testar a view diretamente
SELECT * FROM system_settings_grouped;

-- 6. Verificar o schema da view
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'system_settings_grouped'
ORDER BY ordinal_position;
