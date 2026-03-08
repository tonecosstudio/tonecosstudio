-- 🧪 CRIAR DADOS DE TESTE PARA VALIDAR TRIGGERS
-- Execute passo a passo e anote os resultados

-- ============================================
-- PASSO 1: Pegar IDs necessários
-- ============================================

-- 1.1 Pegar um user_id válido
SELECT 
  'USER_ID' as tipo,
  id as valor
FROM profiles 
LIMIT 1;

-- 1.2 Pegar um payment_method_id válido
SELECT 
  'PAYMENT_METHOD_ID' as tipo,
  id as valor
FROM admin_payment_methods 
LIMIT 1;

-- 1.3 Pegar um subscription_id válido (se houver)
SELECT 
  'SUBSCRIPTION_ID' as tipo,
  id as valor
FROM subscriptions 
LIMIT 1;

-- ============================================
-- PASSO 2: Verificar estado ANTES
-- ============================================

SELECT 
  'ANTES' as momento,
  (SELECT COUNT(*) FROM production_queue) as itens_na_fila,
  (SELECT COUNT(*) FROM manual_payments) as total_pagamentos;

-- ============================================
-- PASSO 3: Criar pagamento de teste
-- ============================================
-- IMPORTANTE: Substitua os valores abaixo pelos IDs que você anotou!

INSERT INTO manual_payments (
  reference_number,
  user_id,
  payment_method_id,
  subscription_id,  -- ou quote_id se preferir
  amount,
  currency,
  payment_type,
  status
) VALUES (
  'TEST-' || to_char(NOW(), 'YYYYMMDD-HH24MISS'),  -- Gera número único
  'COLE_USER_ID_AQUI',           -- UUID do usuário (passo 1.1)
  'COLE_PAYMENT_METHOD_ID_AQUI', -- UUID do método (passo 1.2)
  'COLE_SUBSCRIPTION_ID_AQUI',   -- UUID da assinatura (passo 1.3) ou NULL
  150.00,
  'BRL',
  'one_time',
  'pending'
) RETURNING 
  id as payment_id,
  reference_number,
  user_id,
  amount,
  status;

-- ANOTE O payment_id QUE APARECER!

-- ============================================
-- PASSO 4: Aprovar o pagamento (TRIGGER!)
-- ============================================
-- IMPORTANTE: Substitua PAYMENT_ID pelo ID que você anotou no passo 3

UPDATE manual_payments
SET 
  status = 'approved',
  approved_at = NOW(),
  approved_by = user_id  -- Usando o próprio user_id como aprovador
WHERE id = 'COLE_PAYMENT_ID_AQUI'
RETURNING 
  id,
  reference_number,
  status,
  approved_at;

-- ============================================
-- PASSO 5: Verificar estado DEPOIS
-- ============================================

SELECT 
  'DEPOIS' as momento,
  (SELECT COUNT(*) FROM production_queue) as itens_na_fila,
  (SELECT COUNT(*) FROM manual_payments) as total_pagamentos,
  (SELECT COUNT(*) FROM manual_payments WHERE status = 'approved') as pagamentos_aprovados;

-- ============================================
-- PASSO 6: Ver o item criado na fila
-- ============================================

SELECT 
  'ITEM_CRIADO' as tipo,
  id,
  customer_id,
  order_id,
  order_type,
  production_status,
  priority,
  priority_score,
  created_at
FROM production_queue
ORDER BY created_at DESC
LIMIT 1;

-- ============================================
-- RESULTADO ESPERADO
-- ============================================
-- Se o trigger funcionou:
-- - itens_na_fila aumentou em 1
-- - Novo item tem order_type = 'standalone_purchase' ou similar
-- - customer_id corresponde ao user_id do pagamento
-- - production_status = 'awaiting_choice'
