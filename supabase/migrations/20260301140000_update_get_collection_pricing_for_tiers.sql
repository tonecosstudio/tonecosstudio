-- ============================================
-- Migration: Atualizar get_collection_pricing para NÃƒÂ­veis de PreÃƒÂ§o
-- Data: 2026-03-01 14:00
-- DescriÃƒÂ§ÃƒÂ£o: Modificar funÃƒÂ§ÃƒÂ£o para buscar preÃƒÂ§os de nÃƒÂ­veis quando aplicÃƒÂ¡vel
-- ============================================

-- =====================================================
-- ATUALIZAR FUNÃƒâ€¡ÃƒÆ’O get_collection_pricing
-- =====================================================

-- Drop the existing function first to allow changing return type
DROP FUNCTION IF EXISTS get_collection_pricing(UUID);

CREATE OR REPLACE FUNCTION get_collection_pricing(p_collection_id UUID)
RETURNS TABLE (
  price_full NUMERIC,
  price_pix NUMERIC,
  deposit_amount NUMERIC,
  remaining_full NUMERIC,
  remaining_pix NUMERIC,
  is_custom BOOLEAN,
  tier_id UUID,
  tier_name TEXT,
  pricing_source TEXT
) AS $$
DECLARE
  v_collection RECORD;
  v_tier RECORD;
  v_default_price_full NUMERIC;
  v_default_price_pix NUMERIC;
  v_default_deposit NUMERIC;
BEGIN
  -- Buscar configuraÃƒÂ§ÃƒÂµes da coleÃƒÂ§ÃƒÂ£o
  SELECT 
    c.price_full,
    c.price_pix,
    c.deposit_amount,
    c.is_price_custom,
    c.uses_tier_pricing
  INTO v_collection
  FROM collections c
  WHERE c.id = p_collection_id;
  
  -- Se nÃƒÂ£o encontrou a coleÃƒÂ§ÃƒÂ£o, retornar valores padrÃƒÂ£o
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
      false,
      NULL::UUID,
      NULL::TEXT,
      'default'::TEXT;
    RETURN;
  END IF;
  
  -- PRIORIDADE 1: Se usa preÃƒÂ§o customizado, retornar valores da coleÃƒÂ§ÃƒÂ£o
  IF v_collection.is_price_custom THEN
    RETURN QUERY SELECT 
      v_collection.price_full,
      v_collection.price_pix,
      v_collection.deposit_amount,
      v_collection.price_full - v_collection.deposit_amount,
      v_collection.price_pix - v_collection.deposit_amount,
      true,
      NULL::UUID,
      NULL::TEXT,
      'custom'::TEXT;
    RETURN;
  END IF;
  
  -- PRIORIDADE 2: Se usa nÃƒÂ­vel de preÃƒÂ§o, buscar do nÃƒÂ­vel
  IF v_collection.uses_tier_pricing THEN
    -- Buscar nÃƒÂ­vel atribuÃƒÂ­do
    SELECT 
      pt.id,
      pt.name,
      pt.price_full,
      pt.price_pix,
      pt.deposit_amount
    INTO v_tier
    FROM collection_tier_assignments cta
    JOIN pricing_tiers pt ON pt.id = cta.tier_id
    WHERE cta.collection_id = p_collection_id
    AND pt.is_active = true;
    
    -- Se encontrou nÃƒÂ­vel ativo, usar preÃƒÂ§os do nÃƒÂ­vel
    IF FOUND THEN
      RETURN QUERY SELECT 
        v_tier.price_full,
        v_tier.price_pix,
        v_tier.deposit_amount,
        v_tier.price_full - v_tier.deposit_amount,
        v_tier.price_pix - v_tier.deposit_amount,
        false,
        v_tier.id,
        v_tier.name,
        'tier'::TEXT;
      RETURN;
    END IF;
  END IF;
  
  -- PRIORIDADE 3: Usar valores padrÃƒÂ£o do sistema
  SELECT value::NUMERIC INTO v_default_price_full FROM system_settings WHERE key = 'default_price_full';
  SELECT value::NUMERIC INTO v_default_price_pix FROM system_settings WHERE key = 'default_price_pix';
  SELECT value::NUMERIC INTO v_default_deposit FROM system_settings WHERE key = 'default_deposit_amount';
  
  RETURN QUERY SELECT 
    v_default_price_full,
    v_default_price_pix,
    v_default_deposit,
    v_default_price_full - v_default_deposit,
    v_default_price_pix - v_default_deposit,
    false,
    NULL::UUID,
    NULL::TEXT,
    'default'::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_collection_pricing IS 'Retorna preÃƒÂ§os de uma coleÃƒÂ§ÃƒÂ£o (nÃƒÂ­vel, customizado ou padrÃƒÂ£o) com informaÃƒÂ§ÃƒÂµes do nÃƒÂ­vel quando aplicÃƒÂ¡vel';

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
