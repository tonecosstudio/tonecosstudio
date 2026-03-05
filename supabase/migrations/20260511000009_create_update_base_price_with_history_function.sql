-- ============================================================================
-- FUNÇÃO: update_base_price_with_history()
-- Descrição: Atualiza preço base de um tipo de coleção e registra no histórico
-- Spec: contextual-pricing-system
-- Task: 3.4
-- ============================================================================

CREATE OR REPLACE FUNCTION update_base_price_with_history(
  p_collection_type_id UUID,
  p_new_base_price_coins INTEGER,
  p_changed_by UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  old_price INTEGER,
  new_price INTEGER,
  message TEXT
)
LANGUAGE plpgsql
AS $function$
DECLARE
  v_old_price INTEGER;
  v_collection_type_name TEXT;
BEGIN
  -- 1. Buscar preço base atual e nome do tipo
  SELECT cbp.base_price_coins, ct.name
  INTO v_old_price, v_collection_type_name
  FROM collection_base_pricing cbp
  JOIN collection_types ct ON ct.id = cbp.collection_type_id
  WHERE cbp.collection_type_id = p_collection_type_id
  AND cbp.is_active = true;
  
  -- Validar se tipo existe
  IF v_old_price IS NULL THEN
    RETURN QUERY SELECT 
      false::BOOLEAN,
      NULL::INTEGER,
      NULL::INTEGER,
      format('Collection type not found or inactive: %s', p_collection_type_id)::TEXT;
    RETURN;
  END IF;
  
  -- Validar se preço mudou
  IF v_old_price = p_new_base_price_coins THEN
    RETURN QUERY SELECT 
      false::BOOLEAN,
      v_old_price,
      p_new_base_price_coins,
      format('Price unchanged: %s coins', v_old_price)::TEXT;
    RETURN;
  END IF;
  
  -- Validar novo preço
  IF p_new_base_price_coins <= 0 THEN
    RETURN QUERY SELECT 
      false::BOOLEAN,
      v_old_price,
      p_new_base_price_coins,
      'New price must be greater than 0'::TEXT;
    RETURN;
  END IF;
  
  -- 2. Atualizar preço base (transação atômica)
  BEGIN
    -- Atualizar preço
    UPDATE collection_base_pricing
    SET 
      base_price_coins = p_new_base_price_coins,
      updated_at = NOW()
    WHERE collection_type_id = p_collection_type_id
    AND is_active = true;
    
    -- 3. Registrar no histórico
    INSERT INTO contextual_pricing_history (
      change_type,
      collection_type_id,
      old_value,
      new_value,
      changed_by,
      changed_at,
      reason
    ) VALUES (
      'base_price',
      p_collection_type_id,
      v_old_price,
      p_new_base_price_coins,
      p_changed_by,
      NOW(),
      COALESCE(p_reason, format('Updated base price for %s', v_collection_type_name))
    );
    
    -- Retornar sucesso
    RETURN QUERY SELECT 
      true::BOOLEAN,
      v_old_price,
      p_new_base_price_coins,
      format('Base price updated: %s → %s coins (%s%%)', 
        v_old_price, 
        p_new_base_price_coins,
        ROUND(((p_new_base_price_coins - v_old_price)::DECIMAL / v_old_price * 100), 1)
      )::TEXT;
      
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback automático em caso de erro
      RETURN QUERY SELECT 
        false::BOOLEAN,
        v_old_price,
        p_new_base_price_coins,
        format('Error updating price: %s', SQLERRM)::TEXT;
  END;
END;
$function$;

-- Comentários explicativos
COMMENT ON FUNCTION update_base_price_with_history IS 
  'Atualiza preço base de um tipo de coleção e registra mudança no histórico.
   Operação atômica: se falhar, rollback completo.
   Valida preço > 0 e registra percentual de mudança.';

-- Exemplos de uso:
-- SELECT * FROM update_base_price_with_history(
--   'collection-type-uuid',
--   1200,
--   'admin-user-uuid',
--   'Ajuste de preço Q1 2026'
-- );
