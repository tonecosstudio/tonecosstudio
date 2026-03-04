-- ============================================
-- INVESTIGAÇÃO URGENTE: PERDA DE DADOS
-- ============================================
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar TODOS os usuários em auth.users
SELECT 
  '=== USUÁRIOS EM auth.users ===' as info;

SELECT 
  id,
  email,
  created_at,
  deleted_at,
  last_sign_in_at,
  CASE 
    WHEN deleted_at IS NOT NULL THEN '❌ DELETADO'
    ELSE '✅ ATIVO'
  END as status
FROM auth.users
ORDER BY created_at;

-- 2. Verificar profiles
SELECT 
  '=== PROFILES ===' as info;

SELECT 
  p.id,
  p.email,
  p.created_at,
  u.email as auth_email,
  CASE 
    WHEN u.id IS NULL THEN '❌ SEM AUTH USER'
    ELSE '✅ COM AUTH USER'
  END as status
FROM profiles p
LEFT JOIN auth.users u ON u.id = p.id
ORDER BY p.created_at;

-- 3. Verificar subscriptions (assinaturas)
SELECT 
  '=== SUBSCRIPTIONS ===' as info;

SELECT 
  s.id,
  s.user_id,
  s.status,
  s.created_at,
  u.email,
  CASE 
    WHEN u.id IS NULL THEN '❌ USUÁRIO DELETADO'
    ELSE '✅ USUÁRIO EXISTE'
  END as user_status
FROM subscriptions s
LEFT JOIN auth.users u ON u.id = s.user_id
ORDER BY s.created_at;

-- 4. Verificar standalone_purchases (compras avulsas)
SELECT 
  '=== STANDALONE PURCHASES ===' as info;

SELECT 
  sp.id,
  sp.user_id,
  sp.status,
  sp.created_at,
  u.email,
  CASE 
    WHEN u.id IS NULL THEN '❌ USUÁRIO DELETADO'
    ELSE '✅ USUÁRIO EXISTE'
  END as user_status
FROM standalone_purchases sp
LEFT JOIN auth.users u ON u.id = sp.user_id
ORDER BY sp.created_at;

-- 5. Verificar quotes (orçamentos)
SELECT 
  '=== QUOTES ===' as info;

SELECT 
  q.id,
  q.user_id,
  q.status,
  q.created_at,
  u.email,
  CASE 
    WHEN u.id IS NULL THEN '❌ USUÁRIO DELETADO'
    ELSE '✅ USUÁRIO EXISTE'
  END as user_status
FROM quotes q
LEFT JOIN auth.users u ON u.id = q.user_id
ORDER BY q.created_at;

-- 6. Verificar se há CASCADE DELETE configurado
SELECT 
  '=== FOREIGN KEYS COM CASCADE DELETE ===' as info;

SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'users'
  AND rc.delete_rule = 'CASCADE'
ORDER BY tc.table_name;

-- 7. Verificar logs de auditoria (se existir)
SELECT 
  '=== AUDIT LOGS (últimas 50 ações) ===' as info;

SELECT 
  id,
  action,
  table_name,
  record_id,
  user_id,
  created_at,
  changes
FROM audit_logs
ORDER BY created_at DESC
LIMIT 50;
