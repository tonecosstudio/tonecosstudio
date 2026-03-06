-- ============================================================================
-- FORCE FIX: Corrigir valores de preços (FORÇADO)
-- Data: 2026-03-06 12:00:00
-- Problema: Valores antigos persistem (1000, 1400, 1800)
-- Solução: UPDATE forçado para valores corretos (200, 300, 450)
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CORRIGINDO PREÇOS DE COINS (FORÇADO)';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Valores ANTES:';
  RAISE NOTICE '- subscription: 1000 coins';
  RAISE NOTICE '- standard_catalog: 1400 coins';
  RAISE NOTICE '- premium_catalog: 1800 coins';
  RAISE NOTICE '';
  RAISE NOTICE 'Valores DEPOIS:';
  RAISE NOTICE '- subscription: 200 coins';
  RAISE NOTICE '- standard_catalog: 300 coins';
  RAISE NOTICE '- premium_catalog: 1800 coins';
  RAISE NOTICE '';
END $$;

-- Atualizar valores
UPDATE collection_base_pricing
SET 
  base_price_coins = CASE 
    WHEN collection_type_id = (
      SELECT id FROM collection_types WHERE name = 'subscription'
    ) THEN 200
    WHEN collection_type_id = (
      SELECT id FROM collection_types WHERE name = 'standard_catalog'
    ) THEN 300
    WHEN collection_type_id = (
      SELECT id FROM collection_types WHERE name = 'premium_catalog'
    ) THEN 450
    ELSE base_price_coins
  END,
  updated_at = NOW()
WHERE collection_type_id IN (
  SELECT id FROM collection_types 
  WHERE name IN ('subscription', 'standard_catalog', 'premium_catalog')
);

-- Verificar e reportar
DO $$
DECLARE
  v_subscription_price INTEGER;
  v_standard_price INTEGER;
  v_premium_price INTEGER;
BEGIN
  -- Buscar valores atualizados
  SELECT base_price_coins INTO v_subscription_price
  FROM collection_base_pricing cbp
  JOIN collection_types ct ON cbp.collection_type_id = ct.id
  WHERE ct.name = 'subscription';
  
  SELECT base_price_coins INTO v_standard_price
  FROM collection_base_pricing cbp
  JOIN collection_types ct ON cbp.collection_type_id = ct.id
  WHERE ct.name = 'standard_catalog';
  
  SELECT base_price_coins INTO v_premium_price
  FROM collection_base_pricing cbp
  JOIN collection_types ct ON cbp.collection_type_id = ct.id
  WHERE ct.name = 'premium_catalog';
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICAÇÃO DOS VALORES ATUALIZADOS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'subscription: % coins %', 
    v_subscription_price,
    CASE WHEN v_subscription_price = 200 THEN '✓' ELSE '✗' END;
  RAISE NOTICE 'standard_catalog: % coins %', 
    v_standard_price,
    CASE WHEN v_standard_price = 300 THEN '✓' ELSE '✗' END;
  RAISE NOTICE 'premium_catalog: % coins %', 
    v_premium_price,
    CASE WHEN v_premium_price = 450 THEN '✓' ELSE '✗' END;
  RAISE NOTICE '';
  
  IF v_subscription_price = 200 AND v_standard_price = 300 AND v_premium_price = 450 THEN
    RAISE NOTICE '✅ TODOS OS VALORES CORRETOS!';
  ELSE
    RAISE NOTICE '❌ ALGUNS VALORES AINDA INCORRETOS!';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
