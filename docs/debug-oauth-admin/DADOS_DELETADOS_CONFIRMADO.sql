-- ============================================
-- CONFIRMADO: DADOS FORAM DELETADOS
-- ============================================
-- Execute este script para investigar

-- 1. Verificar TODOS os usuários em auth.users
SELECT 
  '=== USUÁRIOS EM auth.users ===' as info;

SELECT 
  id,
  email,
  created_at,
  last_sign_in_at,
  deleted_at
FROM auth.users
ORDER BY created_at;

SELECT COUNT(*) as total_usuarios FROM auth.users;

-- 2. Verificar se há usuários deletados (soft delete)
SELECT 
  '=== USUÁRIOS DELETADOS (soft delete) ===' as info;

SELECT 
  id,
  email,
  created_at,
  deleted_at
FROM auth.users
WHERE deleted_at IS NOT NULL;

-- 3. Verificar profiles órfãos (sem auth.users)
SELECT 
  '=== PROFILES ÓRFÃOS ===' as info;

SELECT 
  p.id,
  p.email,
  p.created_at
FROM profiles p
LEFT JOIN auth.users u ON u.id = p.id
WHERE u.id IS NULL;

-- 4. Verificar subscriptions órfãs
SELECT 
  '=== SUBSCRIPTIONS ÓRFÃS ===' as info;

SELECT 
  s.id,
  s.user_id,
  s.status,
  s.created_at
FROM subscriptions s
LEFT JOIN auth.users u ON u.id = s.user_id
WHERE u.id IS NULL;

-- 5. Verificar standalone_purchases órfãs
SELECT 
  '=== STANDALONE PURCHASES ÓRFÃS ===' as info;

SELECT 
  sp.id,
  sp.user_id,
  sp.status,
  sp.created_at
FROM standalone_purchases sp
LEFT JOIN auth.users u ON u.id = sp.user_id
WHERE u.id IS NULL;

-- 6. Verificar quotes órfãos
SELECT 
  '=== QUOTES ÓRFÃOS ===' as info;

SELECT 
  q.id,
  q.user_id,
  q.status,
  q.created_at
FROM quotes q
LEFT JOIN auth.users u ON u.id = q.user_id
WHERE u.id IS NULL;

-- 7. Verificar CASCADE DELETE configurado
SELECT 
  '=== TABELAS COM CASCADE DELETE PARA auth.users ===' as info;

SELECT 
  tc.table_name,
  kcu.column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_schema = 'auth'
  AND ccu.table_name = 'users'
  AND rc.delete_rule = 'CASCADE'
ORDER BY tc.table_name;
