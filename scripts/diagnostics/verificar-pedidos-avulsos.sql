-- Verificação de Pedidos Avulsos (Standalone Purchases)
-- Este script verifica se há pedidos avulsos no banco e se eles estão sendo retornados corretamente

-- 1. Contar total de pedidos avulsos
SELECT 
  'Total de Pedidos Avulsos' as tipo,
  COUNT(*) as quantidade
FROM standalone_purchases;

-- 2. Verificar pedidos avulsos por status
SELECT 
  status,
  COUNT(*) as quantidade
FROM standalone_purchases
GROUP BY status
ORDER BY quantidade DESC;

-- 3. Verificar pedidos avulsos recentes (últimos 30 dias)
SELECT 
  id,
  status,
  user_id,
  collection_id,
  created_at,
  updated_at
FROM standalone_purchases
WHERE created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC
LIMIT 10;

-- 4. Verificar se há profiles associados
SELECT 
  sp.id,
  sp.status,
  sp.created_at,
  p.id as profile_id,
  p.full_name,
  p.email
FROM standalone_purchases sp
LEFT JOIN profiles p ON sp.user_id = p.id
ORDER BY sp.created_at DESC
LIMIT 10;

-- 5. Verificar se há collections associadas
SELECT 
  sp.id,
  sp.status,
  sp.created_at,
  c.id as collection_id,
  c.name as collection_name,
  c.slug
FROM standalone_purchases sp
LEFT JOIN collections c ON sp.collection_id = c.id
ORDER BY sp.created_at DESC
LIMIT 10;

-- 6. Comparar com subscription_deliveries
SELECT 
  'Subscription Deliveries' as tipo,
  COUNT(*) as quantidade
FROM subscription_deliveries
UNION ALL
SELECT 
  'Standalone Purchases' as tipo,
  COUNT(*) as quantidade
FROM standalone_purchases
UNION ALL
SELECT 
  'Manual Payments' as tipo,
  COUNT(*) as quantidade
FROM manual_payments
UNION ALL
SELECT 
  'Quotes' as tipo,
  COUNT(*) as quantidade
FROM quotes;
