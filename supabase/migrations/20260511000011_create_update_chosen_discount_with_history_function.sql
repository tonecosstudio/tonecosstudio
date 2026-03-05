-- ============================================================================
-- FUNÇÃO: update_chosen_discount_with_history()
-- Descrição: Atualiza percentual de desconto para coleções escolhidas e registra no histórico
-- Spec: contextual-pricing-system
-- Task: 3.5 (complementar)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_chosen_discount_with_history(
  p_new_discount_percentage INTEGER,
  p_changed_by UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  old_discount INTEGER,
  new_discount INTEGER,
  message TEXT
)
LANGUAGE plpgsql
AS $function$
DECLARE
  v_old_discount INTEGER;
  v_user_context TEXT := 'subscribed_chosen';
BEGIN
  -- 1. Buscar desconto atual
  SELECT chosen_collection_discount_percentage
  INTO v_old_discount
  FROM pricing_context_multipliers
  WHERE user_context = v_user_context
  AND is_active = true;
  
  -- Validar se contexto existe
  IF v_old_discount IS NULL THEN
    RETURN QUERY SELECT 
      false::BOOLEAN,
      NULL::INTEGER,
      NULL::INTEGER,
      'Context subscribed_chosen not found or inactive'::TEXT;
    RETURN;
  END IF;
  
  -- Validar se desconto mudou
  IF v_old_discount = p_new_discount_percentage THEN
    RETURN QUERY SELECT 
      false::BOOLEAN,
      v_old_discount,
      p_new_discount_percentage,
      format('Discount unchanged: %s%%', v_old_discount)::TEXT;
    RETURN;
  END IF;
  
  -- Validar novo desconto (0-100%)
  IF p_new_discount_percentage < 0 OR p_new_discount_percentage > 100 THEN
    RETURN QUERY SELECT 
      false::BOOLEAN,
      v_old_discount,
      p_new_discount_percentage,
      'Discount percentage must be between 0 and 100'::TEXT;
    RETURN;
  END IF;
  
  -- 2. Atualizar desconto (transação atômica)
  BEGIN
    -- Atualizar desconto
    UPDATE pricing_context_multipliers
    SET 
      chosen_collection_discount_percentage = p_new_discount_percentage,
      updated_at = NOW()
    WHERE user_context = v_user_context
    AND is_active = true;
    
    -- 3. Registrar no histórico
    INSERT INTO contextual_pricing_history (
      change_type,
      user_context,
      old_value,
      new_value,
      changed_by,
      changed_at,
      reason
    ) VALUES (
      'chosen_discount',
      v_user_context,
      v_old_discount,
      p_new_discount_percentage,
      p_changed_by,
      NOW(),
      COALESCE(p_reason, 'Updated discount percentage for chosen collections')
    );
    
    -- Retornar sucesso
    RETURN QUERY SELECT 
      true::BOOLEAN,
      v_old_discount,
      p_new_discount_percentage,
      format('Discount updated: %s%% → %s%% (change: %s%%)', 
        v_old_discount, 
        p_new_discount_percentage,
        p_new_discount_percentage - v_old_discount
      )::TEXT;
      
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback automático em caso de erro
      RETURN QUERY SELECT 
        false::BOOLEAN,
        v_old_discount,
        p_new_discount_percentage,
        format('Error updating discount: %s', SQLERRM)::TEXT;
  END;
END;
$function$;

-- Comentários explicativos
COMMENT ON FUNCTION update_chosen_discount_with_history IS 
  'Atualiza percentual de desconto para coleções escolhidas e registra mudança no histórico.
   Operação atômica: se falhar, rollback completo.
   Valida desconto entre 0-100% e registra diferença.';

-- Exemplos de uso:
-- SELECT * FROM update_chosen_discount_with_history(
--   25,
--   'admin-user-uuid',
--   'Promoção especial - aumento de desconto'
-- );
