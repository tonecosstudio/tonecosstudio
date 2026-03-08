-- ============================================================================
-- APLICAR NO SUPABASE DASHBOARD
-- SQL Editor → New Query → Cole este código → Run
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
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. Migrar dados existentes do campo 'address' (se houver)
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

-- 6. Criar view para facilitar consultas
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

-- 7. Criar função para verificar se usuário pode fazer pedido
CREATE OR REPLACE FUNCTION can_place_order(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = user_id 
      AND delivery_address IS NOT NULL
      AND validate_delivery_address(delivery_address)
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- 8. Verificação
SELECT 
  'delivery_address column' AS item,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'profiles' 
        AND column_name = 'delivery_address'
    ) THEN '✅ Created'
    ELSE '❌ Not created'
  END AS status
UNION ALL
SELECT 
  'validate_delivery_address function' AS item,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM pg_proc 
      WHERE proname = 'validate_delivery_address'
    ) THEN '✅ Created'
    ELSE '❌ Not created'
  END AS status
UNION ALL
SELECT 
  'can_place_order function' AS item,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM pg_proc 
      WHERE proname = 'can_place_order'
    ) THEN '✅ Created'
    ELSE '❌ Not created'
  END AS status
UNION ALL
SELECT 
  'profiles_with_delivery_info view' AS item,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM pg_views 
      WHERE viewname = 'profiles_with_delivery_info'
    ) THEN '✅ Created'
    ELSE '❌ Not created'
  END AS status;
