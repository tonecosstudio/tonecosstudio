-- ============================================================================
-- Debug: Página de Pedidos
-- ============================================================================

-- 1. Verificar se há assinaturas
SELECT 
  'ASSINATURAS_TOTAL' as tipo,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as ativas,
  COUNT(CASE WHEN status = 'pending_payment' THEN 1 END) as pendentes
FROM subscriptions;

-- 2. Verificar se há entregas de assinatura
SELECT 
  'ENTREGAS_ASSINATURA_TOTAL' as tipo,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendentes,
  COUNT(CASE WHEN status = 'shipped' THEN 1 END) as enviadas
FROM subscription_deliveries;

-- 3. Verificar estrutura da query que o frontend usa
SELECT 
  'TESTE_QUERY_FRONTEND' as tipo,
  sd.id,
  sd.status,
  sd.delivery_number,
  sd.subscription_id,
  s.id as sub_id,
  s.user_id,
  s.collection_id,
  s.plan_type
FROM subscription_deliveries sd
INNER JOIN subscriptions s ON s.id = sd.subscription_id
LIMIT 5;

-- 4. Verificar se há profiles para os user_ids
SELECT 
  'PROFILES_EXISTENTES' as tipo,
  COUNT(DISTINCT s.user_id) as usuarios_com_assinatura,
  COUNT(DISTINCT p.id) as usuarios_com_profile
FROM subscriptions s
LEFT JOIN profiles p ON p.id = s.user_id;

-- 5. Verificar se há collections para os collection_ids
SELECT 
  'COLLECTIONS_EXISTENTES' as tipo,
  COUNT(DISTINCT s.collection_id) as colecoes_em_assinaturas,
  COUNT(DISTINCT c.id) as colecoes_existentes
FROM subscriptions s
LEFT JOIN collections c ON c.id = s.collection_id
WHERE s.collection_id IS NOT NULL;

-- 6. Listar 3 entregas completas com todos os dados
SELECT 
  'ENTREGAS_COMPLETAS' as tipo,
  sd.id as delivery_id,
  sd.status as delivery_status,
  sd.delivery_number,
  s.id as subscription_id,
  s.user_id,
  p.full_name as customer_name,
  p.email as customer_email,
  s.collection_id,
  c.name as collection_name,
  s.plan_type
FROM subscription_deliveries sd
INNER JOIN subscriptions s ON s.id = sd.subscription_id
LEFT JOIN profiles p ON p.id = s.user_id
LEFT JOIN collections c ON c.id = s.collection_id
LIMIT 3;

-- 7. Verificar compras avulsas
SELECT 
  'COMPRAS_AVULSAS_TOTAL' as tipo,
  COUNT(*) as total
FROM standalone_purchases;

-- 8. Verificar pagamentos manuais
SELECT 
  'PAGAMENTOS_MANUAIS_TOTAL' as tipo,
  COUNT(*) as total
FROM manual_payments;
