-- VERIFICAR TUDO NO BANCO
-- Execute e me mostre o resultado completo
-- https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new

-- 1. Verificar TODAS as tabelas que as funções precisam
SELECT 'TABELAS NECESSÁRIAS:' as info;
SELECT table_name, 
       CASE WHEN table_name IN ('images_queue', 'models', 'franchises', 'franchise_rules', 'ai_name_cache', 'user_roles') 
            THEN '✅ EXISTE' 
            ELSE '❌ FALTA' 
       END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('images_queue', 'models', 'franchises', 'franchise_rules', 'ai_name_cache', 'user_roles')
ORDER BY table_name;

-- 2. Verificar se ai_name_cache existe (CRÍTICO!)
SELECT 'TABELA ai_name_cache:' as info;
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'ai_name_cache'
) as existe;

-- 3. Se ai_name_cache não existir, criar agora
CREATE TABLE IF NOT EXISTS public.ai_name_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL UNIQUE,
  franchise text,
  category text,
  subcategory text,
  tags text[] NOT NULL DEFAULT '{}',
  model text NOT NULL DEFAULT 'openai/gpt-4o-mini'
);

-- 4. Desabilitar RLS de ai_name_cache também
ALTER TABLE IF EXISTS public.ai_name_cache DISABLE ROW LEVEL SECURITY;

-- 5. Verificar RLS de TODAS as tabelas
SELECT 'STATUS RLS DE TODAS AS TABELAS:' as info;
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '❌ HABILITADO (pode causar erro)' ELSE '✅ DESABILITADO' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('images_queue', 'models', 'franchises', 'franchise_rules', 'ai_name_cache', 'user_roles')
ORDER BY tablename;

-- 6. Contar registros em cada tabela
SELECT 'CONTAGEM DE REGISTROS:' as info;
SELECT 'images_queue' as tabela, COUNT(*) as total FROM public.images_queue
UNION ALL
SELECT 'models', COUNT(*) FROM public.models
UNION ALL
SELECT 'franchises', COUNT(*) FROM public.franchises
UNION ALL
SELECT 'franchise_rules', COUNT(*) FROM public.franchise_rules
UNION ALL
SELECT 'ai_name_cache', COUNT(*) FROM public.ai_name_cache;
