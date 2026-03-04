-- Migration: Implementar funÃƒÂ§ÃƒÂ£o create_tier_with_plans
-- Feature: pricing-system-restructure
-- Requisitos: 1.1, 1.2, 8.1, 8.5
-- DescriÃƒÂ§ÃƒÂ£o: Cria funÃƒÂ§ÃƒÂ£o que cria nÃƒÂ­vel e automaticamente cria planos para todas as modalidades ativas

CREATE OR REPLACE FUNCTION create_tier_with_plans(
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_price_full NUMERIC DEFAULT 700.00,
  p_deposit_amount NUMERIC DEFAULT 100.00,
  p_pix_discount_percentage NUMERIC DEFAULT 5.00,
  p_is_default BOOLEAN DEFAULT false,
  p_display_order INTEGER DEFAULT 0,
  p_created_by UUID DEFAULT NULL
)
RETURNS TABLE (
  tier_id UUID,
  plans_created INTEGER
) AS $$
DECLARE
  v_tier_id UUID;
  v_price_pix NUMERIC;
  v_mode RECORD;
  v_plan_price_full NUMERIC;
  v_plan_price_pix NUMERIC;
  v_plans_created INTEGER := 0;
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
  
  -- Calcular preÃƒÂ§o PIX do nÃƒÂ­vel
  v_price_pix := ROUND(p_price_full * (1 - p_pix_discount_percentage / 100), 2);
  
  -- Criar nÃƒÂ­vel usando funÃƒÂ§ÃƒÂ£o existente (se existir) ou criar diretamente
  BEGIN
    v_tier_id := create_pricing_tier(
      p_name, p_description, p_price_full, p_deposit_amount,
      p_pix_discount_percentage, p_is_default, p_display_order, p_created_by
    );
  EXCEPTION
    WHEN undefined_function THEN
      -- Se funÃƒÂ§ÃƒÂ£o create_pricing_tier nÃƒÂ£o existe, criar nÃƒÂ­vel diretamente
      INSERT INTO pricing_tiers (
        name, description, price_full, price_pix, deposit_amount,
        pix_discount_percentage, is_default, display_order, created_at, updated_at
      ) VALUES (
        p_name, p_description, p_price_full, v_price_pix, p_deposit_amount,
        p_pix_discount_percentage, p_is_default, p_display_order, NOW(), NOW()
      ) RETURNING id INTO v_tier_id;
  END;
  
  -- Criar planos para cada modalidade ativa
  FOR v_mode IN
    SELECT * FROM purchase_modes WHERE is_active = true ORDER BY display_order
  LOOP
    -- Calcular preÃƒÂ§os do plano
    v_plan_price_full := ROUND(p_price_full * v_mode.price_multiplier, 2);
    v_plan_price_pix := ROUND(v_plan_price_full * (1 - p_pix_discount_percentage / 100), 2);
    
    -- Criar plano
    INSERT INTO subscription_plans (
      tier_id,
      plan_mode,
      plan_type,
      name,
      description,
      price_full,
      price_pix,
      price_multiplier,
      collections_count,
      deliveries_total,
      includes_bonus,
      is_active,
      display_order,
      created_at,
      updated_at
    ) VALUES (
      v_tier_id,
      v_mode.mode_key,
      v_mode.mode_key, -- Manter plan_type para compatibilidade
      p_name || ' - ' || v_mode.name,
      v_mode.description,
      v_plan_price_full,
      v_plan_price_pix,
      v_mode.price_multiplier,
      v_mode.collections_count,
      v_mode.deliveries_total,
      v_mode.includes_bonus,
      true,
      v_mode.display_order,
      NOW(),
      NOW()
    );
    
    v_plans_created := v_plans_created + 1;
    
    -- Registrar no histÃƒÂ³rico (se tabela pricing_history existir)
    BEGIN
      INSERT INTO pricing_history (
        tier_id, change_type, new_price_full, new_price_pix,
        changed_by, metadata, changed_at
      ) VALUES (
        v_tier_id, 'tier_created', v_plan_price_full, v_plan_price_pix,
        p_created_by,
        jsonb_build_object(
          'tier_name', p_name,
          'plan_mode', v_mode.mode_key,
          'multiplier', v_mode.price_multiplier
        ),
        NOW()
      );
    EXCEPTION
      WHEN undefined_table THEN
        -- Ignorar se tabela pricing_history nÃƒÂ£o existe
        NULL;
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_tier_id, v_plans_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_tier_with_plans IS 'Cria nÃƒÂ­vel de preÃƒÂ§o e automaticamente cria planos para todas as modalidades ativas';
