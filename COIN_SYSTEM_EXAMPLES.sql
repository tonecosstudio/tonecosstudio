-- ============================================================================
-- Sistema de Coins - Exemplos de Uso
-- ============================================================================

-- ============================================================================
-- 1. ADICIONAR COINS AO USUÁRIO
-- ============================================================================

-- Exemplo 1: Compra de pacote Premium
SELECT * FROM add_coins_to_user(
  p_user_id := '123e4567-e89b-12d3-a456-426614174000',
  p_amount := 6500,  -- 5000 + 1500 bônus
  p_transaction_type := 'purchase',
  p_reference_id := 'package-premium-uuid',
  p_reference_type := 'package',
  p_description := 'Compra de pacote Premium',
  p_metadata := '{"package_name": "Premium", "base": 5000, "bonus": 1500, "price_brl": 35.00}'::jsonb
);

-- Exemplo 2: Bônus de boas-vindas
SELECT * FROM add_coins_to_user(
  p_user_id := '123e4567-e89b-12d3-a456-426614174000',
  p_amount := 500,
  p_transaction_type := 'bonus',
  p_description := 'Bônus de boas-vindas'
);

-- Exemplo 3: Crédito de assinatura mensal
SELECT * FROM add_coins_to_user(
  p_user_id := '123e4567-e89b-12d3-a456-426614174000',
  p_amount := 2000,
  p_transaction_type := 'subscription_credit',
  p_reference_id := 'subscription-uuid',
  p_reference_type := 'subscription',
  p_description := 'Crédito mensal - Plano Premium'
);

-- ============================================================================
-- 2. CONSULTAR SALDO
-- ============================================================================

-- Saldo simples
SELECT get_user_coin_balance('123e4567-e89b-12d3-a456-426614174000');

-- Saldo detalhado
SELECT * FROM user_coins 
WHERE user_id = '123e4567-e89b-12d3-a456-426614174000';

-- ============================================================================
-- 3. VALIDAR SALDO ANTES DE COMPRA
-- ============================================================================

SELECT * FROM validate_coin_balance(
  p_user_id := '123e4567-e89b-12d3-a456-426614174000',
  p_required_amount := 1200
);

-- Resultado:
-- has_sufficient | current_balance | required_amount | missing_amount
-- true           | 5000            | 1200            | 0

-- ============================================================================
-- 4. COMPRAR PERSONAGEM COM COINS (FUNÇÃO COMPLETA)
-- ============================================================================

-- Compra simples
SELECT * FROM purchase_character_with_coins(
  p_user_id := '123e4567-e89b-12d3-a456-426614174000',
  p_character_id := 'character-hulk-uuid'
);

-- Resultado (sucesso):
-- success | message                                      | new_balance | price_paid
-- true    | Hulk acquired successfully! New balance: ... | 3800        | 1200

-- Resultado (saldo insuficiente):
-- success | message                                      | new_balance | price_paid
-- false   | Insufficient balance. Required: 1200...      | 500         | 1200

-- Resultado (já possui):
-- success | message                                      | new_balance | price_paid
-- false   | You already own this character               | 5000        | 1200

-- ============================================================================
-- 5. DEBITAR COINS MANUALMENTE (RARO - USE purchase_character_with_coins)
-- ============================================================================

SELECT * FROM debit_coins_from_user(
  p_user_id := '123e4567-e89b-12d3-a456-426614174000',
  p_amount := 1200,
  p_reference_id := 'character-uuid',
  p_reference_type := 'character',
  p_description := 'Purchase: Hulk (Vingadores) - 1200 coins'
);

-- ============================================================================
-- 6. AJUSTE MANUAL PELO ADMIN
-- ============================================================================

-- Adicionar coins (compensação)
SELECT * FROM admin_adjust_coins(
  p_user_id := '123e4567-e89b-12d3-a456-426614174000',
  p_amount := 1000,  -- Positivo = adicionar
  p_reason := 'Compensação por bug no sistema',
  p_admin_id := 'admin-uuid'
);

-- Remover coins (correção)
SELECT * FROM admin_adjust_coins(
  p_user_id := '123e4567-e89b-12d3-a456-426614174000',
  p_amount := -500,  -- Negativo = remover
  p_reason := 'Correção de duplicação de coins',
  p_admin_id := 'admin-uuid'
);

-- ============================================================================
-- 7. CONSULTAR HISTÓRICO DE TRANSAÇÕES
-- ============================================================================

-- Últimas 10 transações
SELECT 
  id,
  amount,
  transaction_type,
  description,
  created_at
FROM coin_transactions
WHERE user_id = '123e4567-e89b-12d3-a456-426614174000'
ORDER BY created_at DESC
LIMIT 10;

-- Transações por tipo
SELECT 
  transaction_type,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM coin_transactions
WHERE user_id = '123e4567-e89b-12d3-a456-426614174000'
GROUP BY transaction_type
ORDER BY total_amount DESC;

-- Gastos em personagens
SELECT 
  ct.description,
  ct.amount,
  ct.created_at,
  uc.character_id
FROM coin_transactions ct
LEFT JOIN user_characters uc ON uc.user_id = ct.user_id 
  AND uc.character_id = ct.reference_id
WHERE ct.user_id = '123e4567-e89b-12d3-a456-426614174000'
AND ct.transaction_type = 'spend'
ORDER BY ct.created_at DESC;

-- ============================================================================
-- 8. CONSULTAR PERSONAGENS DO USUÁRIO
-- ============================================================================

-- Todos os personagens
SELECT 
  uc.id,
  uc.character_id,
  cc.name as character_name,
  c.name as collection_name,
  uc.acquisition_type,
  uc.price_paid,
  uc.acquired_at
FROM user_characters uc
JOIN collection_characters cc ON cc.id = uc.character_id
JOIN collections c ON c.id = cc.collection_id
WHERE uc.user_id = '123e4567-e89b-12d3-a456-426614174000'
ORDER BY uc.acquired_at DESC;

-- Apenas comprados com coins
SELECT 
  uc.id,
  cc.name as character_name,
  uc.price_paid,
  uc.acquired_at
FROM user_characters uc
JOIN collection_characters cc ON cc.id = uc.character_id
WHERE uc.user_id = '123e4567-e89b-12d3-a456-426614174000'
AND uc.acquisition_type = 'coin_purchase'
ORDER BY uc.acquired_at DESC;

-- ============================================================================
-- 9. CONSULTAR PACOTES DE COINS DISPONÍVEIS
-- ============================================================================

SELECT 
  id,
  name,
  amount,
  bonus,
  (amount + bonus) as total_coins,
  price_brl,
  ROUND((bonus::DECIMAL / amount * 100), 0) as bonus_percentage,
  is_popular,
  is_best_value
FROM coin_packages
WHERE is_active = true
ORDER BY sort_order;

-- ============================================================================
-- 10. ESTATÍSTICAS DO SISTEMA (ADMIN)
-- ============================================================================

-- Total de coins em circulação
SELECT 
  COUNT(*) as total_users,
  SUM(balance) as total_coins_in_circulation,
  SUM(total_earned) as total_coins_earned,
  SUM(total_spent) as total_coins_spent,
  AVG(balance) as avg_balance_per_user
FROM user_coins;

-- Transações por tipo (últimos 30 dias)
SELECT 
  transaction_type,
  COUNT(*) as count,
  SUM(ABS(amount)) as total_amount
FROM coin_transactions
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY transaction_type
ORDER BY total_amount DESC;

-- Top 10 usuários com mais coins
SELECT 
  uc.user_id,
  p.email,
  p.full_name,
  uc.balance,
  uc.total_earned,
  uc.total_spent
FROM user_coins uc
JOIN profiles p ON p.id = uc.user_id
ORDER BY uc.balance DESC
LIMIT 10;

-- Personagens mais comprados (com coins)
SELECT 
  cc.name as character_name,
  c.name as collection_name,
  COUNT(*) as purchase_count,
  AVG(uc.price_paid) as avg_price,
  SUM(uc.price_paid) as total_revenue_coins
FROM user_characters uc
JOIN collection_characters cc ON cc.id = uc.character_id
JOIN collections c ON c.id = cc.collection_id
WHERE uc.acquisition_type = 'coin_purchase'
GROUP BY cc.id, cc.name, c.name
ORDER BY purchase_count DESC
LIMIT 10;

-- ============================================================================
-- 11. TESTES DE INTEGRAÇÃO
-- ============================================================================

-- Teste completo: Adicionar coins → Comprar personagem → Verificar
DO $$
DECLARE
  v_user_id UUID := '123e4567-e89b-12d3-a456-426614174000';
  v_character_id UUID := 'character-test-uuid';
  v_result RECORD;
BEGIN
  -- 1. Adicionar coins
  SELECT * INTO v_result FROM add_coins_to_user(
    v_user_id,
    5000,
    'purchase',
    NULL,
    'package',
    'Teste de compra'
  );
  
  RAISE NOTICE 'Coins added: %', v_result.message;
  
  -- 2. Comprar personagem
  SELECT * INTO v_result FROM purchase_character_with_coins(
    v_user_id,
    v_character_id
  );
  
  RAISE NOTICE 'Purchase result: %', v_result.message;
  
  -- 3. Verificar saldo final
  RAISE NOTICE 'Final balance: %', get_user_coin_balance(v_user_id);
END $$;

-- ============================================================================
-- 12. LIMPEZA (APENAS PARA TESTES)
-- ============================================================================

-- CUIDADO: Isso apaga TODOS os dados de coins de um usuário
-- DELETE FROM user_characters WHERE user_id = 'test-user-uuid';
-- DELETE FROM coin_transactions WHERE user_id = 'test-user-uuid';
-- DELETE FROM user_coins WHERE user_id = 'test-user-uuid';
