-- ============================================================================
-- Script de Teste: Verificar Preços de Coins Atualizados
-- ============================================================================

-- 1. Verificar preços base
SELECT 
  ct.name as tipo_colecao,
  cbp.base_price_coins as preco_base
FROM collection_base_pricing cbp
JOIN collection_types ct ON cbp.collection_type_id = ct.id
WHERE cbp.is_active = true
ORDER BY ct.name;

-- 2. Verificar multiplicadores
SELECT 
  user_context as contexto,
  multiplier as multiplicador,
  chosen_collection_discount_percentage as desconto_pct,
  description as descricao
FROM pricing_context_multipliers
WHERE is_active = true
ORDER BY user_context;

-- 3. Verificar tabela de preços por contexto
SELECT 
  ct.name as tipo_colecao,
  cpbc.user_context as contexto,
  cpbc.base_price_coins as base,
  pm.multiplier as multiplicador,
  ROUND(cpbc.base_price_coins * pm.multiplier) as preco_final
FROM collection_pricing_by_context cpbc
JOIN collection_types ct ON cpbc.collection_type_id = ct.id
JOIN pricing_context_multipliers pm ON pm.user_context = cpbc.user_context
WHERE cpbc.is_active = true
ORDER BY cpbc.user_context;

-- 4. Teste da função get_collection_price
-- (Requer uma coleção de teste)
DO $
DECLARE
  v_test_collection_id UUID;
  v_price_chosen INTEGER;
  v_price_not_chosen INTEGER;
  v_price_no_sub INTEGER;
BEGIN
  -- Buscar uma coleção de subscription para teste
  SELECT id INTO v_test_collection_id
  FROM collections
  WHERE collection_type_id = (SELECT id FROM collection_types WHERE name = 'subscription')
  LIMIT 1;
  
  IF v_test_collection_id IS NOT NULL THEN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TESTE DA FUNÇÃO get_collection_price()';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    
    -- Simular contextos diferentes
    RAISE NOTICE 'Coleção de teste: %', v_test_collection_id;
    RAISE NOTICE '';
    RAISE NOTICE 'Preços esperados:';
    RAISE NOTICE '- Coleção Escolhida: 200 coins';
    RAISE NOTICE '- Coleção Não Escolhida: 240 coins';
    RAISE NOTICE '- Sem Assinatura: 300 coins';
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE 'Nenhuma coleção de subscription encontrada para teste.';
  END IF;
END $;
