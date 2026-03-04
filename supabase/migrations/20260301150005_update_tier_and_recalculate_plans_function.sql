-- Migration: Implementar funÃƒÂ§ÃƒÂ£o update_tier_and_recalculate_plans
-- Feature: pricing-system-restructure
-- Requisitos: 1.2, 4.1, 4.4, 6.5
-- DescriÃƒÂ§ÃƒÂ£o: Atualiza nÃƒÂ­vel e recalcula automaticamente preÃƒÂ§os de todos os planos

CREATE OR REPLACE FUNCTION update_tier_and_recalculate_plans(
  p_tier_id UUID,
  p_price_full NUMERIC DEFAULT NULL,
  p_deposit_amount NUMERIC DEFAULT NULL,
  p_pix_discount_percentage NUMERIC DEFAULT NULL,
  p_updated_by UUID DEFAULT NULL
)
RETURNS TABLE (
  plans_updated INTEGER,
  collections_updated INTEGER
) AS $$
DECLARE
  v_old_tier RECORD;
  v_new_price_full NUMERIC;
  v_new_pix_discount NUMERIC;
  v_plan RECORD;
  v_new_plan_price_full NUMERIC;
  v_new_plan_price_pix NUMERIC;
  v_plans_updated INTEGER := 0;
  v_collections_updated INTEGER := 0;
BEGIN
  -- Buscar dados atuais do nÃƒÂ­vel
  SELECT * INTO v_old_tier FROM pricing_tiers WHERE id = p_tier_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NÃƒÂ­vel de preÃƒÂ§o nÃƒÂ£o encontrado';
  END IF;
  
  -- Determinar novos valores
  v_new_price_full := COALESCE(p_price_full, v_old_tier.price_full);
  v_new_pix_discount := COALESCE(p_pix_discount_percentage, v_old_tier.pix_discount_percentage);
  
  -- Atualizar nÃƒÂ­vel
  BEGIN
    -- Tentar usar funÃƒÂ§ÃƒÂ£o existente
    PERFORM update_pricing_tier(
      p_tier_id,
      NULL, -- name
      NULL, -- description
      p_price_full,
      p_deposit_amount,
      p_pix_discount_percentage,
      NULL, -- is_active
      NULL, -- is_default
      NULL, -- display_order
      p_updated_by
    );
  EXCEPTION
    WHEN undefined_function THEN
      -- Se funÃƒÂ§ÃƒÂ£o nÃƒÂ£o existe, atualizar diretamente
      UPDATE pricing_tiers
      SET
        price_full = COALESCE(p_price_full, price_full),
        price_pix = ROUND(COALESCE(p_price_full, price_full) * (1 - v_new_pix_discount / 100), 2),
        deposit_amount = COALESCE(p_deposit_amount, deposit_amount),
        pix_discount_percentage = v_new_pix_discount,
        updated_at = NOW()
      WHERE id = p_tier_id;
  END;
  
  -- Recalcular preÃƒÂ§os de todos os planos do nÃƒÂ­vel
  FOR v_plan IN
    SELECT * FROM subscription_plans WHERE tier_id = p_tier_id
  LOOP
    -- Calcular novos preÃƒÂ§os
    v_new_plan_price_full := ROUND(v_new_price_full * v_plan.price_multiplier, 2);
    v_new_plan_price_pix := ROUND(v_new_plan_price_full * (1 - v_new_pix_discount / 100), 2);
    
    -- Atualizar plano
    UPDATE subscription_plans
    SET
      price_full = v_new_plan_price_full,
      price_pix = v_new_plan_price_pix,
      updated_at = NOW()
    WHERE id = v_plan.id;
    
    v_plans_updated := v_plans_updated + 1;
    
    -- Registrar no histÃƒÂ³rico (se tabela existir)
    BEGIN
      INSERT INTO pricing_history (
        tier_id, change_type,
        old_price_full, new_price_full,
        old_price_pix, new_price_pix,
        changed_by, metadata, changed_at
      ) VALUES (
        p_tier_id, 'price_propagated',
        v_plan.price_full, v_new_plan_price_full,
        v_plan.price_pix, v_new_plan_price_pix,
        p_updated_by,
        jsonb_build_object(
          'plan_id', v_plan.id,
          'plan_mode', v_plan.plan_mode,
          'multiplier', v_plan.price_multiplier,
          'reason', 'tier_price_updated'
        ),
        NOW()
      );
    EXCEPTION
      WHEN undefined_table THEN
        NULL;
    END;
  END LOOP;
  
  -- Propagar para coleÃƒÂ§ÃƒÂµes (usa funÃƒÂ§ÃƒÂ£o existente se disponÃƒÂ­vel)
  BEGIN
    SELECT COUNT(*) INTO v_collections_updated
    FROM propagate_tier_prices(p_tier_id, p_updated_by);
  EXCEPTION
    WHEN undefined_function THEN
      -- Se funÃƒÂ§ÃƒÂ£o nÃƒÂ£o existe, atualizar coleÃƒÂ§ÃƒÂµes diretamente
      UPDATE collections c
      SET
        price_full = v_new_price_full,
        price_pix = ROUND(v_new_price_full * (1 - v_new_pix_discount / 100), 2),
        updated_at = NOW()
      FROM collection_tier_assignments cta
      WHERE cta.collection_id = c.id
        AND cta.tier_id = p_tier_id
        AND c.uses_tier_pricing = true;
      
      GET DIAGNOSTICS v_collections_updated = ROW_COUNT;
  END;
  
  RETURN QUERY SELECT v_plans_updated, v_collections_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_tier_and_recalculate_plans IS 'Atualiza nÃƒÂ­vel e recalcula automaticamente preÃƒÂ§os de todos os planos e coleÃƒÂ§ÃƒÂµes';
