-- ============================================================================
-- Migration: Add Business Validations
-- Description: Funções de validação de regras de negócio para o sistema
-- Author: System
-- Date: 2026-03-07
-- Dependencies:
--   - user_coins table
--   - user_characters table (criada posteriormente)
--   - characters table
-- ============================================================================

-- ============================================================================
-- FUNÇÃO: Validar saldo suficiente de coins
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_sufficient_balance(
  p_user_id UUID,
  p_amount INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  -- Validar parâmetros
  IF p_user_id IS NULL OR p_amount IS NULL OR p_amount < 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Buscar saldo atual
  SELECT balance INTO v_balance
  FROM user_coins
  WHERE user_id = p_user_id;
  
  -- Se não tem registro, saldo é zero
  IF v_balance IS NULL THEN
    v_balance := 0;
  END IF;
  
  -- Retornar se tem saldo suficiente
  RETURN v_balance >= p_amount;
END;
$$;

COMMENT ON FUNCTION validate_sufficient_balance IS 
  'Valida se usuário tem saldo suficiente de coins para uma operação';

-- ============================================================================
-- FUNÇÃO: Verificar se personagem já foi adquirido
-- ============================================================================

CREATE OR REPLACE FUNCTION check_character_already_owned(
  p_user_id UUID,
  p_character_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Validar parâmetros
  IF p_user_id IS NULL OR p_character_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar se tabela user_characters existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_characters'
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar se já existe em user_characters
  EXECUTE format('
    SELECT EXISTS(
      SELECT 1 
      FROM user_characters
      WHERE user_id = $1
      AND character_id = $2
    )'
  ) INTO v_exists USING p_user_id, p_character_id;
  
  RETURN v_exists;
END;
$$;

COMMENT ON FUNCTION check_character_already_owned IS 
  'Verifica se usuário já possui o personagem especificado';

-- ============================================================================
-- FUNÇÃO: Validar disponibilidade de personagem
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_character_availability(
  p_character_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_is_available BOOLEAN;
BEGIN
  -- Validar parâmetro
  IF p_character_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar se personagem existe e está disponível
  SELECT EXISTS(
    SELECT 1 
    FROM characters
    WHERE id = p_character_id
    AND is_available = true
  ) INTO v_is_available;
  
  RETURN v_is_available;
END;
$$;

COMMENT ON FUNCTION validate_character_availability IS 
  'Valida se personagem está disponível para aquisição';

-- ============================================================================
-- FUNÇÃO: Validar compra de personagem (validação completa)
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_character_purchase(
  p_user_id UUID,
  p_character_id UUID,
  p_price_coins INTEGER
)
RETURNS TABLE (
  is_valid BOOLEAN,
  error_code TEXT,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Validar parâmetros
  IF p_user_id IS NULL THEN
    RETURN QUERY SELECT 
      false,
      'INVALID_USER'::TEXT,
      'ID de usuário inválido'::TEXT;
    RETURN;
  END IF;
  
  IF p_character_id IS NULL THEN
    RETURN QUERY SELECT 
      false,
      'INVALID_CHARACTER'::TEXT,
      'ID de personagem inválido'::TEXT;
    RETURN;
  END IF;
  
  IF p_price_coins IS NULL OR p_price_coins < 0 THEN
    RETURN QUERY SELECT 
      false,
      'INVALID_PRICE'::TEXT,
      'Preço inválido'::TEXT;
    RETURN;
  END IF;
  
  -- Validar se personagem está disponível
  IF NOT validate_character_availability(p_character_id) THEN
    RETURN QUERY SELECT 
      false,
      'CHARACTER_UNAVAILABLE'::TEXT,
      'Personagem não está disponível para compra'::TEXT;
    RETURN;
  END IF;
  
  -- Validar se usuário já possui o personagem
  IF check_character_already_owned(p_user_id, p_character_id) THEN
    RETURN QUERY SELECT 
      false,
      'CHARACTER_ALREADY_OWNED'::TEXT,
      'Você já possui este personagem'::TEXT;
    RETURN;
  END IF;
  
  -- Validar saldo suficiente
  IF NOT validate_sufficient_balance(p_user_id, p_price_coins) THEN
    RETURN QUERY SELECT 
      false,
      'INSUFFICIENT_BALANCE'::TEXT,
      'Saldo de coins insuficiente'::TEXT;
    RETURN;
  END IF;
  
  -- Tudo válido
  RETURN QUERY SELECT 
    true,
    NULL::TEXT,
    NULL::TEXT;
END;
$$;

COMMENT ON FUNCTION validate_character_purchase IS 
  'Valida todos os requisitos para compra de personagem com coins. Retorna is_valid, error_code e error_message';

-- ============================================================================
-- GRANTS: Permitir execução das funções
-- ============================================================================

GRANT EXECUTE ON FUNCTION validate_sufficient_balance(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION check_character_already_owned(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_character_availability(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_character_purchase(UUID, UUID, INTEGER) TO authenticated;

-- ============================================================================
-- SUCESSO
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VALIDAÇÕES DE NEGÓCIO CRIADAS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ validate_sufficient_balance(user_id, amount)';
  RAISE NOTICE '   Valida se usuário tem saldo suficiente';
  RAISE NOTICE '';
  RAISE NOTICE '✅ check_character_already_owned(user_id, character_id)';
  RAISE NOTICE '   Verifica se usuário já possui personagem';
  RAISE NOTICE '';
  RAISE NOTICE '✅ validate_character_availability(character_id)';
  RAISE NOTICE '   Valida se personagem está disponível';
  RAISE NOTICE '';
  RAISE NOTICE '✅ validate_character_purchase(user_id, character_id, price)';
  RAISE NOTICE '   Validação completa de compra de personagem';
  RAISE NOTICE '';
  RAISE NOTICE 'Todas as funções foram criadas com sucesso!';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
