-- ============================================================================
-- APLICAR NO SUPABASE DASHBOARD
-- SQL Editor → New Query → Cole este código → Run
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

-- 2. Atualizar função can_place_order
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

-- 4. Criar view
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

-- 5. Verificação
SELECT 
  'validate_profile_for_order' AS item,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'validate_profile_for_order')
    THEN '✅ Created'
    ELSE '❌ Not created'
  END AS status
UNION ALL
SELECT 
  'can_place_order (updated)' AS item,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'can_place_order')
    THEN '✅ Updated'
    ELSE '❌ Not updated'
  END AS status
UNION ALL
SELECT 
  'get_missing_profile_fields' AS item,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_missing_profile_fields')
    THEN '✅ Created'
    ELSE '❌ Not created'
  END AS status
UNION ALL
SELECT 
  'profiles_order_readiness view' AS item,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'profiles_order_readiness')
    THEN '✅ Created'
    ELSE '❌ Not created'
  END AS status;

-- 6. Testar com usuários existentes
SELECT 
  full_name,
  email,
  can_order,
  missing_fields
FROM profiles_order_readiness
LIMIT 10;
