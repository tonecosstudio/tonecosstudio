-- DESABILITAR RLS DA TABELA user_roles
-- Esta tabela precisa ser acessível pelas Edge Functions para verificar roles
-- https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new

-- Desabilitar RLS
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- Verificar
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'user_roles';

-- Resultado esperado: rls_enabled = false
