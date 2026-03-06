-- ============================================================================
-- Migration: Refactor Character Standalone Pricing - 4 Types
-- Description: Expandir de 2 tipos (standard/premium) para 4 tipos
--              (colecao_ativa, colecao_secundaria, catalogo_geral, premium)
-- Date: 2026-03-06 16:11:12
-- ============================================================================

-- ============================================================================
-- CONTEXTO:
-- Cada tipo de personagem em COINS deve ter seu preço correspondente em R$:
-- - Coleção Ativa (200 coins) → R$ 500
-- - Coleção Secundária (240 coins) → R$ 600
-- - Catálogo Geral (300 coins) → R$ 750
-- - Premium (450 coins) → R$ 900
-- ============================================================================

-- ============================================================================
-- PASSO 1: Desativar registros antigos ANTES de mudar constraint
-- ============================================================================

-- Desativar registros antigos
UPDATE character_standalone_pricing
SET is_active = false
WHERE character_type IN ('standard', 'premium');

-- ============================================================================
-- PASSO 2: Remover constraint antiga e adicionar novos tipos
-- ============================================================================

-- Remover constraint antiga
ALTER TABLE character_standalone_pricing 
  DROP CONSTRAINT IF EXISTS character_standalone_pricing_character_type_check;

-- Adicionar novo constraint com 4 tipos
ALTER TABLE character_standalone_pricing
  ADD CONSTRAINT character_standalone_pricing_character_type_check
  CHECK (character_type IN ('standard', 'premium', 'colecao_ativa', 'colecao_secundaria', 'catalogo_geral'));

-- ============================================================================
-- PASSO 3: Inserir novos valores
-- ============================================================================
INSERT INTO character_standalone_pricing (character_type, price_full, price_pix, pix_discount_percentage, description)
VALUES 
  (
    'colecao_ativa',
    500.00,
    475.00,
    5.00,
    'Coleção Ativa (200 coins) - Coleção escolhida pelo assinante'
  ),
  (
    'colecao_secundaria',
    600.00,
    570.00,
    5.00,
    'Coleção Secundária (240 coins) - Personagens de outras coleções disponíveis'
  ),
  (
    'catalogo_geral',
    750.00,
    712.50,
    5.00,
    'Catálogo Geral (300 coins) - Modelos especiais ou menos produzidos'
  ),
  (
    'premium',
    900.00,
    855.00,
    5.00,
    'Premium (450 coins) - Peças maiores ou mais complexas'
  )
ON CONFLICT (character_type, is_active) 
DO UPDATE SET
  price_full = EXCLUDED.price_full,
  price_pix = EXCLUDED.price_pix,
  pix_discount_percentage = EXCLUDED.pix_discount_percentage,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================================================
-- PASSO 4: Atualizar função get_character_standalone_price
-- ============================================================================

-- Dropar função antiga (tinha 2 parâmetros)
DROP FUNCTION IF EXISTS get_character_standalone_price(UUID, TEXT);

-- Criar nova função (com 3 parâmetros)
CREATE OR REPLACE FUNCTION get_character_standalone_price(
  p_character_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'full' -- 'full' ou 'pix'
)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_collection_id UUID;
  v_collection_type_name TEXT;
  v_has_subscription BOOLEAN;
  v_is_chosen BOOLEAN;
  v_character_type TEXT;
  v_price DECIMAL(10,2);
BEGIN
  -- 1. Buscar coleção do personagem
  SELECT collection_id INTO v_collection_id
  FROM collection_characters
  WHERE id = p_character_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Character not found: %', p_character_id;
  END IF;
  
  -- 2. Buscar tipo da coleção
  SELECT ct.name INTO v_collection_type_name
  FROM collections c
  JOIN collection_types ct ON c.collection_type_id = ct.id
  WHERE c.id = v_collection_id;
  
  -- 3. Determinar tipo de preço baseado no contexto
  
  -- CATÁLOGOS: Sempre catálogo_geral ou premium
  IF v_collection_type_name IN ('standard_catalog', 'premium_catalog') THEN
    IF v_collection_type_name = 'premium_catalog' THEN
      v_character_type := 'premium';
    ELSE
      v_character_type := 'catalogo_geral';
    END IF;
  
  -- SUBSCRIPTION: Verificar contexto do usuário
  ELSIF v_collection_type_name = 'subscription' THEN
    -- Verificar se usuário tem assinatura
    IF p_user_id IS NULL THEN
      v_has_subscription := false;
    ELSE
      SELECT EXISTS(
        SELECT 1 FROM subscriptions
        WHERE user_id = p_user_id AND status = 'active'
      ) INTO v_has_subscription;
    END IF;
    
    -- SEM ASSINATURA: Catálogo Geral
    IF NOT v_has_subscription THEN
      v_character_type := 'catalogo_geral';
    ELSE
      -- COM ASSINATURA: Verificar se é coleção escolhida
      SELECT EXISTS(
        SELECT 1 
        FROM subscription_collections sc
        JOIN subscriptions s ON s.id = sc.subscription_id
        WHERE s.user_id = p_user_id
        AND s.status = 'active'
        AND sc.collection_id = v_collection_id
      ) INTO v_is_chosen;
      
      IF v_is_chosen THEN
        v_character_type := 'colecao_ativa';
      ELSE
        v_character_type := 'colecao_secundaria';
      END IF;
    END IF;
  ELSE
    -- Tipo desconhecido: usar catálogo geral como padrão
    v_character_type := 'catalogo_geral';
  END IF;
  
  -- 4. Buscar preço
  IF p_payment_method = 'pix' THEN
    SELECT price_pix INTO v_price
    FROM character_standalone_pricing
    WHERE character_type = v_character_type
    AND is_active = true;
  ELSE
    SELECT price_full INTO v_price
    FROM character_standalone_pricing
    WHERE character_type = v_character_type
    AND is_active = true;
  END IF;
  
  IF v_price IS NULL THEN
    RAISE EXCEPTION 'Pricing not found for character type: %', v_character_type;
  END IF;
  
  RETURN v_price;
END;
$$;

COMMENT ON FUNCTION get_character_standalone_price IS 
  'Retorna preço em reais (R$) para compra avulsa de um personagem.
   Determina automaticamente o tipo baseado no contexto:
   - Coleção Ativa (assinante, coleção escolhida): colecao_ativa
   - Coleção Secundária (assinante, outra coleção): colecao_secundaria
   - Catálogo Geral (sem assinatura ou standard_catalog): catalogo_geral
   - Premium (premium_catalog): premium
   
   Parâmetros:
   - p_character_id: ID do personagem
   - p_user_id: ID do usuário (opcional, para determinar contexto)
   - p_payment_method: "full" (preço cheio) ou "pix" (com desconto)
   
   Retorna: Preço em reais (DECIMAL)';

-- ============================================================================
-- PASSO 5: Atualizar comentários
-- ============================================================================

COMMENT ON COLUMN character_standalone_pricing.character_type IS 
  'Tipo de personagem: colecao_ativa (200 coins), colecao_secundaria (240 coins), 
   catalogo_geral (300 coins), premium (450 coins)';

COMMENT ON TABLE character_standalone_pricing IS 
  'Preços em reais (R$) para compras avulsas de personagens. 
   Mapeamento direto com preços em coins:
   - Coleção Ativa (200 coins) → R$ 500
   - Coleção Secundária (240 coins) → R$ 600
   - Catálogo Geral (300 coins) → R$ 750
   - Premium (450 coins) → R$ 900
   
   Usado para clientes não assinantes e cálculo de cancelamento.';

-- ============================================================================
-- PASSO 6: Validação
-- ============================================================================

DO $$
DECLARE
  v_colecao_ativa_full DECIMAL(10,2);
  v_colecao_ativa_pix DECIMAL(10,2);
  v_colecao_secundaria_full DECIMAL(10,2);
  v_colecao_secundaria_pix DECIMAL(10,2);
  v_catalogo_geral_full DECIMAL(10,2);
  v_catalogo_geral_pix DECIMAL(10,2);
  v_premium_full DECIMAL(10,2);
  v_premium_pix DECIMAL(10,2);
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PREÇOS AVULSOS - 4 TIPOS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- Buscar preços
  SELECT price_full, price_pix INTO v_colecao_ativa_full, v_colecao_ativa_pix
  FROM character_standalone_pricing
  WHERE character_type = 'colecao_ativa' AND is_active = true;
  
  SELECT price_full, price_pix INTO v_colecao_secundaria_full, v_colecao_secundaria_pix
  FROM character_standalone_pricing
  WHERE character_type = 'colecao_secundaria' AND is_active = true;
  
  SELECT price_full, price_pix INTO v_catalogo_geral_full, v_catalogo_geral_pix
  FROM character_standalone_pricing
  WHERE character_type = 'catalogo_geral' AND is_active = true;
  
  SELECT price_full, price_pix INTO v_premium_full, v_premium_pix
  FROM character_standalone_pricing
  WHERE character_type = 'premium' AND is_active = true;
  
  RAISE NOTICE 'Coleção Ativa (200 coins):';
  RAISE NOTICE '  Preço Cheio: R$ %', v_colecao_ativa_full;
  RAISE NOTICE '  Preço PIX:   R$ %', v_colecao_ativa_pix;
  RAISE NOTICE '';
  RAISE NOTICE 'Coleção Secundária (240 coins):';
  RAISE NOTICE '  Preço Cheio: R$ %', v_colecao_secundaria_full;
  RAISE NOTICE '  Preço PIX:   R$ %', v_colecao_secundaria_pix;
  RAISE NOTICE '';
  RAISE NOTICE 'Catálogo Geral (300 coins):';
  RAISE NOTICE '  Preço Cheio: R$ %', v_catalogo_geral_full;
  RAISE NOTICE '  Preço PIX:   R$ %', v_catalogo_geral_pix;
  RAISE NOTICE '';
  RAISE NOTICE 'Premium (450 coins):';
  RAISE NOTICE '  Preço Cheio: R$ %', v_premium_full;
  RAISE NOTICE '  Preço PIX:   R$ %', v_premium_pix;
  RAISE NOTICE '';
  RAISE NOTICE 'Editável em: /admin/coins → Aba "Preços Avulsos"';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
