-- ============================================================================
-- Migration: Add Structured Delivery Address Fields
-- Makes delivery address mandatory for orders
-- ============================================================================

-- 1. Adicionar campos estruturados de endereço
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS delivery_address JSONB DEFAULT NULL;

-- 2. Comentários explicativos
COMMENT ON COLUMN public.profiles.delivery_address IS 
  'Structured delivery address in JSON format: {
    "street": "Rua Example",
    "number": "123",
    "complement": "Apt 45",
    "neighborhood": "Bairro",
    "city": "Cidade",
    "state": "UF",
    "zipCode": "12345-678",
    "country": "Brasil"
  }';

-- 3. Criar índice para busca por CEP
CREATE INDEX IF NOT EXISTS idx_profiles_delivery_address_zip 
ON public.profiles USING gin ((delivery_address->'zipCode'));

-- 4. Criar função de validação de endereço
CREATE OR REPLACE FUNCTION validate_delivery_address(address JSONB)
RETURNS BOOLEAN AS $
BEGIN
  -- Verificar se todos os campos obrigatórios existem
  IF address IS NULL THEN
    RETURN FALSE;
  END IF;
  
  IF NOT (
    address ? 'street' AND
    address ? 'number' AND
    address ? 'neighborhood' AND
    address ? 'city' AND
    address ? 'state' AND
    address ? 'zipCode'
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar se os campos não estão vazios
  IF (
    TRIM(address->>'street') = '' OR
    TRIM(address->>'number') = '' OR
    TRIM(address->>'neighborhood') = '' OR
    TRIM(address->>'city') = '' OR
    TRIM(address->>'state') = '' OR
    TRIM(address->>'zipCode') = ''
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Validar formato do CEP (12345-678 ou 12345678)
  IF NOT (address->>'zipCode' ~ '^\d{5}-?\d{3}$') THEN
    RETURN FALSE;
  END IF;
  
  -- Validar UF (2 letras maiúsculas)
  IF NOT (address->>'state' ~ '^[A-Z]{2}$') THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$ LANGUAGE plpgsql IMMUTABLE;

-- 5. Criar constraint de validação (comentado para não bloquear dados existentes)
-- Descomentar após todos os usuários cadastrarem endereço
-- ALTER TABLE public.profiles
-- ADD CONSTRAINT check_delivery_address_valid
-- CHECK (delivery_address IS NULL OR validate_delivery_address(delivery_address));

-- 6. Migrar dados existentes do campo 'address' (se houver)
UPDATE public.profiles
SET delivery_address = jsonb_build_object(
  'street', address,
  'number', '',
  'complement', '',
  'neighborhood', '',
  'city', '',
  'state', '',
  'zipCode', '',
  'country', 'Brasil'
)
WHERE address IS NOT NULL 
  AND address != '' 
  AND delivery_address IS NULL;

-- 7. Criar view para facilitar consultas
CREATE OR REPLACE VIEW public.profiles_with_delivery_info AS
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.phone,
  p.delivery_address,
  CASE 
    WHEN p.delivery_address IS NOT NULL 
      AND validate_delivery_address(p.delivery_address) 
    THEN true 
    ELSE false 
  END AS has_valid_delivery_address,
  p.delivery_address->>'street' AS street,
  p.delivery_address->>'number' AS number,
  p.delivery_address->>'complement' AS complement,
  p.delivery_address->>'neighborhood' AS neighborhood,
  p.delivery_address->>'city' AS city,
  p.delivery_address->>'state' AS state,
  p.delivery_address->>'zipCode' AS zip_code,
  COALESCE(p.delivery_address->>'country', 'Brasil') AS country
FROM public.profiles p;

-- 8. Criar função para verificar se usuário pode fazer pedido
CREATE OR REPLACE FUNCTION can_place_order(user_id UUID)
RETURNS BOOLEAN AS $
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = user_id 
      AND delivery_address IS NOT NULL
      AND validate_delivery_address(delivery_address)
  );
END;
$ LANGUAGE plpgsql STABLE;

-- 9. Comentários nas funções
COMMENT ON FUNCTION validate_delivery_address IS 
  'Validates that a delivery address has all required fields and correct format';

COMMENT ON FUNCTION can_place_order IS 
  'Checks if a user has a valid delivery address to place orders';

COMMENT ON VIEW profiles_with_delivery_info IS 
  'View with flattened delivery address fields for easy querying';

-- ============================================================================
-- Verificação
-- ============================================================================

DO $
BEGIN
  -- Verificar se coluna foi criada
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
      AND column_name = 'delivery_address'
  ) THEN
    RAISE NOTICE 'Column delivery_address created successfully';
  ELSE
    RAISE EXCEPTION 'Column delivery_address was not created';
  END IF;
  
  -- Verificar se funções foram criadas
  IF EXISTS (
    SELECT 1 
    FROM pg_proc 
    WHERE proname = 'validate_delivery_address'
  ) THEN
    RAISE NOTICE 'Function validate_delivery_address created successfully';
  ELSE
    RAISE EXCEPTION 'Function validate_delivery_address was not created';
  END IF;
  
  IF EXISTS (
    SELECT 1 
    FROM pg_proc 
    WHERE proname = 'can_place_order'
  ) THEN
    RAISE NOTICE 'Function can_place_order created successfully';
  ELSE
    RAISE EXCEPTION 'Function can_place_order was not created';
  END IF;
END $;

-- ============================================================================
-- Summary
-- ============================================================================
SELECT 
  '20260308220000_add_structured_delivery_address.sql' AS migration_file,
  'Add structured delivery address fields to profiles' AS description,
  'SUCCESS' AS status,
  NOW() AS executed_at;
