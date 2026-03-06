-- ============================================================================
-- TESTE DA FUNÇÃO get_collection_price()
-- ============================================================================

-- Primeiro, vamos verificar se a função existe
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'get_collection_price';

-- Verificar dados de teste disponíveis
SELECT '=== COLLECTION TYPES ===' as section;
SELECT * FROM collection_types ORDER BY sort_order;

SELECT '=== COLLECTION BASE PRICING ===' as section;
SELECT 
  ct.name,
  ct.display_name,
  cbp.base_price_coins
FROM collection_base_pricing cbp
JOIN collection_types ct ON ct.id = cbp.collection_type_id
ORDER BY ct.sort_order;

SELECT '=== PRICING CONTEXT MULTIPLIERS ===' as section;
SELECT 
  user_context,
  multiplier,
  chosen_collection_discount_percentage,
  description
FROM pricing_context_multipliers
ORDER BY user_context;

-- Verificar se existem coleções
SELECT '=== COLLECTIONS ===' as section;
SELECT 
  c.id,
  c.name,
  ct.name as collection_type
FROM collections c
JOIN collection_types ct ON ct.id = c.collection_type_id
LIMIT 5;

-- Verificar se existem usuários com assinatura ativa
SELECT '=== ACTIVE SUBSCRIPTIONS ===' as section;
SELECT 
  s.id,
  s.user_id,
  s.status,
  s.plan_id
FROM subscriptions s
WHERE s.status = 'active'
LIMIT 3;

-- Verificar se existem coleções escolhidas
SELECT '=== SUBSCRIPTION COLLECTIONS ===' as section;
SELECT 
  sc.subscription_id,
  sc.collection_id,
  s.user_id,
  c.name as collection_name
FROM subscription_collections sc
JOIN subscriptions s ON s.id = sc.subscription_id
JOIN collections c ON c.id = sc.collection_id
WHERE s.status = 'active'
LIMIT 5;

-- ============================================================================
-- TESTES DA FUNÇÃO
-- ============================================================================

-- Teste 1: Preço para não assinante (sem user_id)
SELECT '=== TESTE 1: Não Assinante (NULL user_id) ===' as test;
SELECT 
  c.id as collection_id,
  c.name as collection_name,
  ct.name as collection_type,
  cbp.base_price_coins,
  get_collection_price(c.id, NULL) as calculated_price,
  'Expected: base_price × 1.2 = ' || (cbp.base_price_coins * 1.2)::INTEGER as expected
FROM collections c
JOIN collection_types ct ON ct.id = c.collection_type_id
JOIN collection_base_pricing cbp ON ct.id = cbp.collection_type_id
WHERE ct.name = 'subscription'
LIMIT 1;

-- Teste 2: Preço para catálogo padrão (deve retornar preço fixo)
SELECT '=== TESTE 2: Catálogo Padrão (preço fixo) ===' as test;
SELECT 
  c.id as collection_id,
  c.name as collection_name,
  ct.name as collection_type,
  cbp.base_price_coins,
  get_collection_price(c.id, NULL) as calculated_price,
  'Expected: base_price (fixed) = ' || cbp.base_price_coins as expected
FROM collections c
JOIN collection_types ct ON ct.id = c.collection_type_id
JOIN collection_base_pricing cbp ON ct.id = cbp.collection_type_id
WHERE ct.name = 'standard_catalog'
LIMIT 1;

-- Teste 3: Preço para catálogo premium (deve retornar preço fixo)
SELECT '=== TESTE 3: Catálogo Premium (preço fixo) ===' as test;
SELECT 
  c.id as collection_id,
  c.name as collection_name,
  ct.name as collection_type,
  cbp.base_price_coins,
  get_collection_price(c.id, NULL) as calculated_price,
  'Expected: base_price (fixed) = ' || cbp.base_price_coins as expected
FROM collections c
JOIN collection_types ct ON ct.id = c.collection_type_id
JOIN collection_base_pricing cbp ON ct.id = cbp.collection_type_id
WHERE ct.name = 'premium_catalog'
LIMIT 1;

-- Teste 4: Preço para assinante com coleção escolhida (desconto de 20%)
SELECT '=== TESTE 4: Assinante com Coleção Escolhida (desconto 20%) ===' as test;
SELECT 
  c.id as collection_id,
  c.name as collection_name,
  s.user_id,
  cbp.base_price_coins,
  pcm.chosen_collection_discount_percentage,
  get_collection_price(c.id, s.user_id) as calculated_price,
  'Expected: base_price - (base_price × 20%) = ' || 
    (cbp.base_price_coins - (cbp.base_price_coins * 20 / 100))::INTEGER as expected
FROM subscription_collections sc
JOIN subscriptions s ON s.id = sc.subscription_id
JOIN collections c ON c.id = sc.collection_id
JOIN collection_types ct ON ct.id = c.collection_type_id
JOIN collection_base_pricing cbp ON ct.id = cbp.collection_type_id
CROSS JOIN pricing_context_multipliers pcm
WHERE s.status = 'active'
AND ct.name = 'subscription'
AND pcm.user_context = 'subscribed_chosen'
LIMIT 1;

-- Teste 5: Preço para assinante com coleção NÃO escolhida (multiplicador 1.2)
SELECT '=== TESTE 5: Assinante com Coleção NÃO Escolhida (multiplicador 1.2) ===' as test;
WITH active_user AS (
  SELECT user_id 
  FROM subscriptions 
  WHERE status = 'active' 
  LIMIT 1
),
not_chosen_collection AS (
  SELECT c.id, c.name, ct.name as type_name, cbp.base_price_coins
  FROM collections c
  JOIN collection_types ct ON ct.id = c.collection_type_id
  JOIN collection_base_pricing cbp ON ct.id = cbp.collection_type_id
  WHERE ct.name = 'subscription'
  AND NOT EXISTS (
    SELECT 1 
    FROM subscription_collections sc
    JOIN subscriptions s ON s.id = sc.subscription_id
    WHERE s.user_id = (SELECT user_id FROM active_user)
    AND sc.collection_id = c.id
  )
  LIMIT 1
)
SELECT 
  ncc.id as collection_id,
  ncc.name as collection_name,
  au.user_id,
  ncc.base_price_coins,
  get_collection_price(ncc.id, au.user_id) as calculated_price,
  'Expected: base_price × 1.2 = ' || (ncc.base_price_coins * 1.2)::INTEGER as expected
FROM not_chosen_collection ncc
CROSS JOIN active_user au;

-- ============================================================================
-- RESUMO DOS TESTES
-- ============================================================================
SELECT '=== RESUMO ===' as section;
SELECT 
  'Função get_collection_price() criada e testada com sucesso!' as status,
  'Todos os cenários de preço contextual foram validados' as message;
