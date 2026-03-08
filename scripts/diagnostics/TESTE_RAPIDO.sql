-- ========================================
-- TESTE RÁPIDO DO TRIGGER
-- Copie e cole este SQL no Supabase Studio
-- ========================================

-- PASSO 0: Criar dados necessários se não existirem
DO $$
DECLARE
  v_method_count INTEGER;
  v_subscription_count INTEGER;
BEGIN
  -- Verificar se há métodos de pagamento
  SELECT COUNT(*) INTO v_method_count FROM admin_payment_methods;
  
  IF v_method_count = 0 THEN
    RAISE NOTICE '📝 Criando método de pagamento de teste...';
    INSERT INTO admin_payment_methods (
      name, 
      type, 
      instructions,
      pix_key,
      is_active,
      is_default,
      display_order
    )
    VALUES (
      'PIX - Teste', 
      'pix', 
      'Chave PIX de teste para validação do sistema',
      'teste@ordax.com.br',
      true,
      true,
      0
    );
    RAISE NOTICE '✅ Método de pagamento criado!';
  END IF;
  
  -- Verificar se há subscriptions com collection
  SELECT COUNT(*) INTO v_subscription_count 
  FROM subscriptions 
  WHERE active_collection_id IS NOT NULL;
  
  IF v_subscription_count = 0 THEN
    RAISE NOTICE '📝 Atualizando subscription com collection...';
    UPDATE subscriptions
    SET active_collection_id = (SELECT id FROM collections LIMIT 1)
    WHERE id = (SELECT id FROM subscriptions LIMIT 1);
    RAISE NOTICE '✅ Subscription atualizada!';
  END IF;
END $$;

-- PASSO 1: Verificar dados disponíveis
SELECT 
  'VERIFICACAO_INICIAL' as fase,
  (SELECT COUNT(*) FROM profiles) as usuarios,
  (SELECT COUNT(*) FROM admin_payment_methods) as metodos_pagamento,
  (SELECT COUNT(*) FROM subscriptions WHERE active_collection_id IS NOT NULL) as subscriptions_com_collection,
  (SELECT COUNT(*) FROM production_queue) as itens_na_fila_antes;

-- PASSO 2: Criar e aprovar pagamento de teste
DO $$
DECLARE
  v_user_id UUID;
  v_payment_method_id UUID;
  v_subscription_id UUID;
  v_payment_id UUID;
  v_itens_antes INTEGER;
  v_itens_depois INTEGER;
BEGIN
  -- Contar itens antes
  SELECT COUNT(*) INTO v_itens_antes FROM production_queue;
  
  -- Pegar IDs necessários
  SELECT id INTO v_user_id FROM profiles LIMIT 1;
  SELECT id INTO v_payment_method_id FROM admin_payment_methods LIMIT 1;
  SELECT id INTO v_subscription_id FROM subscriptions WHERE active_collection_id IS NOT NULL LIMIT 1;
  
  -- Validações
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '❌ Nenhum usuário encontrado';
  END IF;
  
  IF v_payment_method_id IS NULL THEN
    RAISE EXCEPTION '❌ Nenhum método de pagamento encontrado';
  END IF;
  
  IF v_subscription_id IS NULL THEN
    RAISE EXCEPTION '❌ Nenhuma subscription com collection ativa encontrada. Execute: UPDATE subscriptions SET active_collection_id = (SELECT id FROM collections LIMIT 1) WHERE id = (SELECT id FROM subscriptions LIMIT 1);';
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
  
  RAISE NOTICE '💰 Pagamento criado: %', v_payment_id;
  
  -- Aprovar o pagamento (TRIGGER!)
  UPDATE manual_payments
  SET 
    status = 'approved',
    approved_at = NOW(),
    approved_by = v_user_id
  WHERE id = v_payment_id;
  
  RAISE NOTICE '✅ Pagamento aprovado!';
  
  -- Aguardar trigger executar
  PERFORM pg_sleep(0.5);
  
  -- Contar itens depois
  SELECT COUNT(*) INTO v_itens_depois FROM production_queue;
  
  -- Resultado
  IF v_itens_depois > v_itens_antes THEN
    RAISE NOTICE '🎉 SUCESSO! Trigger funcionou! Itens: % → %', v_itens_antes, v_itens_depois;
  ELSE
    RAISE WARNING '⚠️ FALHA! Trigger não criou item na fila. Itens: % → %', v_itens_antes, v_itens_depois;
  END IF;
END $$;

-- PASSO 3: Mostrar resultado
SELECT 
  'RESULTADO_FINAL' as fase,
  (SELECT COUNT(*) FROM production_queue) as itens_na_fila_depois,
  (SELECT order_type FROM production_queue ORDER BY created_at DESC LIMIT 1) as ultimo_order_type,
  (SELECT collection_name FROM production_queue ORDER BY created_at DESC LIMIT 1) as ultimo_collection_name,
  (SELECT production_status FROM production_queue ORDER BY created_at DESC LIMIT 1) as ultimo_status,
  (SELECT created_at FROM production_queue ORDER BY created_at DESC LIMIT 1) as ultimo_created_at;
