-- ========================================
-- TESTE 4: PRODUCTION STAGE UPDATES
-- Testa mudanças de estágio de produção
-- ========================================

-- PASSO 1: Verificar estado atual do item
SELECT 
  'ESTADO_INICIAL' as tipo,
  id,
  order_id,
  order_type,
  customer_name,
  collection_name,
  character_name,
  production_status,
  current_stage,
  production_started_at,
  production_completed_at,
  created_at,
  updated_at
FROM production_queue
WHERE order_type = 'manual_payment'
ORDER BY created_at DESC
LIMIT 1;

-- PASSO 2: Iniciar produção (design → production)
DO $$
DECLARE
  v_item_id UUID;
BEGIN
  -- Pegar o item de manual_payment
  SELECT id INTO v_item_id
  FROM production_queue
  WHERE order_type = 'manual_payment'
  AND current_stage = 'design'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_item_id IS NULL THEN
    RAISE NOTICE '⚠️ Nenhum item em estágio "design" encontrado';
    RETURN;
  END IF;
  
  RAISE NOTICE '📝 Iniciando produção...';
  RAISE NOTICE '   Item ID: %', v_item_id;
  
  -- Atualizar para estágio "production"
  UPDATE production_queue
  SET 
    current_stage = 'production',
    production_status = 'in_production',
    production_started_at = NOW(),
    updated_at = NOW()
  WHERE id = v_item_id;
  
  RAISE NOTICE '✅ Produção iniciada! Estágio: production';
  
END $$;

-- PASSO 3: Verificar após iniciar produção
SELECT 
  'APOS_INICIAR_PRODUCAO' as tipo,
  id,
  current_stage,
  production_status,
  production_started_at,
  updated_at
FROM production_queue
WHERE order_type = 'manual_payment'
ORDER BY created_at DESC
LIMIT 1;

-- PASSO 4: Avançar para controle de qualidade
DO $$
DECLARE
  v_item_id UUID;
BEGIN
  -- Pegar o item em produção
  SELECT id INTO v_item_id
  FROM production_queue
  WHERE order_type = 'manual_payment'
  AND current_stage = 'production'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_item_id IS NULL THEN
    RAISE NOTICE '⚠️ Nenhum item em estágio "production" encontrado';
    RETURN;
  END IF;
  
  RAISE NOTICE '📝 Avançando para controle de qualidade...';
  
  -- Atualizar para estágio "quality_check"
  UPDATE production_queue
  SET 
    current_stage = 'quality_check',
    updated_at = NOW()
  WHERE id = v_item_id;
  
  RAISE NOTICE '✅ Estágio atualizado! Estágio: quality_check';
  
END $$;

-- PASSO 5: Verificar após controle de qualidade
SELECT 
  'APOS_QUALITY_CHECK' as tipo,
  id,
  current_stage,
  production_status,
  production_started_at,
  updated_at
FROM production_queue
WHERE order_type = 'manual_payment'
ORDER BY created_at DESC
LIMIT 1;

-- PASSO 6: Avançar para embalagem
DO $$
DECLARE
  v_item_id UUID;
BEGIN
  -- Pegar o item em quality_check
  SELECT id INTO v_item_id
  FROM production_queue
  WHERE order_type = 'manual_payment'
  AND current_stage = 'quality_check'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_item_id IS NULL THEN
    RAISE NOTICE '⚠️ Nenhum item em estágio "quality_check" encontrado';
    RETURN;
  END IF;
  
  RAISE NOTICE '📝 Avançando para embalagem...';
  
  -- Atualizar para estágio "packaging"
  UPDATE production_queue
  SET 
    current_stage = 'packaging',
    updated_at = NOW()
  WHERE id = v_item_id;
  
  RAISE NOTICE '✅ Estágio atualizado! Estágio: packaging';
  
END $$;

-- PASSO 7: Verificar após embalagem
SELECT 
  'APOS_PACKAGING' as tipo,
  id,
  current_stage,
  production_status,
  production_started_at,
  updated_at
FROM production_queue
WHERE order_type = 'manual_payment'
ORDER BY created_at DESC
LIMIT 1;

-- PASSO 8: Concluir produção (shipped)
DO $$
DECLARE
  v_item_id UUID;
BEGIN
  -- Pegar o item em packaging
  SELECT id INTO v_item_id
  FROM production_queue
  WHERE order_type = 'manual_payment'
  AND current_stage = 'packaging'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_item_id IS NULL THEN
    RAISE NOTICE '⚠️ Nenhum item em estágio "packaging" encontrado';
    RETURN;
  END IF;
  
  RAISE NOTICE '📝 Concluindo produção (shipped)...';
  
  -- Atualizar para estágio "shipped" e status "completed"
  UPDATE production_queue
  SET 
    current_stage = 'shipped',
    production_status = 'completed',
    production_completed_at = NOW(),
    updated_at = NOW()
  WHERE id = v_item_id;
  
  RAISE NOTICE '✅ Produção concluída! Estágio: shipped, Status: completed';
  
END $$;

-- PASSO 9: Verificar resultado final
SELECT 
  'RESULTADO_FINAL' as tipo,
  id,
  order_id,
  customer_name,
  collection_name,
  character_name,
  production_status,
  current_stage,
  production_started_at,
  production_completed_at,
  EXTRACT(EPOCH FROM (production_completed_at - production_started_at))/60 as tempo_producao_minutos,
  created_at,
  updated_at
FROM production_queue
WHERE order_type = 'manual_payment'
ORDER BY created_at DESC
LIMIT 1;

-- PASSO 10: Verificar histórico de timestamps
SELECT 
  'HISTORICO_TIMESTAMPS' as tipo,
  created_at as criado_em,
  production_started_at as producao_iniciada_em,
  production_completed_at as producao_concluida_em,
  updated_at as ultima_atualizacao,
  CASE 
    WHEN production_started_at IS NOT NULL THEN 
      EXTRACT(EPOCH FROM (production_started_at - created_at))/3600
    ELSE NULL
  END as horas_ate_iniciar,
  CASE 
    WHEN production_completed_at IS NOT NULL AND production_started_at IS NOT NULL THEN 
      EXTRACT(EPOCH FROM (production_completed_at - production_started_at))/3600
    ELSE NULL
  END as horas_de_producao
FROM production_queue
WHERE order_type = 'manual_payment'
ORDER BY created_at DESC
LIMIT 1;

-- PASSO 11: Verificar triggers de atualização
SELECT 
  'TRIGGERS_PRODUCTION_QUEUE' as tipo,
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'production_queue'
ORDER BY trigger_name;
