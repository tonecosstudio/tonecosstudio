-- DESABILITAR RLS DA TABELA franchise_rules TEMPORARIAMENTE
-- Use este SQL para testar se o problema é com RLS
-- https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new

-- Desabilitar RLS
ALTER TABLE public.franchise_rules DISABLE ROW LEVEL SECURITY;

-- Verificar se foi desabilitado
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'franchise_rules';

-- Resultado esperado: rls_enabled = false
