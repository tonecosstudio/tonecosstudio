-- ============================================================================
-- VERIFICAR E POPULAR PRODUCTION QUEUE
-- ============================================================================
-- Execute este script para verificar por que não há dados e popular se necessário
-- ============================================================================

-- 1. VERIFICAR: Quantos registros existem em production_queue?
SELECT 
  'production_queue' as tabela,
  COUNT(*) as total_registros
FROM production_queue;

-- 2. VERIFICAR: Há subscription_deliveries?
SELECT 
  'subscription_deliveries' as tabela,
  COUNT(*) as total_registros,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing
FROM subscription_deliveries;

-- 3. VERIFICAR: Há standalone_purchases?
SELECT 
  'standalone_purchases' as tabela,
  COUNT(*) as total_registros,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing
FROM standalone_purchases;

-- 4. VERIFICAR: Triggers estão ativos?
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%production_queue%'
ORDER BY event_object_table;

-- 5. VER: Dados do João Trimestral
SELECT 
  sd.id,
  sd.user_id,
  sd.status,
  sd.scheduled_date,
  sd.created_at,
  u.email,
  p.full_name,
  c.name as collection_name,
  ch.name as character_name
FROM subscription_deliveries sd
LEFT JOIN auth.users u ON u.id = sd.user_id
LEFT JOIN profiles p ON p.id = sd.user_id
LEFT JOIN collections c ON c.id = sd.collection_id
LEFT JOIN characters ch ON ch.id = sd.character_id
WHERE u.email ILIKE '%trimestral%' OR p.full_name ILIKE '%trimestral%'
ORDER BY sd.created_at DESC;

-- ============================================================================
-- POPULAR DADOS DE TESTE
-- ============================================================================
-- Se não houver dados, vamos criar alguns para teste

DO $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_collection_id UUID;
  v_character_id UUID;
  v_subscription_id UUID;
  v_delivery_id UUID;
  i INTEGER;
  v_deliveries_criados INTEGER := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'INICIANDO POPULAÇÃO DE DADOS DE TESTE';
  RAISE NOTICE '========================================';

  -- Buscar João Trimestral
  SELECT u.id, u.email INTO v_user_id, v_user_email
  FROM auth.users u
  JOIN profiles p ON p.id = u.id
  WHERE u.email ILIKE '%trimestral%' OR p.full_name ILIKE '%trimestral%'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE '❌ Usuário João Trimestral não encontrado';
    RAISE NOTICE '   Buscando qualquer usuário...';
    
    -- Pegar qualquer usuário
    SELECT u.id, u.email INTO v_user_id, v_user_email
    FROM auth.users u
    LIMIT 1;
    
    IF v_user_id IS NULL THEN
      RAISE NOTICE '❌ Nenhum usuário encontrado no sistema!';
      RAISE NOTICE '   Crie um usuário primeiro.';
      RETURN;
    END IF;
  END IF;

  RAISE NOTICE '✅ Usuário encontrado: % (%)', v_user_email, v_user_id;

  -- Buscar uma coleção ativa
  SELECT id INTO v_collection_id
  FROM collections
  WHERE is_active = true
  LIMIT 1;

  IF v_collection_id IS NULL THEN
    RAISE NOTICE '❌ Nenhuma coleção ativa encontrada';
    RAISE NOTICE '   Crie uma coleção primeiro.';
    RETURN;
  END IF;

  RAISE NOTICE '✅ Coleção encontrada: %', v_collection_id;

  -- Buscar um personagem da coleção
  SELECT id INTO v_character_id
  FROM characters
  WHERE collection_id = v_collection_id
  LIMIT 1;

  IF v_character_id IS NOT NULL THEN
    RAISE NOTICE '✅ Personagem encontrado: %', v_character_id;
  ELSE
    RAISE NOTICE '⚠️  Nenhum personagem encontrado (alguns deliveries ficarão sem personagem)';
  END IF;

  -- Buscar ou criar uma subscription
  SELECT id INTO v_subscription_id
  FROM subscriptions
  WHERE user_id = v_user_id
  AND status = 'active'
  LIMIT 1;

  IF v_subscription_id IS NULL THEN
    RAISE NOTICE '⚠️  Nenhuma subscription ativa encontrada';
    RAISE NOTICE '   Criando subscription de teste...';
    
    INSERT INTO subscriptions (
      user_id,
      plan_type,
      status,
      start_date,
      next_billing_date,
      created_at
    )
    VALUES (
      v_user_id,
      'monthly',
      'active',
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '1 month',
      NOW()
    )
    RETURNING id INTO v_subscription_id;
    
    RAISE NOTICE '✅ Subscription criada: %', v_subscription_id;
  ELSE
    RAISE NOTICE '✅ Subscription encontrada: %', v_subscription_id;
  END IF;

  -- Criar 10 deliveries de teste
  RAISE NOTICE '';
  RAISE NOTICE 'Criando deliveries de teste...';
  RAISE NOTICE '----------------------------------------';

  FOR i IN 1..10 LOOP
    BEGIN
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
        v_subscription_id,
        v_user_id,
        v_collection_id,
        CASE 
          WHEN i % 3 = 0 THEN v_character_id 
          ELSE NULL 
        END,
        EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER,
        EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
        CASE 
          WHEN i % 4 = 0 THEN 'pending'
          WHEN i % 4 = 1 THEN 'processing'
          WHEN i % 4 = 2 THEN 'shipped'
          ELSE 'delivered'
        END,
        CURRENT_DATE + (i || ' days')::INTERVAL,
        NOW() - (i || ' hours')::INTERVAL
      )
      RETURNING id INTO v_delivery_id;

      v_deliveries_criados := v_deliveries_criados + 1;
      RAISE NOTICE '  ✅ Delivery % criado: %', i, v_delivery_id;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '  ❌ Erro ao criar delivery %: %', i, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '----------------------------------------';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESUMO';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Deliveries criados: %', v_deliveries_criados;
  RAISE NOTICE '';
  RAISE NOTICE 'Aguarde alguns segundos para os triggers';
  RAISE NOTICE 'popularem a production_queue...';
  RAISE NOTICE '========================================';

END $$;

-- 6. AGUARDAR E VERIFICAR RESULTADO
-- Aguarde 2-3 segundos e execute:

SELECT 
  '=== RESULTADO FINAL ===' as info;

SELECT 
  COUNT(*) as total_production_queue,
  COUNT(CASE WHEN current_stage = 'awaiting_choice' THEN 1 END) as aguardando_escolha,
  COUNT(CASE WHEN priority = 'critical' THEN 1 END) as criticos,
  COUNT(CASE WHEN priority = 'high' THEN 1 END) as altos
FROM production_queue;

SELECT 
  current_stage,
  production_status,
  priority,
  COUNT(*) as total
FROM production_queue
GROUP BY current_stage, production_status, priority
ORDER BY current_stage, priority;

-- 7. VER ALGUNS REGISTROS
SELECT 
  id,
  order_type,
  customer_name,
  customer_email,
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

-- ============================================================================
-- INSTRUÇÕES FINAIS
-- ============================================================================
-- 1. Execute este script completo
-- 2. Aguarde 2-3 segundos
-- 3. Recarregue o Hub de Produção no navegador
-- 4. Deve mostrar os dados agora!
-- 
-- Se ainda não funcionar:
-- - Verifique o console do navegador (F12) por erros
-- - Verifique se está logado como admin
-- - Execute: SELECT * FROM production_queue LIMIT 5;
-- ============================================================================
