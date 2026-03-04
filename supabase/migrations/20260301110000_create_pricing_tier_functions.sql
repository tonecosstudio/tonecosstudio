-- ============================================
-- Migration: FunÃƒÂ§ÃƒÂµes para Sistema de NÃƒÂ­veis de PreÃƒÂ§o
-- Data: 2026-03-01 11:00
-- DescriÃƒÂ§ÃƒÂ£o: Criar funÃƒÂ§ÃƒÂµes SQL para gerenciar nÃƒÂ­veis de preÃƒÂ§o
-- ============================================

-- =====================================================
-- 1. FUNÃƒâ€¡ÃƒÆ’O: create_pricing_tier
-- =====================================================

CREATE OR REPLACE FUNCTION create_pricing_tier(
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_price_full NUMERIC DEFAULT 500.00,
  p_deposit_amount NUMERIC DEFAULT 100.00,
  p_pix_discount_percentage NUMERIC DEFAULT 5.00,
  p_is_default BOOLEAN DEFAULT false,
  p_display_order INTEGER DEFAULT 0,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_tier_id UUID;
  v_price_pix NUMERIC;
BEGIN
  -- ValidaÃƒÂ§ÃƒÂµes
  IF p_price_full <= 0 THEN
    RAISE EXCEPTION 'PreÃƒÂ§o cheio deve ser maior que zero';
  END IF;
  
  IF p_deposit_amount <= 0 THEN
    RAISE EXCEPTION 'Valor da entrada deve ser maior que zero';
  END IF;
  
  IF p_deposit_amount >= p_price_full THEN
    RAISE EXCEPTION 'Valor da entrada deve ser menor que o preÃƒÂ§o cheio';
  END IF;
  
  IF p_pix_discount_percentage < 0 OR p_pix_discount_percentage > 100 THEN
    RAISE EXCEPTION 'Desconto PIX deve estar entre 0 e 100';
  END IF;
  
  -- Se ÃƒÂ© padrÃƒÂ£o, remover flag de outros nÃƒÂ­veis
  IF p_is_default THEN
    UPDATE pricing_tiers SET is_default = false WHERE is_default = true;
  END IF;
  
  -- Calcular preÃƒÂ§o PIX
  v_price_pix := ROUND(p_price_full * (1 - p_pix_discount_percentage / 100), 2);
  
  -- Inserir nÃƒÂ­vel
  INSERT INTO pricing_tiers (
    name, description, price_full, deposit_amount, 
    pix_discount_percentage, is_default, display_order, created_by
  )
  VALUES (
    p_name, p_description, p_price_full, p_deposit_amount,
    p_pix_discount_percentage, p_is_default, p_display_order, p_created_by
  )
  RETURNING id INTO v_tier_id;
  
  -- Registrar no histÃƒÂ³rico
  INSERT INTO pricing_history (
    tier_id, change_type, new_price_full, new_price_pix, 
    new_deposit_amount, changed_by, metadata
  )
  VALUES (
    v_tier_id, 'tier_created', p_price_full, v_price_pix,
    p_deposit_amount, p_created_by, 
    jsonb_build_object('tier_name', p_name)
  );
  
  RETURN v_tier_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_pricing_tier IS 'Cria um novo nÃƒÂ­vel de preÃƒÂ§o com validaÃƒÂ§ÃƒÂµes';

-- =====================================================
-- 2. FUNÃƒâ€¡ÃƒÆ’O: update_pricing_tier
-- =====================================================

CREATE OR REPLACE FUNCTION update_pricing_tier(
  p_tier_id UUID,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_price_full NUMERIC DEFAULT NULL,
  p_deposit_amount NUMERIC DEFAULT NULL,
  p_pix_discount_percentage NUMERIC DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL,
  p_is_default BOOLEAN DEFAULT NULL,
  p_display_order INTEGER DEFAULT NULL,
  p_updated_by UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_old_tier RECORD;
  v_new_price_pix NUMERIC;
  v_price_changed BOOLEAN := false;
BEGIN
  -- Buscar valores atuais
  SELECT * INTO v_old_tier FROM pricing_tiers WHERE id = p_tier_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NÃƒÂ­vel de preÃƒÂ§o nÃƒÂ£o encontrado';
  END IF;
  
  -- ValidaÃƒÂ§ÃƒÂµes
  IF p_price_full IS NOT NULL AND p_price_full <= 0 THEN
    RAISE EXCEPTION 'PreÃƒÂ§o cheio deve ser maior que zero';
  END IF;
  
  IF p_deposit_amount IS NOT NULL AND p_deposit_amount <= 0 THEN
    RAISE EXCEPTION 'Valor da entrada deve ser maior que zero';
  END IF;
  
  IF p_price_full IS NOT NULL AND p_deposit_amount IS NOT NULL THEN
    IF p_deposit_amount >= p_price_full THEN
      RAISE EXCEPTION 'Valor da entrada deve ser menor que o preÃƒÂ§o cheio';
    END IF;
  ELSIF p_price_full IS NOT NULL AND p_deposit_amount IS NULL THEN
    IF v_old_tier.deposit_amount >= p_price_full THEN
      RAISE EXCEPTION 'Valor da entrada deve ser menor que o preÃƒÂ§o cheio';
    END IF;
  ELSIF p_deposit_amount IS NOT NULL AND p_price_full IS NULL THEN
    IF p_deposit_amount >= v_old_tier.price_full THEN
      RAISE EXCEPTION 'Valor da entrada deve ser menor que o preÃƒÂ§o cheio';
    END IF;
  END IF;
  
  IF p_pix_discount_percentage IS NOT NULL THEN
    IF p_pix_discount_percentage < 0 OR p_pix_discount_percentage > 100 THEN
      RAISE EXCEPTION 'Desconto PIX deve estar entre 0 e 100';
    END IF;
  END IF;
  
  -- Se ÃƒÂ© padrÃƒÂ£o, remover flag de outros nÃƒÂ­veis
  IF p_is_default = true THEN
    UPDATE pricing_tiers SET is_default = false WHERE is_default = true AND id != p_tier_id;
  END IF;
  
  -- Verificar se preÃƒÂ§os mudaram
  IF p_price_full IS NOT NULL AND p_price_full != v_old_tier.price_full THEN
    v_price_changed := true;
  END IF;
  
  IF p_deposit_amount IS NOT NULL AND p_deposit_amount != v_old_tier.deposit_amount THEN
    v_price_changed := true;
  END IF;
  
  IF p_pix_discount_percentage IS NOT NULL AND p_pix_discount_percentage != v_old_tier.pix_discount_percentage THEN
    v_price_changed := true;
  END IF;
  
  -- Atualizar nÃƒÂ­vel
  UPDATE pricing_tiers
  SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    price_full = COALESCE(p_price_full, price_full),
    deposit_amount = COALESCE(p_deposit_amount, deposit_amount),
    pix_discount_percentage = COALESCE(p_pix_discount_percentage, pix_discount_percentage),
    is_active = COALESCE(p_is_active, is_active),
    is_default = COALESCE(p_is_default, is_default),
    display_order = COALESCE(p_display_order, display_order),
    updated_at = NOW(),
    updated_by = p_updated_by
  WHERE id = p_tier_id;
  
  -- Registrar no histÃƒÂ³rico
  INSERT INTO pricing_history (
    tier_id, change_type, 
    old_price_full, new_price_full,
    old_price_pix, new_price_pix,
    old_deposit_amount, new_deposit_amount,
    changed_by, metadata
  )
  SELECT
    p_tier_id, 'tier_updated',
    v_old_tier.price_full, COALESCE(p_price_full, v_old_tier.price_full),
    v_old_tier.price_pix, (SELECT price_pix FROM pricing_tiers WHERE id = p_tier_id),
    v_old_tier.deposit_amount, COALESCE(p_deposit_amount, v_old_tier.deposit_amount),
    p_updated_by,
    jsonb_build_object(
      'tier_name', v_old_tier.name,
      'price_changed', v_price_changed
    );
  
  -- Se preÃƒÂ§os mudaram, propagar para coleÃƒÂ§ÃƒÂµes
  IF v_price_changed THEN
    PERFORM propagate_tier_prices(p_tier_id, p_updated_by);
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_pricing_tier IS 'Atualiza nÃƒÂ­vel de preÃƒÂ§o e propaga mudanÃƒÂ§as';

-- =====================================================
-- 3. FUNÃƒâ€¡ÃƒÆ’O: propagate_tier_prices
-- =====================================================

CREATE OR REPLACE FUNCTION propagate_tier_prices(
  p_tier_id UUID,
  p_updated_by UUID DEFAULT NULL
)
RETURNS TABLE (
  collection_id UUID,
  old_price_full NUMERIC,
  new_price_full NUMERIC,
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_tier RECORD;
  v_collection RECORD;
  v_updated_count INTEGER := 0;
  v_failed_count INTEGER := 0;
BEGIN
  -- Buscar dados do nÃƒÂ­vel
  SELECT * INTO v_tier FROM pricing_tiers WHERE id = p_tier_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NÃƒÂ­vel de preÃƒÂ§o nÃƒÂ£o encontrado';
  END IF;
  
  -- Iterar sobre coleÃƒÂ§ÃƒÂµes atribuÃƒÂ­das
  FOR v_collection IN
    SELECT c.id, c.price_full, c.price_pix, c.deposit_amount
    FROM collections c
    INNER JOIN collection_tier_assignments cta ON c.id = cta.collection_id
    WHERE cta.tier_id = p_tier_id AND c.uses_tier_pricing = true
  LOOP
    BEGIN
      -- Atualizar preÃƒÂ§os da coleÃƒÂ§ÃƒÂ£o
      UPDATE collections
      SET
        price_full = v_tier.price_full,
        price_pix = v_tier.price_pix,
        deposit_amount = v_tier.deposit_amount,
        updated_at = NOW()
      WHERE id = v_collection.id;
      
      -- Registrar no histÃƒÂ³rico
      INSERT INTO pricing_history (
        collection_id, tier_id, change_type,
        old_price_full, new_price_full,
        old_price_pix, new_price_pix,
        old_deposit_amount, new_deposit_amount,
        changed_by, metadata
      )
      VALUES (
        v_collection.id, p_tier_id, 'price_propagated',
        v_collection.price_full, v_tier.price_full,
        v_collection.price_pix, v_tier.price_pix,
        v_collection.deposit_amount, v_tier.deposit_amount,
        p_updated_by,
        jsonb_build_object('tier_name', v_tier.name)
      );
      
      v_updated_count := v_updated_count + 1;
      
      RETURN QUERY SELECT 
        v_collection.id,
        v_collection.price_full,
        v_tier.price_full,
        true,
        NULL::TEXT;
      
    EXCEPTION WHEN OTHERS THEN
      v_failed_count := v_failed_count + 1;
      
      RETURN QUERY SELECT 
        v_collection.id,
        v_collection.price_full,
        v_tier.price_full,
        false,
        SQLERRM;
    END;
  END LOOP;
  
  -- Log de conclusÃƒÂ£o
  RAISE NOTICE 'PropagaÃƒÂ§ÃƒÂ£o concluÃƒÂ­da: % atualizadas, % falharam', v_updated_count, v_failed_count;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION propagate_tier_prices IS 'Propaga preÃƒÂ§os do nÃƒÂ­vel para coleÃƒÂ§ÃƒÂµes atribuÃƒÂ­das';

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
