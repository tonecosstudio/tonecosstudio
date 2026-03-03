-- Script para adicionar pagamento manual à fila de produção
-- Execute este script no SQL Editor do Supabase Dashboard

-- Adicionar o pagamento manual específico
DO $$
DECLARE
  v_payment RECORD;
  v_subscription RECORD;
  v_profile RECORD;
  v_collection RECORD;
  v_requires_choice BOOLEAN;
  v_choice_deadline TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Buscar o pagamento manual
  SELECT * INTO v_payment
  FROM manual_payments
  WHERE id = '9c6bec6d-af56-407d-89c7-6126456f4bff';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pagamento não encontrado';
  END IF;
  
  RAISE NOTICE 'Pagamento encontrado: %', v_payment.reference_number;
  
  -- Buscar a assinatura relacionada
  SELECT * INTO v_subscription
  FROM subscriptions
  WHERE id = v_payment.subscription_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assinatura não encontrada';
  END IF;
  
  RAISE NOTICE 'Assinatura encontrada: %', v_subscription.id;
  
  -- Buscar o perfil do cliente
  SELECT * INTO v_profile
  FROM profiles
  WHERE id = v_payment.user_id;
  
  -- Buscar a coleção da assinatura (a mais recente)
  SELECT c.* INTO v_collection
  FROM collections c
  INNER JOIN subscription_collections sc ON sc.collection_id = c.id
  WHERE sc.subscription_id = v_subscription.id
  ORDER BY c.created_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nenhuma coleção encontrada para esta assinatura';
  END IF;
  
  RAISE NOTICE 'Coleção encontrada: %', v_collection.name;
  
  -- Verificar se já existe na fila
  IF EXISTS (
    SELECT 1 FROM production_queue
    WHERE order_id = v_payment.id
    AND order_type = 'manual_payment'
  ) THEN
    RAISE NOTICE 'Este pagamento JÁ está na fila de produção';
    RETURN;
  END IF;
  
  -- Verificar se precisa de escolha de personagem
  SELECT COUNT(*) > 1 INTO v_requires_choice
  FROM collection_characters
  WHERE collection_id = v_collection.id;
  
  IF v_requires_choice THEN
    v_choice_deadline := v_payment.created_at + INTERVAL '7 days';
    RAISE NOTICE 'Requer escolha de personagem (deadline: %)', v_choice_deadline;
  ELSE
    v_choice_deadline := NULL;
    RAISE NOTICE 'Não requer escolha de personagem';
  END IF;
  
  -- Inserir na fila de produção
  INSERT INTO production_queue (
    order_id,
    order_type,
    customer_id,
    customer_name,
    customer_email,
    collection_id,
    collection_name,
    character_id,
    character_name,
    production_status,
    current_stage,
    choice_status,
    choice_deadline,
    scheduled_production_date,
    created_at
  ) VALUES (
    v_payment.id,
    'manual_payment',
    v_payment.user_id,
    COALESCE(v_profile.full_name, v_profile.email, 'Cliente Desconhecido'),
    v_profile.email,
    v_collection.id,
    v_collection.name,
    NULL,
    NULL,
    CASE WHEN v_requires_choice THEN 'awaiting_choice' ELSE 'ready_for_production' END,
    CASE WHEN v_requires_choice THEN 'awaiting_choice' ELSE 'design' END,
    CASE WHEN v_requires_choice THEN 'pending' ELSE 'approved' END,
    v_choice_deadline,
    CASE WHEN v_requires_choice THEN NULL ELSE v_payment.created_at + INTERVAL '1 day' END,
    v_payment.created_at
  );
  
  RAISE NOTICE '✓ Pagamento adicionado à fila de produção';
  
  -- Criar character_choice se necessário
  IF v_requires_choice THEN
    INSERT INTO character_choices (
      order_id,
      order_type,
      user_id,
      collection_id,
      status,
      deadline,
      created_at
    ) VALUES (
      v_payment.id,
      'manual_payment',
      v_payment.user_id,
      v_collection.id,
      'pending',
      v_choice_deadline,
      v_payment.created_at
    )
    ON CONFLICT (order_id, order_type) DO NOTHING;
    
    RAISE NOTICE '✓ Character choice criado';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== SUCESSO ===';
  RAISE NOTICE 'Pagamento % adicionado à fila de produção', v_payment.reference_number;
  
END $$;

-- Verificar resultado
SELECT 
  pq.id,
  pq.order_id,
  pq.order_type,
  pq.customer_name,
  pq.collection_name,
  pq.production_status,
  pq.current_stage,
  pq.choice_status
FROM production_queue pq
WHERE pq.order_id = '9c6bec6d-af56-407d-89c7-6126456f4bff';
