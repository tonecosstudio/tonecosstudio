-- ============================================================================
-- DIAGNÓSTICO COMPLETO: Por que Production Queue está vazia?
-- ============================================================================

-- 1. Verificar se production_queue tem dados
SELECT 'STEP 1: Production Queue Count' as step;
SELECT COUNT(*) as total_production_queue FROM production_queue;

-- 2. Verificar subscription_deliveries do João Trimestral
SELECT 'STEP 2: João Trimestral Deliveries' as step;
SELECT 
  sd.id,
  sd.status,
  sd.created_at,
  p.full_name,
  p.email,
  c.name as collection_name
FROM subscription_deliveries sd
JOIN profiles p ON p.id = sd.user_id
JOIN collections c ON c.id = sd.collection_id
WHERE p.full_name ILIKE '%trimestral%' OR p.email ILIKE '%joao%'
ORDER BY sd.created_at DESC;

-- 3. Verificar se triggers existem
SELECT 'STEP 3: Triggers on subscription_deliveries' as step;
SELECT 
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'subscription_deliveries'
  AND trigger_name LIKE '%production%';

-- 4. Verificar standalone_purchases
SELECT 'STEP 4: Standalone Purchases' as step;
SELECT 
  sp.id,
  sp.status,
  sp.created_at,
  p.full_name,
  p.email
FROM standalone_purchases sp
JOIN profiles p ON p.id = sp.user_id
ORDER BY sp.created_at DESC
LIMIT 5;

-- 5. Verificar manual_payments
SELECT 'STEP 5: Manual Payments' as step;
SELECT 
  mp.id,
  mp.status,
  mp.created_at,
  p.full_name,
  p.email
FROM manual_payments mp
JOIN profiles p ON p.id = mp.user_id
ORDER BY mp.created_at DESC
LIMIT 5;

-- 6. Verificar se função auto_populate_production_queue existe
SELECT 'STEP 6: Function exists' as step;
SELECT 
  proname,
  prosrc LIKE '%auto_populate_production_queue%' as is_correct_function
FROM pg_proc
WHERE proname = 'auto_populate_production_queue';

-- 7. Verificar user_roles para admin
SELECT 'STEP 7: Admin Users' as step;
SELECT 
  ur.user_id,
  p.email,
  p.full_name,
  ur.role
FROM user_roles ur
JOIN profiles p ON p.id = ur.user_id
WHERE ur.role = 'admin';
