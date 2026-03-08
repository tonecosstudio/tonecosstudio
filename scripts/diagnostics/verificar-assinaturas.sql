-- ============================================================================
-- Verificar Assinaturas e Entregas
-- ============================================================================

-- 1. Verificar assinaturas existentes
SELECT 
  'ASSINATURAS' as tipo,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as ativas,
  COUNT(CASE WHEN status = 'pending_payment' THEN 1 END) as pendentes,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as canceladas
FROM subscriptions;

-- 2. Verificar entregas de assinatura
SELECT 
  'ENTREGAS_ASSINATURA' as tipo,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendentes,
  COUNT(CASE WHEN status = 'processing' THEN 1 END) as processando,
  COUNT(CASE WHEN status = 'shipped' THEN 1 END) as enviadas,
  COUNT(CASE WHEN status = 'delivered' THEN 1 END) as entregues
FROM subscription_deliveries;

-- 3. Verificar compras avulsas
SELECT 
  'COMPRAS_AVULSAS' as tipo,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'pending_payment' THEN 1 END) as pendentes,
  COUNT(CASE WHEN status = 'paid' THEN 1 END) as pagas,
  COUNT(CASE WHEN status = 'shipped' THEN 1 END) as enviadas
FROM standalone_purchases;

-- 4. Verificar pagamentos manuais
SELECT 
  'PAGAMENTOS_MANUAIS' as tipo,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendentes,
  COUNT(CASE WHEN status = 'approved' THEN 1 END) as aprovados
FROM manual_payments;

-- 5. Listar últimas 5 assinaturas com detalhes
SELECT 
  'ULTIMAS_ASSINATURAS' as tipo,
  s.id,
  s.user_id,
  s.collection_id,
  s.plan_type,
  s.status,
  s.created_at,
  (SELECT COUNT(*) FROM subscription_deliveries WHERE subscription_id = s.id) as total_entregas
FROM subscriptions s
ORDER BY s.created_at DESC
LIMIT 5;

-- 6. Listar últimas 5 entregas de assinatura
SELECT 
  'ULTIMAS_ENTREGAS' as tipo,
  sd.id,
  sd.subscription_id,
  sd.status,
  sd.delivery_number,
  sd.created_at
FROM subscription_deliveries sd
ORDER BY sd.created_at DESC
LIMIT 5;
