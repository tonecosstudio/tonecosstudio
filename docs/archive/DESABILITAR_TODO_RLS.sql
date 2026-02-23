-- DESABILITAR RLS DE TODAS AS TABELAS
-- Execute este SQL para garantir que nenhuma tabela está bloqueando as funções
-- https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new

-- Desabilitar RLS de TODAS as tabelas que as funções usam
ALTER TABLE IF EXISTS public.images_queue DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.models DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.franchises DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.franchise_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_name_cache DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_vision_cache DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_processing_jobs DISABLE ROW LEVEL SECURITY;

-- Verificar status final
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '❌ AINDA HABILITADO' ELSE '✅ DESABILITADO' END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'images_queue', 
    'models', 
    'franchises', 
    'franchise_rules', 
    'ai_name_cache', 
    'user_roles',
    'ai_vision_cache',
    'ai_processing_jobs'
  )
ORDER BY tablename;

-- Resultado esperado: TODAS com status ✅ DESABILITADO
