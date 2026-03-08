-- 🧪 TESTE DO TRIGGER COM RESULTADO
-- Este script cria um pagamento de teste e verifica se o trigger funciona

-- Passo 1: Verificar estado inicial
SELECT 
  'ESTADO_INICIAL' as fase,
  COUNT(*) as itens_na_fila
FROM production_queue;

-- Passo 2: Criar e aprovar pagamento de teste
DO $$
DECLARE
  v_user_id UUID;
  v_payment_method_id UUID;
  v_subscription_id UUID;
  v_payment_id UUID;
BEGIN
  -- Pegar IDs necessários
  SELECT id INTO v_user_id FROM profiles LIMIT 1;
  SELECT id INTO v_payment_method_id FROM admin_payment_methods LIMIT 1;
  SELECT id INTO v_subscription_id FROM subscriptions WHERE active_collection_id IS NOT NULL LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum usuário encontrado';
  END IF;
  
  IF v_payment_method_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum método de pagamento encontrado';
  END IF;
  
  IF v_subscription_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma subscription com collection ativa encontrada';
  END IF;
  
  -- Criar pagamento de teste
  INSERT INTO manual_payments (
    reference_number,
    user_id,
    payment_method_id,
    subscription_id,
    amount,
    currency,
    payment_type,
    status
  ) VALUES (
    'TEST-' || to_char(NOW(), 'YYYYMMDD-HH24MISS'),
    v_user_id,
    v_payment_method_id,
    v_subscription_id,
    150.00,
    'BRL',
    'one_time',
    'pending'
  ) RETURNING id INTO v_payment_id;
  
  RAISE NOTICE 'Pagamento criado: %', v_payment_id;
  
  -- Aprovar o pagamento (TRIGGER!)
  UPDATE manual_payments
  SET 
    status = 'approved',
    approved_at = NOW(),
    approved_by = v_user_id
  WHERE id = v_payment_id;
  
  RAISE NOTICE 'Pagamento aprovado!';
END $$;

-- Passo 3: Verificar estado final
SELECT 
  'ESTADO_FINAL' as fase,
  COUNT(*) as itens_na_fila
FROM production_queue;

-- Passo 4: Mostrar último item criado
SELECT 
  'ULTIMO_ITEM' as tipo,
  order_id,
  order_type,
  customer_name,
  collection_name,
  production_status,
  created_at
FROM production_queue
ORDER BY created_at DESC
LIMIT 1;
