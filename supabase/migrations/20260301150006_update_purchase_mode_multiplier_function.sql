-- Migration: Implementar função update_purchase_mode_multiplier
-- Feature: pricing-system-restructure
-- Requisitos: 3.3, 3.4, 3.7
-- Descrição: Atualiza multiplicador de modalidade e recalcula todos os planos dessa modalidade

CREATE OR REPLACE FUNCTION update_purchase_mode_multiplier(
  p_mode_key TEXT,
  p_new_multiplier NUMERIC,
  p_updated_by UUID DEFAULT NULL
)
RETURNS TABLE (
  plans_updated INTEGER,
  tiers_affected INTEGER
) AS $$
DECLARE
  v_old_multiplier NUMERIC;
  v_plan RECORD;
  v_new_price_full NUMERIC;
  v_new_price_pix NUMERIC;
  v_plans_updated INTEGER := 0;
  v_tiers_affected INTEGER := 0;
BEGIN
  -- Validar multiplicador
  IF p_new_multiplier <= 0 OR p_new_multiplier > 2.0 THEN
    RAISE EXCEPTION 'Multiplicador deve estar entre 0.1 e 2.0';
  END IF;
  
  -- Buscar multiplicador atual
  SELECT price_multiplier INTO v_old_multiplier
  FROM purchase_modes
  WHERE mode_key = p_mode_key;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Modalidade não encontrada';
  END IF;
  
  -- Atualizar modalidade
  UPDATE purchase_modes
  SET
    price_multiplier = p_new_multiplier,
    updated_at = NOW()
  WHERE mode_key = p_mode_key;
  
  -- Registrar mudança no histórico
  INSERT INTO purchase_mode_history (
    mode_key, field_name, old_value, new_value, changed_by, changed_at
  ) VALUES (
    p_mode_key, 'price_multiplier', v_old_multiplier::TEXT, p_new_multiplier::TEXT, p_updated_by, NOW()
  );
  
  -- Recalcular todos os planos desta modalidade
  FOR v_plan IN
    SELECT sp.*, pt.price_full as tier_price_full, pt.pix_discount_percentage
    FROM subscription_plans sp
    JOIN pricing_tiers pt ON pt.id = sp.tier_id
    WHERE sp.plan_mode = p_mode_key
  LOOP
    -- Calcular novos preços
    v_new_price_full := ROUND(v_plan.tier_price_full * p_new_multiplier, 2);
    v_new_price_pix := ROUND(v_new_price_full * (1 - v_plan.pix_discount_percentage / 100), 2);
    
    -- Atualizar plano
    UPDATE subscription_plans
    SET
      price_full = v_new_price_full,
      price_pix = v_new_price_pix,
      price_multiplier = p_new_multiplier,
      updated_at = NOW()
    WHERE id = v_plan.id;
    
    v_plans_updated := v_plans_updated + 1;
    
    -- Registrar no histórico (se tabela existir)
    BEGIN
      INSERT INTO pricing_history (
        tier_id, change_type,
        old_price_full, new_price_full,
        old_price_pix, new_price_pix,
        changed_by, metadata, changed_at
      ) VALUES (
        v_plan.tier_id, 'price_propagated',
        v_plan.price_full, v_new_price_full,
        v_plan.price_pix, v_new_price_pix,
        p_updated_by,
        jsonb_build_object(
          'plan_id', v_plan.id,
          'plan_mode', p_mode_key,
          'old_multiplier', v_old_multiplier,
          'new_multiplier', p_new_multiplier,
          'reason', 'mode_multiplier_updated'
        ),
        NOW()
      );
    EXCEPTION
      WHEN undefined_table THEN
        NULL;
    END;
  END LOOP;
  
  -- Contar níveis afetados
  SELECT COUNT(DISTINCT tier_id) INTO v_tiers_affected
  FROM subscription_plans
  WHERE plan_mode = p_mode_key;
  
  RETURN QUERY SELECT v_plans_updated, v_tiers_affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_purchase_mode_multiplier IS 'Atualiza multiplicador de modalidade e recalcula todos os planos dessa modalidade';
