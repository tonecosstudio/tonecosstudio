-- ============================================
-- Migration: Sistema de Preços Configurável por Coleção
-- Data: 2026-02-15 14:00
-- Descrição: Adicionar campos de preço nas coleções e configuração de entrada
-- ============================================

-- =====================================================
-- 1. ADICIONAR CAMPOS DE PREÇO NAS COLEÇÕES
-- =====================================================

ALTER TABLE collections
ADD COLUMN IF NOT EXISTS price_full NUMERIC(10,2) DEFAULT 500.00,
ADD COLUMN IF NOT EXISTS price_pix NUMERIC(10,2) DEFAULT 475.00,
ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10,2) DEFAULT 100.00,
ADD COLUMN IF NOT EXISTS is_price_custom BOOLEAN DEFAULT false;

-- Comentários
COMMENT ON COLUMN collections.price_full IS 'Preço cheio da peça avulsa (sem desconto)';
COMMENT ON COLUMN collections.price_pix IS 'Preço com desconto PIX (5% OFF padrão)';
COMMENT ON COLUMN collections.deposit_amount IS 'Valor da entrada para compra avulsa';
COMMENT ON COLUMN collections.is_price_custom IS 'Se true, usa preço customizado. Se false, usa preço padrão do sistema';

-- =====================================================
-- 2. ATUALIZAR CONFIGURAÇÕES GLOBAIS
-- =====================================================

-- Adicionar configurações de preço padrão
INSERT INTO system_settings (key, value, description)
VALUES 
  ('default_price_full', '500.00', 'Preço padrão cheio para peças avulsas'),
  ('default_price_pix', '475.00', 'Preço padrão PIX (5% OFF)'),
  ('default_deposit_amount', '100.00', 'Valor padrão da entrada'),
  ('pix_discount_percentage', '5.00', 'Percentual de desconto PIX')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description;

-- =====================================================
-- 3. FUNÇÃO: Calcular Preço PIX Automaticamente
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_pix_price(
  p_price_full NUMERIC,
  p_discount_percentage NUMERIC DEFAULT 5.00
)
RETURNS NUMERIC AS $$
BEGIN
  RETURN ROUND(p_price_full * (1 - p_discount_percentage / 100), 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_pix_price IS 'Calcula preço PIX com desconto percentual';

-- =====================================================
-- 4. FUNÇÃO: Obter Preços de uma Coleção
-- =====================================================

CREATE OR REPLACE FUNCTION get_collection_pricing(p_collection_id UUID)
RETURNS TABLE (
  price_full NUMERIC,
  price_pix NUMERIC,
  deposit_amount NUMERIC,
  remaining_full NUMERIC,
  remaining_pix NUMERIC,
  is_custom BOOLEAN
) AS $$
DECLARE
  v_collection RECORD;
  v_default_price_full NUMERIC;
  v_default_price_pix NUMERIC;
  v_default_deposit NUMERIC;
BEGIN
  -- Buscar configurações da coleção
  SELECT 
    c.price_full,
    c.price_pix,
    c.deposit_amount,
    c.is_price_custom
  INTO v_collection
  FROM collections c
  WHERE c.id = p_collection_id;
  
  -- Se não encontrou a coleção, retornar valores padrão
  IF NOT FOUND THEN
    SELECT value::NUMERIC INTO v_default_price_full FROM system_settings WHERE key = 'default_price_full';
    SELECT value::NUMERIC INTO v_default_price_pix FROM system_settings WHERE key = 'default_price_pix';
    SELECT value::NUMERIC INTO v_default_deposit FROM system_settings WHERE key = 'default_deposit_amount';
    
    RETURN QUERY SELECT 
      v_default_price_full,
      v_default_price_pix,
      v_default_deposit,
      v_default_price_full - v_default_deposit,
      v_default_price_pix - v_default_deposit,
      false;
    RETURN;
  END IF;
  
  -- Se usa preço customizado, retornar valores da coleção
  IF v_collection.is_price_custom THEN
    RETURN QUERY SELECT 
      v_collection.price_full,
      v_collection.price_pix,
      v_collection.deposit_amount,
      v_collection.price_full - v_collection.deposit_amount,
      v_collection.price_pix - v_collection.deposit_amount,
      true;
  ELSE
    -- Usar valores padrão do sistema
    SELECT value::NUMERIC INTO v_default_price_full FROM system_settings WHERE key = 'default_price_full';
    SELECT value::NUMERIC INTO v_default_price_pix FROM system_settings WHERE key = 'default_price_pix';
    SELECT value::NUMERIC INTO v_default_deposit FROM system_settings WHERE key = 'default_deposit_amount';
    
    RETURN QUERY SELECT 
      v_default_price_full,
      v_default_price_pix,
      v_default_deposit,
      v_default_price_full - v_default_deposit,
      v_default_price_pix - v_default_deposit,
      false;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_collection_pricing IS 'Retorna preços de uma coleção (customizado ou padrão)';

-- =====================================================
-- 5. TRIGGER: Atualizar Preço PIX Automaticamente
-- =====================================================

CREATE OR REPLACE FUNCTION update_collection_pix_price()
RETURNS TRIGGER AS $$
DECLARE
  v_discount_percentage NUMERIC;
BEGIN
  -- Buscar percentual de desconto
  SELECT value::NUMERIC INTO v_discount_percentage 
  FROM system_settings 
  WHERE key = 'pix_discount_percentage';
  
  -- Se price_full mudou e is_price_custom é true, recalcular price_pix
  IF NEW.is_price_custom AND (NEW.price_full IS DISTINCT FROM OLD.price_full) THEN
    NEW.price_pix := calculate_pix_price(NEW.price_full, v_discount_percentage);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_collection_pix_price ON collections;
CREATE TRIGGER trigger_update_collection_pix_price
  BEFORE UPDATE ON collections
  FOR EACH ROW
  EXECUTE FUNCTION update_collection_pix_price();

-- =====================================================
-- 6. VIEW: Preços de Todas as Coleções
-- =====================================================

CREATE OR REPLACE VIEW collection_pricing_view AS
SELECT 
  c.id,
  c.name,
  c.slug,
  CASE 
    WHEN c.is_price_custom THEN c.price_full
    ELSE (SELECT value::NUMERIC FROM system_settings WHERE key = 'default_price_full')
  END as price_full,
  CASE 
    WHEN c.is_price_custom THEN c.price_pix
    ELSE (SELECT value::NUMERIC FROM system_settings WHERE key = 'default_price_pix')
  END as price_pix,
  CASE 
    WHEN c.is_price_custom THEN c.deposit_amount
    ELSE (SELECT value::NUMERIC FROM system_settings WHERE key = 'default_deposit_amount')
  END as deposit_amount,
  c.is_price_custom,
  c.is_active
FROM collections c;

COMMENT ON VIEW collection_pricing_view IS 'View com preços efetivos de cada coleção';

-- =====================================================
-- 7. RLS POLICIES
-- =====================================================

-- Permitir leitura pública da view
GRANT SELECT ON collection_pricing_view TO authenticated, anon;

-- =====================================================
-- 8. DADOS INICIAIS
-- =====================================================

-- Atualizar coleções existentes com valores padrão
UPDATE collections
SET 
  price_full = 500.00,
  price_pix = 475.00,
  deposit_amount = 100.00,
  is_price_custom = false
WHERE price_full IS NULL;

-- =====================================================
-- 9. ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_collections_pricing ON collections(is_price_custom, price_full);

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================

