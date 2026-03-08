-- 🧪 TESTE SIMPLES DO TRIGGER
-- Execute este script completo de uma vez

-- Criar variáveis temporárias
DO $$
DECLARE
  v_user_id UUID;
  v_payment_method_id UUID;
  v_subscription_id UUID;
  v_payment_id UUID;
  v_itens_antes INTEGER;
  v_itens_depois INTEGER;
BEGIN
  -- Pegar IDs necessários
  SELECT id INTO v_user_id FROM profiles LIMIT 1;
  SELECT id INTO v_payment_method_id FROM admin_payment_methods LIMIT 1;
  SELECT id INTO v_subscription_id FROM subscriptions LIMIT 1;
  
  -- Verificar estado ANTES
  SELECT COUNT(*) INTO v_itens_antes FROM production_queue;
  RAISE NOTICE '📊 ANTES: % itens na fila', v_itens_antes;
  
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
  
  -- Aguardar um momento para o trigger executar
  PERFORM pg_sleep(1);
  
  -- Verificar estado DEPOIS
  SELECT COUNT(*) INTO v_itens_depois FROM production_queue;
  RAISE NOTICE '📊 DEPOIS: % itens na fila', v_itens_depois;
  
  -- Resultado
  IF v_itens_depois > v_itens_antes THEN
    RAISE NOTICE '🎉 SUCESSO! Trigger funcionou! Item criado na fila.';
  ELSE
    RAISE NOTICE '⚠️ ATENÇÃO! Trigger não criou item na fila.';
  END IF;
  
  -- Mostrar o item criado
  RAISE NOTICE '📦 Último item na fila:';
  PERFORM * FROM production_queue ORDER BY created_at DESC LIMIT 1;
  
END $$;

-- Verificação final
SELECT 
  'RESULTADO_FINAL' as tipo,
  (SELECT COUNT(*) FROM production_queue) as itens_na_fila,
  (SELECT COUNT(*) FROM manual_payments WHERE status = 'approved') as pagamentos_aprovados;
