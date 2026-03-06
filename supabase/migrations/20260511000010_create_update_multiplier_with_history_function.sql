-- ============================================================================
-- FUNÇÃO: update_multiplier_with_history()
-- Descrição: Atualiza multiplicador de contexto e registra no histórico
-- Spec: contextual-pricing-system
-- Task: 3.5
-- ============================================================================

CREATE OR REPLACE FUNCTION update_multiplier_with_history(
  p_user_context TEXT,
  p_new_multiplier DECIMAL(4,2),
  p_changed_by UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  old_multiplier DECIMAL(4,2),
  new_multiplier DECIMAL(4,2),
  message TEXT
)
LANGUAGE plpgsql
AS $function$
DECLARE
  v_old_multiplier DECIMAL(4,2);
  v_context_description TEXT;
BEGIN
  -- 1. Buscar multiplicador atual
  SELECT multiplier, description
  INTO v_old_multiplier, v_context_description
  FROM pricing_context_multipliers
  WHERE user_context = p_user_context
  AND is_active = true;
  
  -- Validar se contexto existe
  IF v_old_multiplier IS NULL THEN
    RETURN QUERY SELECT 
      false::BOOLEAN,
      NULL::DECIMAL(4,2),
      NULL::DECIMAL(4,2),
      format('Context not found or inactive: %s', p_user_context)::TEXT;
    RETURN;
  END IF;
  
  -- Validar se multiplicador mudou
  IF v_old_multiplier = p_new_multiplier THEN
    RETURN QUERY SELECT 
      false::BOOLEAN,
      v_old_multiplier,
      p_new_multiplier,
      format('Multiplier unchanged: %s', v_old_multiplier)::TEXT;
    RETURN;
  END IF;
  
  -- Validar novo multiplicador
  IF p_new_multiplier <= 0 THEN
    RETURN QUERY SELECT 
      false::BOOLEAN,
      v_old_multiplier,
      p_new_multiplier,
      'Multiplier must be greater than 0'::TEXT;
    RETURN;
  END IF;
  
  -- 2. Atualizar multiplicador (transação atômica)
  BEGIN
    -- Atualizar multiplicador
    UPDATE pricing_context_multipliers
    SET 
      multiplier = p_new_multiplier,
      updated_at = NOW()
    WHERE user_context = p_user_context
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
      'multiplier',
      p_user_context,
      v_old_multiplier,
      p_new_multiplier,
      p_changed_by,
      NOW(),
      COALESCE(p_reason, format('Updated multiplier for %s', p_user_context))
    );
    
    -- Retornar sucesso
    RETURN QUERY SELECT 
      true::BOOLEAN,
      v_old_multiplier,
      p_new_multiplier,
      format('Multiplier updated: %s → %s (%s%% → %s%%)', 
        v_old_multiplier, 
        p_new_multiplier,
        ROUND(v_old_multiplier * 100, 0),
        ROUND(p_new_multiplier * 100, 0)
      )::TEXT;
      
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback automático em caso de erro
      RETURN QUERY SELECT 
        false::BOOLEAN,
        v_old_multiplier,
        p_new_multiplier,
        format('Error updating multiplier: %s', SQLERRM)::TEXT;
  END;
END;
$function$;

-- Comentários explicativos
COMMENT ON FUNCTION update_multiplier_with_history IS 
  'Atualiza multiplicador de contexto e registra mudança no histórico.
   Operação atômica: se falhar, rollback completo.
   Valida multiplicador > 0 e registra percentual equivalente.';

-- Exemplos de uso:
-- SELECT * FROM update_multiplier_with_history(
--   'subscribed_not_chosen',
--   1.3,
--   'admin-user-uuid',
--   'Ajuste de multiplicador para não escolhidas'
-- );
