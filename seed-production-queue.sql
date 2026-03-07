-- Script para popular production_queue com dados de teste
-- Execute este script no Supabase SQL Editor para testar o Hub de Produção

-- Primeiro, vamos verificar se há usuários e coleções
DO $$
DECLARE
  v_user_id UUID;
  v_collection_id UUID;
  v_character_id UUID;
  v_delivery_id UUID;
  i INTEGER;
BEGIN
  -- Pegar um usuário existente (ou criar um de teste)
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Nenhum usuário encontrado. Crie um usuário primeiro.';
    RETURN;
  END IF;

  -- Pegar uma coleção ativa
  SELECT id INTO v_collection_id FROM collections WHERE is_active = true LIMIT 1;
  
  IF v_collection_id IS NULL THEN
    RAISE NOTICE 'Nenhuma coleção ativa encontrada. Crie uma coleção primeiro.';
    RETURN;
  END IF;

  -- Pegar um personagem da coleção
  SELECT id INTO v_character_id 
  FROM characters 
  WHERE collection_id = v_collection_id 
  LIMIT 1;

  -- Criar alguns subscription_deliveries de teste
  -- Estes irão automaticamente popular a production_queue via trigger
  FOR i IN 1..10 LOOP
    INSERT INTO subscription_deliveries (
      subscription_id,
      user_id,
      collection_id,
      character_id,
      delivery_month,
      delivery_year,
      status,
      scheduled_date,
      created_at
    )
    VALUES (
      gen_random_uuid(), -- subscription_id fictício
      v_user_id,
      v_collection_id,
      CASE WHEN i % 3 = 0 THEN v_character_id ELSE NULL END, -- Alguns sem personagem escolhido
      EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER,
      EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
      CASE 
        WHEN i % 4 = 0 THEN 'pending'
        WHEN i % 4 = 1 THEN 'processing'
        WHEN i % 4 = 2 THEN 'shipped'
        ELSE 'delivered'
      END,
      CURRENT_DATE + (i || ' days')::INTERVAL,
      NOW() - (i || ' days')::INTERVAL
    )
    RETURNING id INTO v_delivery_id;

    RAISE NOTICE 'Criado delivery %: %', i, v_delivery_id;
  END LOOP;

  RAISE NOTICE 'Dados de teste criados com sucesso!';
  RAISE NOTICE 'Verifique a tabela production_queue agora.';
END $$;

-- Verificar o resultado
SELECT 
  COUNT(*) as total,
  current_stage,
  production_status,
  priority
FROM production_queue
GROUP BY current_stage, production_status, priority
ORDER BY current_stage;

-- Ver alguns registros
SELECT 
  id,
  order_type,
  customer_name,
  collection_name,
  character_name,
  current_stage,
  production_status,
  priority,
  choice_status,
  created_at
FROM production_queue
ORDER BY created_at DESC
LIMIT 10;
