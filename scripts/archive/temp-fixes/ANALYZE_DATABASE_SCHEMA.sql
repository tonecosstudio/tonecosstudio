-- =====================================================
-- ANÁLISE COMPLETA DO SCHEMA DO BANCO DE DADOS
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- =====================================================
-- 1. LISTAR TODAS AS TABELAS
-- =====================================================
SELECT 
  '=== TABELAS DO BANCO ===' AS section,
  '' AS table_name,
  '' AS row_count,
  '' AS description;

SELECT 
  'TABLE' AS section,
  schemaname || '.' || tablename AS table_name,
  (SELECT COUNT(*) FROM pg_class WHERE relname = tablename AND relkind = 'r')::text AS row_count,
  obj_description((schemaname || '.' || tablename)::regclass, 'pg_class') AS description
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- =====================================================
-- 2. LISTAR TODAS AS VIEWS
-- =====================================================
SELECT 
  '=== VIEWS DO BANCO ===' AS section,
  '' AS view_name,
  '' AS definition;

SELECT 
  'VIEW' AS section,
  schemaname || '.' || viewname AS view_name,
  LEFT(definition, 100) || '...' AS definition
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;

-- =====================================================
-- 3. LISTAR MATERIALIZED VIEWS
-- =====================================================
SELECT 
  '=== MATERIALIZED VIEWS ===' AS section,
  '' AS matview_name,
  '' AS definition;

SELECT 
  'MATVIEW' AS section,
  schemaname || '.' || matviewname AS matview_name,
  LEFT(definition, 100) || '...' AS definition
FROM pg_matviews
WHERE schemaname = 'public'
ORDER BY matviewname;

-- =====================================================
-- 4. LISTAR TODAS AS FUNÇÕES
-- =====================================================
SELECT 
  '=== FUNÇÕES DO BANCO ===' AS section,
  '' AS function_name,
  '' AS return_type;

SELECT 
  'FUNCTION' AS section,
  proname AS function_name,
  pg_get_function_result(oid) AS return_type
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND prokind = 'f'
ORDER BY proname;

-- =====================================================
-- 5. LISTAR TODOS OS TRIGGERS
-- =====================================================
SELECT 
  '=== TRIGGERS DO BANCO ===' AS section,
  '' AS trigger_name,
  '' AS table_name,
  '' AS function_name;

SELECT 
  'TRIGGER' AS section,
  tgname AS trigger_name,
  tgrelid::regclass::text AS table_name,
  tgfoid::regproc::text AS function_name
FROM pg_trigger
WHERE tgisinternal = false
ORDER BY tgname;

-- =====================================================
-- 6. DETALHES DAS TABELAS DE PRODUÇÃO
-- =====================================================
SELECT 
  '=== TABELAS DE PRODUÇÃO (DETALHES) ===' AS section;

-- production_queue
SELECT 
  'production_queue' AS table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'production_queue'
ORDER BY ordinal_position;

-- character_choices
SELECT 
  'character_choices' AS table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'character_choices'
ORDER BY ordinal_position;

-- production_stages
SELECT 
  'production_stages' AS table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'production_stages'
ORDER BY ordinal_position;

-- =====================================================
-- 7. CONSTRAINTS E INDEXES
-- =====================================================
SELECT 
  '=== CONSTRAINTS ===' AS section;

SELECT 
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
  AND conrelid::regclass::text LIKE '%production%'
ORDER BY conrelid::regclass::text, conname;

SELECT 
  '=== INDEXES ===' AS section;

SELECT 
  indexname AS index_name,
  tablename AS table_name,
  indexdef AS definition
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename LIKE '%production%'
ORDER BY tablename, indexname;

-- =====================================================
-- 8. RLS POLICIES
-- =====================================================
SELECT 
  '=== ROW LEVEL SECURITY POLICIES ===' AS section;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE '%production%'
ORDER BY tablename, policyname;

-- =====================================================
-- 9. CONTAGEM DE REGISTROS
-- =====================================================
SELECT 
  '=== CONTAGEM DE REGISTROS ===' AS section;

SELECT 
  'production_queue' AS table_name,
  COUNT(*) AS record_count,
  COUNT(*) FILTER (WHERE production_status = 'awaiting_choice') AS awaiting_choice,
  COUNT(*) FILTER (WHERE production_status = 'ready_for_production') AS ready,
  COUNT(*) FILTER (WHERE production_status = 'in_production') AS in_production,
  COUNT(*) FILTER (WHERE production_status = 'completed') AS completed
FROM production_queue;

SELECT 
  'character_choices' AS table_name,
  COUNT(*) AS record_count,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending,
  COUNT(*) FILTER (WHERE status = 'submitted') AS submitted,
  COUNT(*) FILTER (WHERE status = 'approved') AS approved
FROM character_choices;

SELECT 
  'production_stages' AS table_name,
  COUNT(*) AS record_count,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending,
  COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed
FROM production_stages;

-- =====================================================
-- 10. HISTÓRICO DE MIGRAÇÕES
-- =====================================================
SELECT 
  '=== HISTÓRICO DE MIGRAÇÕES ===' AS section;

SELECT 
  version,
  name,
  executed_at
FROM supabase_migrations.schema_migrations
WHERE version LIKE '202604280000%'
ORDER BY version;
