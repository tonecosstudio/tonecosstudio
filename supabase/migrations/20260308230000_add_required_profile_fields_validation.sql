-- ============================================================================
-- Migration: Add Required Profile Fields Validation
-- Makes name, CPF, phone/email mandatory for orders
-- ============================================================================

-- 1. Criar função para validar perfil completo
CREATE OR REPLACE FUNCTION validate_profile_for_order(user_id UUID)
RETURNS TABLE(
  is_valid BOOLEAN,
  missing_fields TEXT[]
) AS $$
DECLARE
  profile_data RECORD;
  missing TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Buscar dados do perfil
  SELECT 
    p.full_name,
    p.cpf,
    p.phone,
    p.whatsapp,
    p.email,
    p.delivery_address
  INTO profile_data
  FROM profiles p
  WHERE p.id = user_id;

  -- Verificar campos obrigatórios
  IF profile_data.full_name IS NULL OR TRIM(profile_data.full_name) = '' THEN
    missing := array_append(missing, 'Nome completo');
  END IF;

  IF profile_data.cpf IS NULL OR TRIM(profile_data.cpf) = '' THEN
    missing := array_append(missing, 'CPF');
  END IF;

  -- Telefone OU WhatsApp (pelo menos um)
  IF (profile_data.phone IS NULL OR TRIM(profile_data.phone) = '') 
     AND (profile_data.whatsapp IS NULL OR TRIM(profile_data.whatsapp) = '') THEN
    missing := array_append(missing, 'Telefone ou WhatsApp');
  END IF;

  -- Email (geralmente já existe do auth, mas validar)
  IF profile_data.email IS NULL OR TRIM(profile_data.email) = '' THEN
    missing := array_append(missing, 'Email');
  END IF;

  -- Endereço de entrega
  IF profile_data.delivery_address IS NULL 
     OR NOT validate_delivery_address(profile_data.delivery_address) THEN
    missing := array_append(missing, 'Endereço de entrega completo');
  END IF;

  -- Retornar resultado
  RETURN QUERY SELECT 
    (array_length(missing, 1) IS NULL OR array_length(missing, 1) = 0) AS is_valid,
    missing AS missing_fields;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Atualizar função can_place_order para usar validação completa
CREATE OR REPLACE FUNCTION can_place_order(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  validation_result RECORD;
BEGIN
  SELECT is_valid INTO validation_result
  FROM validate_profile_for_order(user_id);
  
  RETURN COALESCE(validation_result.is_valid, FALSE);
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. Criar função para obter campos faltantes
CREATE OR REPLACE FUNCTION get_missing_profile_fields(user_id UUID)
RETURNS TEXT[] AS $$
DECLARE
  validation_result RECORD;
BEGIN
  SELECT missing_fields INTO validation_result
  FROM validate_profile_for_order(user_id);
  
  RETURN COALESCE(validation_result.missing_fields, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. Criar view para facilitar consultas
CREATE OR REPLACE VIEW profiles_order_readiness AS
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.cpf,
  p.phone,
  p.whatsapp,
  p.delivery_address,
  v.is_valid AS can_order,
  v.missing_fields
FROM profiles p
CROSS JOIN LATERAL validate_profile_for_order(p.id) v;

-- 5. Comentários
COMMENT ON FUNCTION validate_profile_for_order IS 
  'Validates if a user profile has all required fields to place an order';

COMMENT ON FUNCTION can_place_order IS 
  'Returns true if user can place orders (has all required fields)';

COMMENT ON FUNCTION get_missing_profile_fields IS 
  'Returns array of missing required fields for a user';

COMMENT ON VIEW profiles_order_readiness IS 
  'View showing which users can place orders and what fields are missing';

-- ============================================================================
-- Verificação
-- ============================================================================

DO $$
DECLARE
  test_result RECORD;
BEGIN
  -- Verificar se funções foram criadas
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'validate_profile_for_order'
  ) THEN
    RAISE NOTICE 'Function validate_profile_for_order created successfully';
  ELSE
    RAISE EXCEPTION 'Function validate_profile_for_order was not created';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'get_missing_profile_fields'
  ) THEN
    RAISE NOTICE 'Function get_missing_profile_fields created successfully';
  ELSE
    RAISE EXCEPTION 'Function get_missing_profile_fields was not created';
  END IF;

  -- Verificar se view foi criada
  IF EXISTS (
    SELECT 1 FROM pg_views WHERE viewname = 'profiles_order_readiness'
  ) THEN
    RAISE NOTICE 'View profiles_order_readiness created successfully';
  ELSE
    RAISE EXCEPTION 'View profiles_order_readiness was not created';
  END IF;
END $$;

-- ============================================================================
-- Exemplos de Uso
-- ============================================================================

-- Verificar se usuário pode fazer pedido
-- SELECT can_place_order('user-uuid-here');

-- Ver campos faltantes
-- SELECT get_missing_profile_fields('user-uuid-here');

-- Ver todos os usuários e status
-- SELECT * FROM profiles_order_readiness;

-- ============================================================================
-- Summary
-- ============================================================================
SELECT 
  '20260308230000_add_required_profile_fields_validation.sql' AS migration_file,
  'Add validation for required profile fields (name, CPF, phone, email, address)' AS description,
  'SUCCESS' AS status,
  NOW() AS executed_at;
