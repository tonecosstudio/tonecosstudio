-- ============================================================================
-- Migration: Add Character Standalone Pricing (Preços Avulsos em R$)
-- Description: Sistema de preços em reais para compras avulsas de personagens
-- Date: 2026-03-06 16:02:28
-- ============================================================================

-- ============================================================================
-- CONTEXTO:
-- - Personagens têm preços em COINS (200-450) para assinantes
-- - Personagens precisam de preços em REAIS (R$) para compras avulsas
-- - Preços devem ser editáveis via admin
-- - Usado para: compras avulsas, cálculo de cancelamento
-- ============================================================================

-- ============================================================================
-- PASSO 1: Criar tabela de preços avulsos de personagens
-- ============================================================================

CREATE TABLE IF NOT EXISTS character_standalone_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tipo de personagem
  character_type TEXT NOT NULL CHECK (character_type IN ('standard', 'premium')),
  
  -- Preços em reais
  price_full DECIMAL(10,2) NOT NULL CHECK (price_full > 0),
  price_pix DECIMAL(10,2) NOT NULL CHECK (price_pix > 0),
  
  -- Desconto PIX (calculado automaticamente)
  pix_discount_percentage DECIMAL(5,2) NOT NULL DEFAULT 5.00 CHECK (pix_discount_percentage >= 0 AND pix_discount_percentage <= 100),
  
  -- Descrição
  description TEXT,
  
  -- Controle
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Garantir apenas um registro ativo por tipo
  UNIQUE(character_type, is_active)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_character_standalone_pricing_type 
  ON character_standalone_pricing(character_type);

CREATE INDEX IF NOT EXISTS idx_character_standalone_pricing_active 
  ON character_standalone_pricing(is_active);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_character_standalone_pricing_updated_at
  BEFORE UPDATE ON character_standalone_pricing
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE character_standalone_pricing IS 
  'Preços em reais (R$) para compras avulsas de personagens. 
   Usado para clientes não assinantes e cálculo de cancelamento.';

COMMENT ON COLUMN character_standalone_pricing.character_type IS 
  'Tipo de personagem: standard (padrão) ou premium';

COMMENT ON COLUMN character_standalone_pricing.price_full IS 
  'Preço cheio em reais (sem desconto)';

COMMENT ON COLUMN character_standalone_pricing.price_pix IS 
  'Preço com desconto PIX em reais';

COMMENT ON COLUMN character_standalone_pricing.pix_discount_percentage IS 
  'Percentual de desconto PIX (padrão: 5%)';

-- ============================================================================
-- PASSO 2: Inserir valores padrão
-- ============================================================================

INSERT INTO character_standalone_pricing (character_type, price_full, price_pix, pix_discount_percentage, description)
VALUES 
  (
    'standard',
    500.00,
    475.00,
    5.00,
    'Personagem padrão - Preço para compras avulsas de personagens comuns'
  ),
  (
    'premium',
    900.00,
    855.00,
    5.00,
    'Personagem premium - Preço para compras avulsas de personagens premium (peças maiores ou mais complexas)'
  )
ON CONFLICT (character_type, is_active) 
DO UPDATE SET
  price_full = EXCLUDED.price_full,
  price_pix = EXCLUDED.price_pix,
  pix_discount_percentage = EXCLUDED.pix_discount_percentage,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================================================
-- PASSO 3: Criar função para calcular preço PIX automaticamente
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_character_pix_price()
RETURNS TRIGGER AS $$
BEGIN
  -- Calcular price_pix baseado em price_full e pix_discount_percentage
  NEW.price_pix := ROUND(NEW.price_full * (1 - NEW.pix_discount_percentage / 100), 2);
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular price_pix automaticamente
CREATE TRIGGER calculate_character_pix_price_trigger
  BEFORE INSERT OR UPDATE OF price_full, pix_discount_percentage
  ON character_standalone_pricing
  FOR EACH ROW
  EXECUTE FUNCTION calculate_character_pix_price();

COMMENT ON FUNCTION calculate_character_pix_price IS 
  'Calcula automaticamente price_pix baseado em price_full e pix_discount_percentage';

-- ============================================================================
-- PASSO 4: Criar função para buscar preço de personagem avulso
-- ============================================================================

CREATE OR REPLACE FUNCTION get_character_standalone_price(
  p_character_id UUID,
  p_payment_method TEXT DEFAULT 'full' -- 'full' ou 'pix'
)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_is_premium BOOLEAN;
  v_character_type TEXT;
  v_price DECIMAL(10,2);
BEGIN
  -- 1. Verificar se personagem é premium (baseado em price_multiplier)
  SELECT 
    CASE 
      WHEN price_multiplier IS NOT NULL AND price_multiplier >= 1.5 THEN true
      ELSE false
    END
  INTO v_is_premium
  FROM collection_characters
  WHERE id = p_character_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Character not found: %', p_character_id;
  END IF;
  
  -- 2. Determinar tipo
  v_character_type := CASE WHEN v_is_premium THEN 'premium' ELSE 'standard' END;
  
  -- 3. Buscar preço
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
   Determina automaticamente se é standard ou premium baseado em price_multiplier.
   Parâmetros:
   - p_character_id: ID do personagem
   - p_payment_method: "full" (preço cheio) ou "pix" (com desconto)
   
   Retorna: Preço em reais (DECIMAL)';

-- ============================================================================
-- PASSO 5: RLS Policies
-- ============================================================================

ALTER TABLE character_standalone_pricing ENABLE ROW LEVEL SECURITY;

-- Todos podem visualizar preços ativos
CREATE POLICY "Anyone can view active character standalone pricing"
  ON character_standalone_pricing FOR SELECT
  USING (is_active = true);

-- Apenas admins podem editar
CREATE POLICY "Admins can manage character standalone pricing"
  ON character_standalone_pricing FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- ============================================================================
-- PASSO 6: Validação e Testes
-- ============================================================================

DO $$
DECLARE
  v_standard_full DECIMAL(10,2);
  v_standard_pix DECIMAL(10,2);
  v_premium_full DECIMAL(10,2);
  v_premium_pix DECIMAL(10,2);
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PREÇOS AVULSOS DE PERSONAGENS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- Buscar preços
  SELECT price_full, price_pix INTO v_standard_full, v_standard_pix
  FROM character_standalone_pricing
  WHERE character_type = 'standard' AND is_active = true;
  
  SELECT price_full, price_pix INTO v_premium_full, v_premium_pix
  FROM character_standalone_pricing
  WHERE character_type = 'premium' AND is_active = true;
  
  RAISE NOTICE 'Personagem Padrão:';
  RAISE NOTICE '  Preço Cheio: R$ %', v_standard_full;
  RAISE NOTICE '  Preço PIX:   R$ % (5%% OFF)', v_standard_pix;
  RAISE NOTICE '';
  RAISE NOTICE 'Personagem Premium:';
  RAISE NOTICE '  Preço Cheio: R$ %', v_premium_full;
  RAISE NOTICE '  Preço PIX:   R$ % (5%% OFF)', v_premium_pix;
  RAISE NOTICE '';
  RAISE NOTICE 'Uso:';
  RAISE NOTICE '  - Compras avulsas (não assinantes)';
  RAISE NOTICE '  - Cálculo de cancelamento';
  RAISE NOTICE '  - Cards de personagens no catálogo';
  RAISE NOTICE '';
  RAISE NOTICE 'Editável em: /admin/coins → Aba "Preços Avulsos"';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
