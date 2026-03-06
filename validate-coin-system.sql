-- ============================================================================
-- VALIDAÇÃO COMPLETA DO SISTEMA DE COINS
-- ============================================================================
-- Este script valida se todas as páginas e funções estão usando os valores
-- corretos do banco de dados (200, 240, 300, 450 coins)
-- ============================================================================

\echo '========================================';
\echo 'VALIDAÇÃO DO SISTEMA DE COINS';
\echo '========================================';
\echo '';

-- ============================================================================
-- 1. VERIFICAR PREÇOS BASE (collection_base_pricing)
-- ============================================================================

\echo '1. PREÇOS BASE (collection_base_pricing):';
\echo '-------------------------------------------';

SELECT 
  ct.name AS tipo_colecao,
  cbp.base_price_coins AS preco_base,
  CASE 
    WHEN ct.name = 'subscription' AND cbp.base_price_coins = 200 THEN '✓ CORRETO'
    WHEN ct.name = 'standard_catalog' AND cbp.base_price_coins = 300 THEN '✓ CORRETO'
    WHEN ct.name = 'premium_catalog' AND cbp.base_price_coins = 450 THEN '✓ CORRETO'
    ELSE '✗ INCORRETO'
  END AS status
FROM collection_base_pricing cbp
JOIN collection_types ct ON cbp.collection_type_id = ct.id
WHERE cbp.is_active = true
ORDER BY cbp.base_price_coins;

\echo '';

-- ============================================================================
-- 2. VERIFICAR PREÇOS POR CONTEXTO (collection_pricing_by_context)
-- ============================================================================

\echo '2. PREÇOS POR CONTEXTO (collection_pricing_by_context):';
\echo '--------------------------------------------------------';

SELECT 
  user_context AS contexto,
  base_price_coins AS base,
  CASE 
    WHEN base_price_coins = 200 THEN '✓ CORRETO (base de referência)'
    ELSE '✗ INCORRETO'
  END AS status
FROM collection_pricing_by_context
WHERE is_active = true
ORDER BY user_context;

\echo '';

-- ============================================================================
-- 3. VERIFICAR MULTIPLICADORES (pricing_context_multipliers)
-- ============================================================================

\echo '3. MULTIPLICADORES (pricing_context_multipliers):';
\echo '--------------------------------------------------';

SELECT 
  user_context AS contexto,
  multiplier AS multiplicador,
  chosen_collection_discount_percentage AS desconto,
  CASE 
    WHEN user_context = 'subscribed_chosen' AND multiplier = 1.0 AND chosen_collection_discount_percentage = 0 THEN '✓ CORRETO'
    WHEN user_context = 'subscribed_not_chosen' AND multiplier = 1.2 THEN '✓ CORRETO'
    WHEN user_context = 'no_subscription' AND multiplier = 1.5 THEN '✓ CORRETO'
    ELSE '✗ INCORRETO'
  END AS status
FROM pricing_context_multipliers
WHERE is_active = true
ORDER BY multiplier;

\echo '';

-- ============================================================================
-- 4. TESTAR FUNÇÃO get_collection_price()
-- ============================================================================

\echo '4. TESTES DA FUNÇÃO get_collection_price():';
\echo '--------------------------------------------';

-- Criar usuário de teste temporário
DO $$
DECLARE
  v_test_user_id UUID := gen_random_uuid();
  v_subscription_collection_id UUID;
  v_standard_collection_id UUID;
  v_premium_collection_id UUID;
  v_price INTEGER;
BEGIN
  -- Buscar IDs de coleções
  SELECT id INTO v_subscription_collection_id 
  FROM collections 
  WHERE collection_type_id = (SELECT id FROM collection_types WHERE name = 'subscription')
  LIMIT 1;
  
  SELECT id INTO v_standard_collection_id 
  FROM collections 
  WHERE collection_type_id = (SELECT id FROM collection_types WHERE name = 'standard_catalog')
  LIMIT 1;
  
  SELECT id INTO v_premium_collection_id 
  FROM collections 
  WHERE collection_type_id = (SELECT id FROM collection_types WHERE name = 'premium_catalog')
  LIMIT 1;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Testes com coleção de subscription:';
  RAISE NOTICE '------------------------------------';
  
  IF v_subscription_collection_id IS NOT NULL THEN
    -- Teste 1: Sem assinatura (deve retornar 300)
    v_price := get_collection_price(v_subscription_collection_id, NULL);
    RAISE NOTICE 'Sem Assinatura: % coins (esperado: 300) %', 
      v_price, 
      CASE WHEN v_price = 300 THEN '✓' ELSE '✗' END;
    
    -- Teste 2: Com assinatura mas não escolhida (deve retornar 240)
    -- Nota: Sem criar subscription real, retorna como não escolhida
    v_price := get_collection_price(v_subscription_collection_id, v_test_user_id);
    RAISE NOTICE 'Não Escolhida: % coins (esperado: 240) %', 
      v_price,
      CASE WHEN v_price = 240 THEN '✓' ELSE '✗' END;
  ELSE
    RAISE NOTICE 'Nenhuma coleção de subscription encontrada para teste.';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Testes com catálogos:';
  RAISE NOTICE '---------------------';
  
  -- Teste 3: Catálogo Geral (deve retornar 300)
  IF v_standard_collection_id IS NOT NULL THEN
    v_price := get_collection_price(v_standard_collection_id, NULL);
    RAISE NOTICE 'Catálogo Geral: % coins (esperado: 300) %', 
      v_price,
      CASE WHEN v_price = 300 THEN '✓' ELSE '✗' END;
  END IF;
  
  -- Teste 4: Premium (deve retornar 450)
  IF v_premium_collection_id IS NOT NULL THEN
    v_price := get_collection_price(v_premium_collection_id, NULL);
    RAISE NOTICE 'Premium: % coins (esperado: 450) %', 
      v_price,
      CASE WHEN v_price = 450 THEN '✓' ELSE '✗' END;
  END IF;
END $$;

\echo '';

-- ============================================================================
-- 5. VERIFICAR VALORES ESPERADOS
-- ============================================================================

\echo '5. RESUMO DOS VALORES ESPERADOS:';
\echo '---------------------------------';
\echo 'Tipo                    | Coins | Cálculo';
\echo '------------------------|-------|------------------';
\echo 'Coleção Ativa           | 200   | Base (referência)';
\echo 'Coleção Secundária      | 240   | 200 × 1.2 (+20%)';
\echo 'Catálogo Geral          | 300   | 200 × 1.5 (+50%)';
\echo 'Premium                 | 450   | 200 × 2.25 (+125%)';
\echo '';

-- ============================================================================
-- 6. VERIFICAR INTEGRIDADE DOS DADOS
-- ============================================================================

\echo '6. VERIFICAÇÃO DE INTEGRIDADE:';
\echo '-------------------------------';

-- Verificar se todas as tabelas existem
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collection_base_pricing') THEN '✓'
    ELSE '✗'
  END || ' collection_base_pricing' AS tabela
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collection_pricing_by_context') THEN '✓'
    ELSE '✗'
  END || ' collection_pricing_by_context'
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pricing_context_multipliers') THEN '✓'
    ELSE '✗'
  END || ' pricing_context_multipliers';

\echo '';

-- Verificar se funções existem
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_collection_price') THEN '✓'
    ELSE '✗'
  END || ' get_collection_price()' AS funcao
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_character_price') THEN '✓'
    ELSE '✗'
  END || ' get_character_price()';

\echo '';

-- ============================================================================
-- 7. CONCLUSÃO
-- ============================================================================

\echo '========================================';
\echo 'VALIDAÇÃO CONCLUÍDA!';
\echo '========================================';
\echo '';
\echo 'Próximos passos:';
\echo '1. Verificar página /admin/coins';
\echo '2. Testar compra de personagem';
\echo '3. Validar preços no catálogo';
\echo '';
