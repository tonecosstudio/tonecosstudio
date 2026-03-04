-- Script de debug completo para identificar o problema

-- 1. Verificar todos os triggers na tabela auth.users
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
AND event_object_schema = 'auth';

-- 2. Verificar todas as funções que podem estar causando problema
SELECT 
  routine_name,
  routine_type,
  security_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%profile%';

-- 3. Verificar políticas RLS na tabela profiles
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
WHERE tablename = 'profiles';

-- 4. Verificar se há constraints problemáticas
SELECT
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass;

-- 5. Verificar permissões na tabela profiles
SELECT 
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name = 'profiles';

-- 6. Verificar se há outros triggers que podem estar interferindo
SELECT 
  trigger_name,
  event_object_schema,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE action_statement LIKE '%profile%'
OR trigger_name LIKE '%profile%';
