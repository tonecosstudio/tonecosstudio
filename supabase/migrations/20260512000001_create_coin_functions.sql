-- ============================================================================
-- Migration: Create Coin System Functions
-- Description: Funções SQL para operações com coins (débito, crédito, compra)
-- Spec: contextual-pricing-system (RN006, RN007)
-- Author: System
-- Date: 2026-05-12
-- ============================================================================

-- ============================================================================
-- FUNÇÃO: add_coins_to_user
-- Descrição: Adiciona coins ao saldo do usuário (compra, bônus, crédito)
-- ============================================================================

CREATE OR REPLACE FUNCTION add_coins_to_user(
  p_user_id UUID,
  p_amount INTEGER,
  p_transaction_type TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  new_balance INTEGER,
  transaction_id UUID
) AS $$
DECLARE
  v_new_balance INTEGER;
  v_transaction_id UUID;
BEGIN
  -- Validações
  IF p_amount <= 0 THEN
    RETURN QUERY SELECT false, 'Amount must be positive', 0, NULL::UUID;
    RETURN;
  END IF;
  
  IF p_transaction_type NOT IN ('purchase', 'bonus', 'subscription_credit', 'refund') THEN
    RETURN QUERY SELECT false, 'Invalid transaction type for adding coins', 0, NULL::UUID;
    RETURN;
  END IF;
  
  -- Criar registro de coins se não existir
  INSERT INTO user_coins (user_id, balance, total_earned, total_spent)
  VALUES (p_user_id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Atualizar saldo (com lock pessimista para evitar race conditions)
  UPDATE user_coins
  SET 
    balance = balance + p_amount,
    total_earned = total_earned + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;
  
  -- Registrar transação
  INSERT INTO coin_transactions (
    user_id,
    amount,
    transaction_type,
    reference_id,
    reference_type,
    description,
    metadata
  ) VALUES (
    p_user_id,
    p_amount,
    p_transaction_type,
    p_reference_id,
    p_reference_type,
    COALESCE(p_description, format('Added %s coins (%s)', p_amount, p_transaction_type)),
    p_metadata
  )
  RETURNING id INTO v_transaction_id;
  
  -- Retornar sucesso
  RETURN QUERY SELECT 
    true,
    format('Successfully added %s coins. New balance: %s', p_amount, v_new_balance),
    v_new_balance,
    v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION add_coins_to_user IS 
  'Adiciona coins ao saldo do usuário de forma atômica e registra transação';

-- ============================================================================
-- FUNÇÃO: debit_coins_from_user
-- Descrição: Debita coins do saldo do usuário (compra de personagem)
-- ============================================================================

CREATE OR REPLACE FUNCTION debit_coins_from_user(
  p_user_id UUID,
  p_amount INTEGER,
  p_reference_id UUID,
  p_reference_type TEXT,
  p_description TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  new_balance INTEGER,
  transaction_id UUID
) AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_transaction_id UUID;
BEGIN
  -- Validações
  IF p_amount <= 0 THEN
    RETURN QUERY SELECT false, 'Amount must be positive', 0, NULL::UUID;
    RETURN;
  END IF;
  
  -- Buscar saldo atual (com lock pessimista)
  SELECT balance INTO v_current_balance
  FROM user_coins
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- Verificar se usuário tem registro de coins
  IF v_current_balance IS NULL THEN
    RETURN QUERY SELECT 
      false, 
      'User does not have a coins account',
      0,
      NULL::UUID;
    RETURN;
  END IF;
  
  -- Verificar saldo suficiente
  IF v_current_balance < p_amount THEN
    RETURN QUERY SELECT 
      false,
      format('Insufficient balance. Required: %s coins, Available: %s coins', p_amount, v_current_balance),
      v_current_balance,
      NULL::UUID;
    RETURN;
  END IF;
  
  -- Debitar coins
  UPDATE user_coins
  SET 
    balance = balance - p_amount,
    total_spent = total_spent + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;
  
  -- Registrar transação
  INSERT INTO coin_transactions (
    user_id,
    amount,
    transaction_type,
    reference_id,
    reference_type,
    description
  ) VALUES (
    p_user_id,
    -p_amount,  -- Negativo para débito
    'spend',
    p_reference_id,
    p_reference_type,
    p_description
  )
  RETURNING id INTO v_transaction_id;
  
  -- Retornar sucesso
  RETURN QUERY SELECT 
    true,
    format('Successfully debited %s coins. New balance: %s', p_amount, v_new_balance),
    v_new_balance,
    v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION debit_coins_from_user IS 
  'Debita coins do saldo do usuário de forma atômica com validação de saldo';

-- ============================================================================
-- FUNÇÃO: purchase_character_with_coins
-- Descrição: Compra personagem usando coins (integra com sistema de preços)
-- Spec: RN006 - Integração com Sistema de Coins
-- ============================================================================

CREATE OR REPLACE FUNCTION purchase_character_with_coins(
  p_user_id UUID,
  p_character_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  new_balance INTEGER,
  price_paid INTEGER
) AS $$
DECLARE
  v_price INTEGER;
  v_character_name TEXT;
  v_collection_name TEXT;
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_debit_result RECORD;
BEGIN
  -- 1. Verificar se personagem existe
  SELECT c.name, col.name
  INTO v_character_name, v_collection_name
  FROM collection_characters c
  JOIN collections col ON col.id = c.collection_id
  WHERE c.id = p_character_id;
  
  IF v_character_name IS NULL THEN
    RETURN QUERY SELECT 
      false,
      'Character not found',
      0,
      0;
    RETURN;
  END IF;
  
  -- 2. Verificar se usuário já possui o personagem
  IF EXISTS (
    SELECT 1 FROM user_characters
    WHERE user_id = p_user_id 
    AND character_id = p_character_id
  ) THEN
    RETURN QUERY SELECT 
      false,
      'You already own this character',
      0,
      0;
    RETURN;
  END IF;
  
  -- 3. Calcular preço contextual usando função existente
  v_price := get_character_price(p_character_id, p_user_id);
  
  IF v_price IS NULL OR v_price <= 0 THEN
    RETURN QUERY SELECT 
      false,
      'Unable to calculate character price',
      0,
      0;
    RETURN;
  END IF;
  
  -- 4. Debitar coins (com validação de saldo)
  SELECT * INTO v_debit_result
  FROM debit_coins_from_user(
    p_user_id,
    v_price,
    p_character_id,
    'character',
    format('Purchase: %s (%s) - %s coins', v_character_name, v_collection_name, v_price)
  );
  
  -- Verificar se débito foi bem-sucedido
  IF NOT v_debit_result.success THEN
    RETURN QUERY SELECT 
      false,
      v_debit_result.message,
      v_debit_result.new_balance,
      v_price;
    RETURN;
  END IF;
  
  -- 5. Adicionar personagem ao usuário
  INSERT INTO user_characters (
    user_id,
    character_id,
    acquired_at,
    acquisition_type,
    price_paid
  ) VALUES (
    p_user_id,
    p_character_id,
    NOW(),
    'coin_purchase',
    v_price
  );
  
  -- 6. Retornar sucesso
  RETURN QUERY SELECT 
    true,
    format('%s acquired successfully! New balance: %s coins', v_character_name, v_debit_result.new_balance),
    v_debit_result.new_balance,
    v_price;
    
EXCEPTION
  WHEN OTHERS THEN
    -- Rollback automático em caso de erro
    RETURN QUERY SELECT 
      false,
      format('Error purchasing character: %s', SQLERRM),
      0,
      0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION purchase_character_with_coins IS 
  'Compra personagem com coins de forma atômica: valida saldo, debita coins, adiciona personagem';

-- ============================================================================
-- FUNÇÃO: get_user_coin_balance
-- Descrição: Retorna saldo de coins do usuário (helper para queries)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_coin_balance(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  SELECT balance INTO v_balance
  FROM user_coins
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(v_balance, 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_user_coin_balance IS 
  'Retorna saldo de coins do usuário (0 se não existir registro)';

-- ============================================================================
-- FUNÇÃO: validate_coin_balance
-- Descrição: Valida se usuário tem saldo suficiente
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_coin_balance(
  p_user_id UUID,
  p_required_amount INTEGER
)
RETURNS TABLE (
  has_sufficient BOOLEAN,
  current_balance INTEGER,
  required_amount INTEGER,
  missing_amount INTEGER
) AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  v_balance := get_user_coin_balance(p_user_id);
  
  RETURN QUERY SELECT 
    v_balance >= p_required_amount,
    v_balance,
    p_required_amount,
    GREATEST(0, p_required_amount - v_balance);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION validate_coin_balance IS 
  'Valida se usuário tem saldo suficiente e retorna detalhes';

-- ============================================================================
-- FUNÇÃO: admin_adjust_coins
-- Descrição: Permite admin ajustar saldo de coins manualmente
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_adjust_coins(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_admin_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  new_balance INTEGER
) AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_new_balance INTEGER;
BEGIN
  -- Verificar se quem está chamando é admin
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_admin_id
    AND role = 'admin'
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RETURN QUERY SELECT 
      false,
      'Unauthorized: Only admins can adjust coins',
      0;
    RETURN;
  END IF;
  
  -- Validar amount
  IF p_amount = 0 THEN
    RETURN QUERY SELECT 
      false,
      'Amount cannot be zero',
      0;
    RETURN;
  END IF;
  
  -- Criar registro de coins se não existir
  INSERT INTO user_coins (user_id, balance, total_earned, total_spent)
  VALUES (p_user_id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Ajustar saldo
  IF p_amount > 0 THEN
    -- Adicionar coins
    UPDATE user_coins
    SET 
      balance = balance + p_amount,
      total_earned = total_earned + p_amount,
      updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING balance INTO v_new_balance;
  ELSE
    -- Remover coins (verificar saldo)
    UPDATE user_coins
    SET 
      balance = balance + p_amount,  -- p_amount já é negativo
      total_spent = total_spent + ABS(p_amount),
      updated_at = NOW()
    WHERE user_id = p_user_id
    AND balance >= ABS(p_amount)
    RETURNING balance INTO v_new_balance;
    
    IF v_new_balance IS NULL THEN
      RETURN QUERY SELECT 
        false,
        'Insufficient balance for adjustment',
        0;
      RETURN;
    END IF;
  END IF;
  
  -- Registrar transação
  INSERT INTO coin_transactions (
    user_id,
    amount,
    transaction_type,
    description,
    metadata
  ) VALUES (
    p_user_id,
    p_amount,
    'admin_adjustment',
    format('Admin adjustment: %s', p_reason),
    jsonb_build_object('admin_id', p_admin_id, 'reason', p_reason)
  );
  
  -- Retornar sucesso
  RETURN QUERY SELECT 
    true,
    format('Coins adjusted successfully. New balance: %s', v_new_balance),
    v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION admin_adjust_coins IS 
  'Permite admin ajustar saldo de coins manualmente (positivo ou negativo)';

-- ============================================================================
-- SUCESSO
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Coin system functions created successfully';
  RAISE NOTICE '✅ add_coins_to_user() - Add coins to user balance';
  RAISE NOTICE '✅ debit_coins_from_user() - Debit coins from user';
  RAISE NOTICE '✅ purchase_character_with_coins() - Purchase character with coins';
  RAISE NOTICE '✅ get_user_coin_balance() - Get user balance';
  RAISE NOTICE '✅ validate_coin_balance() - Validate sufficient balance';
  RAISE NOTICE '✅ admin_adjust_coins() - Admin manual adjustment';
END $$;
