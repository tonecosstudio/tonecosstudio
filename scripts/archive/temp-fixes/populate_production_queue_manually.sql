-- Script para popular manualmente a production_queue com pedidos já aprovados
-- Execute este script se você já tem pedidos aprovados mas a fila está vazia

-- Este script:
-- 1. Busca todos os subscription_deliveries com status='confirmed'
-- 2. Busca todos os standalone_purchases com status='balance_paid'
-- 3. Insere na production_queue (se ainda não existir)
-- 4. Cria character_choices quando necessário

DO $$
DECLARE
  v_delivery RECORD;
  v_purchase RECORD;
  v_customer_name TEXT;
  v_customer_email TEXT;
  v_collection_id UUID;
  v_collection_name TEXT;
  v_requires_choice BOOLEAN;
  v_choice_deadline TIMESTAMP WITH TIME ZONE;
  v_inserted_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Populando production_queue manualmente ===';
  RAISE NOTICE '';
  
  -- Verificar se a tabela existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'production_queue') THEN
    RAISE EXCEPTION 'Tabela production_queue não existe! Execute as migrations primeiro.';
  END IF;
  
  RAISE NOTICE 'Processando subscription_deliveries...';
  
  -- Process subscription_deliveries
  FOR v_delivery IN 
    SELECT * FROM subscription_deliveries 
    WHERE status = 'confirmed'
    ORDER BY created_at
  LOOP
    -- Check if already in queue
    IF EXISTS (
      SELECT 1 FROM production_queue 
      WHERE order_id = v_delivery.id AND order_type = 'subscription_delivery'
    ) THEN
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;
    
    -- Get customer info
    SELECT 
      COALESCE(p.full_name, p.email, 'Unknown Customer'),
      p.email
    INTO v_customer_name, v_customer_email
    FROM profiles p
    WHERE p.id = v_delivery.user_id;
    
    -- Get collection info
    SELECT c.id, c.name
    INTO v_collection_id, v_collection_name
    FROM collections c
    WHERE c.id = v_delivery.collection_id;
    
    -- Check if choice is required
    SELECT COUNT(*) > 1
    INTO v_requires_choice
    FROM collection_characters
    WHERE collection_id = v_collection_id;
    
    -- Set deadline if choice required
    IF v_requires_choice THEN
      v_choice_deadline := v_delivery.created_at + INTERVAL '7 days';
    ELSE
      v_choice_deadline := NULL;
    END IF;
    
    -- Insert into production_queue
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
      v_delivery.id,
      'subscription_delivery',
      v_delivery.user_id,
      v_customer_name,
      v_customer_email,
      v_collection_id,
      v_collection_name,
      NULL,
      NULL,
      CASE WHEN v_requires_choice THEN 'awaiting_choice' ELSE 'ready_for_production' END,
      CASE WHEN v_requires_choice THEN 'awaiting_choice' ELSE 'design' END,
      CASE WHEN v_requires_choice THEN 'pending' ELSE 'approved' END,
      v_choice_deadline,
      CASE WHEN v_requires_choice THEN NULL ELSE v_delivery.created_at + INTERVAL '1 day' END,
      v_delivery.created_at
    );
    
    -- Create character_choices if needed
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
        v_delivery.id,
        'subscription_delivery',
        v_delivery.user_id,
        v_collection_id,
        'pending',
        v_choice_deadline,
        v_delivery.created_at
      )
      ON CONFLICT (order_id, order_type) DO NOTHING;
    END IF;
    
    v_inserted_count := v_inserted_count + 1;
    RAISE NOTICE '  ✓ Adicionado delivery % (coleção: %)', v_delivery.id, v_collection_name;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Processando standalone_purchases...';
  
  -- Process standalone_purchases
  FOR v_purchase IN 
    SELECT * FROM standalone_purchases 
    WHERE status = 'balance_paid'
    ORDER BY created_at
  LOOP
    -- Check if already in queue
    IF EXISTS (
      SELECT 1 FROM production_queue 
      WHERE order_id = v_purchase.id AND order_type = 'standalone_purchase'
    ) THEN
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;
    
    -- Get customer info
    SELECT 
      COALESCE(p.full_name, p.email, 'Unknown Customer'),
      p.email
    INTO v_customer_name, v_customer_email
    FROM profiles p
    WHERE p.id = v_purchase.user_id;
    
    -- Get collection info
    SELECT c.id, c.name
    INTO v_collection_id, v_collection_name
    FROM collections c
    WHERE c.id = v_purchase.collection_id;
    
    -- Check if choice is required
    SELECT COUNT(*) > 1
    INTO v_requires_choice
    FROM collection_characters
    WHERE collection_id = v_collection_id;
    
    -- Set deadline if choice required
    IF v_requires_choice THEN
      v_choice_deadline := v_purchase.created_at + INTERVAL '7 days';
    ELSE
      v_choice_deadline := NULL;
    END IF;
    
    -- Insert into production_queue
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
      v_purchase.id,
      'standalone_purchase',
      v_purchase.user_id,
      v_customer_name,
      v_customer_email,
      v_collection_id,
      v_collection_name,
      NULL,
      NULL,
      CASE WHEN v_requires_choice THEN 'awaiting_choice' ELSE 'ready_for_production' END,
      CASE WHEN v_requires_choice THEN 'awaiting_choice' ELSE 'design' END,
      CASE WHEN v_requires_choice THEN 'pending' ELSE 'approved' END,
      v_choice_deadline,
      CASE WHEN v_requires_choice THEN NULL ELSE v_purchase.created_at + INTERVAL '1 day' END,
      v_purchase.created_at
    );
    
    -- Create character_choices if needed
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
        v_purchase.id,
        'standalone_purchase',
        v_purchase.user_id,
        v_collection_id,
        'pending',
        v_choice_deadline,
        v_purchase.created_at
      )
      ON CONFLICT (order_id, order_type) DO NOTHING;
    END IF;
    
    v_inserted_count := v_inserted_count + 1;
    RAISE NOTICE '  ✓ Adicionado purchase % (coleção: %)', v_purchase.id, v_collection_name;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== Resumo ===';
  RAISE NOTICE 'Registros inseridos: %', v_inserted_count;
  RAISE NOTICE 'Registros ignorados (já existiam): %', v_skipped_count;
  RAISE NOTICE '';
  
  IF v_inserted_count > 0 THEN
    RAISE NOTICE '✓ production_queue populada com sucesso!';
    RAISE NOTICE 'Agora o dashboard de produção deve mostrar os itens.';
  ELSE
    RAISE NOTICE 'Nenhum registro novo foi inserido.';
    IF v_skipped_count > 0 THEN
      RAISE NOTICE 'Todos os pedidos aprovados já estavam na fila.';
    ELSE
      RAISE NOTICE 'Não há pedidos aprovados para adicionar.';
    END IF;
  END IF;
END $$;

-- Verificar resultado
SELECT 
  'production_queue' as tabela,
  COUNT(*) as total_registros,
  COUNT(*) FILTER (WHERE production_status = 'awaiting_choice') as aguardando_escolha,
  COUNT(*) FILTER (WHERE production_status = 'ready_for_production') as pronto_producao,
  COUNT(*) FILTER (WHERE production_status = 'in_production') as em_producao,
  COUNT(*) FILTER (WHERE production_status = 'completed') as concluido
FROM production_queue;
