-- ============================================================================
-- ANÁLISE COMPLETA DA ESTRUTURA DO SUPABASE
-- ============================================================================
-- Este script extrai todas as informações sobre o banco de dados atual
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================================================

-- 1. LISTAR TODAS AS TABELAS E SUAS DESCRIÇÕES
-- ============================================================================
SELECT 
    '=== TABELAS ===' as section,
    schemaname as schema,
    tablename as table_name,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY schemaname, tablename;

-- 2. DETALHES DAS COLUNAS DE CADA TABELA
-- ============================================================================
SELECT 
    '=== COLUNAS ===' as section,
    table_schema,
    table_name,
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY table_schema, table_name, ordinal_position;

-- 3. CHAVES PRIMÁRIAS
-- ============================================================================
SELECT 
    '=== PRIMARY KEYS ===' as section,
    tc.table_schema,
    tc.table_name,
    kcu.column_name,
    tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY tc.table_schema, tc.table_name;

-- 4. CHAVES ESTRANGEIRAS (FOREIGN KEYS)
-- ============================================================================
SELECT 
    '=== FOREIGN KEYS ===' as section,
    tc.table_schema,
    tc.table_name,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY tc.table_schema, tc.table_name, kcu.column_name;

-- 5. ÍNDICES
-- ============================================================================
SELECT 
    '=== INDEXES ===' as section,
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY schemaname, tablename, indexname;

-- 6. POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ============================================================================
SELECT 
    '=== RLS POLICIES ===' as section,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY schemaname, tablename, policyname;

-- 7. VERIFICAR SE RLS ESTÁ HABILITADO
-- ============================================================================
SELECT 
    '=== RLS STATUS ===' as section,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY schemaname, tablename;

-- 8. FUNÇÕES CUSTOMIZADAS
-- ============================================================================
SELECT 
    '=== FUNCTIONS ===' as section,
    n.nspname as schema,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY n.nspname, p.proname;

-- 9. TRIGGERS
-- ============================================================================
SELECT 
    '=== TRIGGERS ===' as section,
    trigger_schema,
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE trigger_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY trigger_schema, event_object_table, trigger_name;

-- 10. VIEWS
-- ============================================================================
SELECT 
    '=== VIEWS ===' as section,
    table_schema,
    table_name as view_name,
    view_definition
FROM information_schema.views
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY table_schema, table_name;

-- 11. CONSTRAINTS (UNIQUE, CHECK, etc)
-- ============================================================================
SELECT 
    '=== CONSTRAINTS ===' as section,
    tc.table_schema,
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema NOT IN ('pg_catalog', 'information_schema')
    AND tc.constraint_type NOT IN ('PRIMARY KEY', 'FOREIGN KEY')
ORDER BY tc.table_schema, tc.table_name, tc.constraint_type;

-- 12. ENUMS (TIPOS CUSTOMIZADOS)
-- ============================================================================
SELECT 
    '=== ENUMS ===' as section,
    n.nspname as schema,
    t.typname as enum_name,
    e.enumlabel as enum_value,
    e.enumsortorder as sort_order
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON t.typnamespace = n.oid
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY n.nspname, t.typname, e.enumsortorder;

-- 13. STORAGE BUCKETS (se existirem)
-- ============================================================================
SELECT 
    '=== STORAGE BUCKETS ===' as section,
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets
ORDER BY name;

-- 14. MIGRAÇÕES APLICADAS (se usar schema migrations)
-- ============================================================================
SELECT 
    '=== MIGRATIONS ===' as section,
    *
FROM supabase_migrations.schema_migrations
ORDER BY version;

-- 15. ESTATÍSTICAS DAS TABELAS
-- ============================================================================
SELECT 
    '=== TABLE STATS ===' as section,
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as indexes_size,
    (SELECT count(*) FROM information_schema.columns WHERE table_schema = schemaname AND table_name = tablename) as column_count
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
