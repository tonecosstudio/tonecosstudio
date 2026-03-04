-- ============================================
-- DIAGNÓSTICO COMPLETO DO PROBLEMA DE ADMIN
-- ============================================
-- Execute este script no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new

-- PASSO 1: Verificar todos os usuários cadastrados
SELECT 
  '=== USUÁRIOS CADASTRADOS ===' as info;

SELECT 
  id,
  email,
  created_at,
  last_sign_in_at,
  CASE 
    WHEN last_sign_in_at IS NOT NULL THEN 'Já fez login'
    ELSE 'Nunca fez login'
  END as status_login
FROM auth.users
ORDER BY created_at DESC;

-- PASSO 2: Verificar roles existentes
SELECT 
  '=== ROLES EXISTENTES ===' as info;

SELECT 
  COUNT(*) as total_roles
FROM public.user_roles;

SELECT 
  ur.id,
  ur.user_id,
  ur.role,
  u.email,
  u.last_sign_in_at
FROM public.user_roles ur
LEFT JOIN auth.users u ON u.id = ur.user_id
ORDER BY ur.role, u.email;

-- PASSO 3: Verificar se a função has_role existe e funciona
SELECT 
  '=== TESTE DA FUNÇÃO has_role ===' as info;

SELECT 
  proname as function_name,
  prosrc as function_body
FROM pg_proc
WHERE proname = 'has_role';

-- PASSO 4: Verificar RLS na tabela user_roles
SELECT 
  '=== POLÍTICAS RLS EM user_roles ===' as info;

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
WHERE tablename = 'user_roles'
ORDER BY policyname;

-- PASSO 5: Verificar se há triggers que podem estar interferindo
SELECT 
  '=== TRIGGERS EM user_roles ===' as info;

SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'user_roles';
