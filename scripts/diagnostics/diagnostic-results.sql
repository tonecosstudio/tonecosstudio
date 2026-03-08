-- ============================================================================
-- DIAGNOSTICO: Página de Pedidos
-- Execute este arquivo no Supabase SQL Editor
-- ============================================================================

-- 1. Verificar subscription_deliveries
SELECT 'SUBSCRIPTION_DELIVERIES' as tabela, COUNT(*) as total FROM subscription_deliveries;

-- 2. Verificar subscriptions
SELECT 'SUBSCRIPTIONS' as tabela, 
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as ativas,
  COUNT(CASE WHEN status = 'pending_payment' THEN 1 END) as pendentes
FROM subscriptions;

-- 3. Verificar standalone_purchases
SELECT 'STANDALONE_PURCHASES' as tabela, COUNT(*) as total FROM standalone_purchases;

-- 4. Verificar manual_payments
SELECT 'MANUAL_PAYMENTS' as tabela, COUNT(*) as total FROM manual_payments;

-- 5. Se subscription_deliveries = 0, verificar se há assinaturas ativas sem entregas
SELECT 
  'ASSINATURAS_SEM_ENTREGAS' as problema,
  s.id as subscription_id,
  s.status,
  s.plan_type,
  s.created_at
FROM subscriptions s
LEFT JOIN subscription_deliveries sd ON sd.subscription_id = s.id
WHERE s.status = 'active'
AND sd.id IS NULL
LIMIT 5;

-- 6. Verificar se há entregas mas com dados incompletos
SELECT 
  'ENTREGAS_DADOS_INCOMPLETOS' as problema,
  sd.id as delivery_id,
  sd.subscription_id,
  s.user_id,
  p.id as profile_exists,
  s.collection_id,
  c.id as collection_exists
FROM subscription_deliveries sd
INNER JOIN subscriptions s ON s.id = sd.subscription_id
LEFT JOIN profiles p ON p.id = s.user_id
LEFT JOIN collections c ON c.id = s.collection_id
WHERE p.id IS NULL OR (s.collection_id IS NOT NULL AND c.id IS NULL)
LIMIT 5;
