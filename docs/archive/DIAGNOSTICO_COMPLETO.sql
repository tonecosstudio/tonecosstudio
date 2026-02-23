-- DIAGNÓSTICO COMPLETO DO BANCO
-- Execute no SQL Editor: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new

-- ============================================
-- 1. VERIFICAR TABELAS
-- ============================================
SELECT 'TABELAS EXISTENTES:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('images_queue', 'models', 'franchises', 'franchise_rules', 'ai_name_cache', 'user_roles')
ORDER BY table_name;

-- ============================================
-- 2. VERIFICAR COLUNAS DE images_queue
-- ============================================
SELECT 'COLUNAS DE images_queue:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'images_queue'
ORDER BY ordinal_position;

-- ============================================
-- 3. VERIFICAR COLUNAS DE franchise_rules
-- ============================================
SELECT 'COLUNAS DE franchise_rules:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'franchise_rules'
ORDER BY ordinal_position;

-- ============================================
-- 4. VERIFICAR FUNÇÕES
-- ============================================
SELECT 'FUNÇÕES EXISTENTES:' as info;
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('has_role', 'set_updated_at')
ORDER BY routine_name;

-- ============================================
-- 5. VERIFICAR POLÍTICAS RLS
-- ============================================
SELECT 'POLÍTICAS RLS DE franchise_rules:' as info;
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'franchise_rules';

-- ============================================
-- 6. VERIFICAR SE RLS ESTÁ ATIVO
-- ============================================
SELECT 'STATUS RLS:' as info;
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('images_queue', 'franchise_rules', 'models', 'franchises');

-- ============================================
-- 7. VERIFICAR EXTENSÕES
-- ============================================
SELECT 'EXTENSÕES INSTALADAS:' as info;
SELECT extname, extversion
FROM pg_extension
WHERE extname IN ('pg_trgm', 'uuid-ossp');

-- ============================================
-- 8. TESTAR ACESSO À franchise_rules
-- ============================================
SELECT 'TESTE DE ACESSO franchise_rules:' as info;
SELECT COUNT(*) as total_rows
FROM public.franchise_rules;

-- ============================================
-- 9. VERIFICAR TRIGGERS
-- ============================================
SELECT 'TRIGGERS DE franchise_rules:' as info;
SELECT 
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'franchise_rules';
