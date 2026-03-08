-- ========================================
-- TESTE 4: PRODUCTION STAGE UPDATES (SIMPLIFICADO)
-- Executa todas as mudanças e retorna resultado final
-- ========================================

DO $$
DECLARE
  v_item_id UUID;
  v_initial_stage TEXT;
  v_final_stage TEXT;
  v_final_status TEXT;
  v_started_at TIMESTAMPTZ;
  v_completed_at TIMESTAMPTZ;
BEGIN
  -- Pegar o item de manual_payment
  SELECT id, current_stage INTO v_item_id, v_initial_stage
  FROM production_queue
  WHERE order_type = 'manual_payment'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_item_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum item de manual_payment encontrado';
  END IF;
  
  RAISE NOTICE '📝 Item ID: %', v_item_id;
  RAISE NOTICE '📝 Estágio inicial: %', v_initial_stage;
  RAISE NOTICE '';
  
  -- PASSO 1: design → production
  IF v_initial_stage = 'design' THEN
    RAISE NOTICE '1️⃣ Iniciando produção (design → production)...';
    UPDATE production_queue
    SET 
      current_stage = 'production',
      production_status = 'in_production',
      production_started_at = NOW(),
      updated_at = NOW()
    WHERE id = v_item_id;
    RAISE NOTICE '   ✅ Produção iniciada';
    RAISE NOTICE '';
  END IF;
  
  -- PASSO 2: production → quality_check
  RAISE NOTICE '2️⃣ Avançando para controle de qualidade (production → quality_check)...';
  UPDATE production_queue
  SET 
    current_stage = 'quality_check',
    updated_at = NOW()
  WHERE id = v_item_id;
  RAISE NOTICE '   ✅ Em controle de qualidade';
  RAISE NOTICE '';
  
  -- PASSO 3: quality_check → packaging
  RAISE NOTICE '3️⃣ Avançando para embalagem (quality_check → packaging)...';
  UPDATE production_queue
  SET 
    current_stage = 'packaging',
    updated_at = NOW()
  WHERE id = v_item_id;
  RAISE NOTICE '   ✅ Em embalagem';
  RAISE NOTICE '';
  
  -- PASSO 4: packaging → shipped (completed)
  RAISE NOTICE '4️⃣ Concluindo produção (packaging → shipped)...';
  UPDATE production_queue
  SET 
    current_stage = 'shipped',
    production_status = 'completed',
    production_completed_at = NOW(),
    updated_at = NOW()
  WHERE id = v_item_id;
  RAISE NOTICE '   ✅ Produção concluída e enviada!';
  RAISE NOTICE '';
  
  -- Pegar dados finais
  SELECT 
    current_stage,
    production_status,
    production_started_at,
    production_completed_at
  INTO 
    v_final_stage,
    v_final_status,
    v_started_at,
    v_completed_at
  FROM production_queue
  WHERE id = v_item_id;
  
  -- Mostrar resumo
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '🎉 TESTE CONCLUÍDO COM SUCESSO!';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE 'Estágio inicial: %', v_initial_stage;
  RAISE NOTICE 'Estágio final: %', v_final_stage;
  RAISE NOTICE 'Status final: %', v_final_status;
  RAISE NOTICE 'Iniciado em: %', v_started_at;
  RAISE NOTICE 'Concluído em: %', v_completed_at;
  RAISE NOTICE 'Tempo total: % minutos', EXTRACT(EPOCH FROM (v_completed_at - v_started_at))/60;
  RAISE NOTICE '═══════════════════════════════════════';
  
END $$;

-- Retornar resultado final
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
  ROUND(EXTRACT(EPOCH FROM (production_completed_at - production_started_at))/60, 2) as tempo_producao_minutos,
  created_at,
  updated_at
FROM production_queue
WHERE order_type = 'manual_payment'
ORDER BY created_at DESC
LIMIT 1;
