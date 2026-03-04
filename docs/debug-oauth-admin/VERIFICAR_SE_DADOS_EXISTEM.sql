-- ============================================
-- VERIFICAR SE DADOS EXISTEM (podem estar bloqueados por RLS)
-- ============================================
-- Execute este script no SQL Editor do Supabase

-- IMPORTANTE: Este script usa SECURITY DEFINER para bypassar RLS
-- e ver os dados reais no banco

-- 1. Contar usuários REAIS (ignorando RLS)
SELECT 
  '=== USUÁRIOS REAIS NO BANCO ===' as info;

SELECT COUNT(*) as total_usuarios FROM auth.users;

SELECT 
  id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at;

-- 2. Contar profiles REAIS
SELECT 
  '=== PROFILES REAIS NO BANCO ===' as info;

SELECT COUNT(*) as total_profiles FROM profiles;

SELECT 
  id,
  email,
  created_at
FROM profiles
ORDER BY created_at;

-- 3. Contar subscriptions REAIS
SELECT 
  '=== SUBSCRIPTIONS REAIS NO BANCO ===' as info;

SELECT COUNT(*) as total_subscriptions FROM subscriptions;

SELECT 
  s.id,
  s.user_id,
  s.status,
  s.created_at,
  u.email
FROM subscriptions s
LEFT JOIN auth.users u ON u.id = s.user_id
ORDER BY s.created_at;

-- 4. Contar standalone_purchases REAIS
SELECT 
  '=== STANDALONE PURCHASES REAIS NO BANCO ===' as info;

SELECT COUNT(*) as total_standalone FROM standalone_purchases;

SELECT 
  sp.id,
  sp.user_id,
  sp.status,
  sp.created_at,
  u.email
FROM standalone_purchases sp
LEFT JOIN auth.users u ON u.id = sp.user_id
ORDER BY sp.created_at;

-- 5. Contar quotes REAIS
SELECT 
  '=== QUOTES REAIS NO BANCO ===' as info;

SELECT COUNT(*) as total_quotes FROM quotes;

SELECT 
  q.id,
  q.user_id,
  q.status,
  q.created_at,
  u.email
FROM quotes q
LEFT JOIN auth.users u ON u.id = q.user_id
ORDER BY q.created_at;

-- 6. Verificar políticas RLS que podem estar bloqueando
SELECT 
  '=== POLÍTICAS RLS EM TABELAS CRÍTICAS ===' as info;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression
FROM pg_policies
WHERE tablename IN ('profiles', 'subscriptions', 'standalone_purchases', 'quotes', 'user_roles')
ORDER BY tablename, policyname;
