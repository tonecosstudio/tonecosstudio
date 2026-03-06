-- ============================================================================
-- FUNÇÃO: validate_collection_limit()
-- Descrição: Valida se usuário pode escolher mais coleções baseado no limite do plano
-- Spec: contextual-pricing-system
-- Task: 3.3
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_collection_limit(
  p_user_id UUID,
  p_new_collection_id UUID DEFAULT NULL
)
RETURNS TABLE(
  can_add BOOLEAN,
  current_count INTEGER,
  max_count INTEGER,
  message TEXT,
  is_unlimited BOOLEAN
)
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  v_plan_limit INTEGER;
  v_current_count INTEGER;
  v_is_unlimited BOOLEAN;
BEGIN
  -- 1. Buscar limite do plano do usuário
  SELECT sp.collections_count INTO v_plan_limit
  FROM subscriptions s
  JOIN subscription_plans sp ON sp.id = s.plan_id
  WHERE s.user_id = p_user_id
  AND s.status = 'active'
  LIMIT 1;
  
  -- Validar se usuário tem assinatura ativa
  IF v_plan_limit IS NULL THEN
    RETURN QUERY SELECT 
      false::BOOLEAN,
      0::INTEGER,
      0::INTEGER,
      'No active subscription found'::TEXT,
      false::BOOLEAN;
    RETURN;
  END IF;
  
  -- Verificar se é ilimitado (-1)
  v_is_unlimited := (v_plan_limit = -1);
  
  -- 2. Contar coleções atualmente escolhidas
  SELECT COUNT(*)::INTEGER INTO v_current_count
  FROM subscription_collections sc
  JOIN subscriptions s ON s.id = sc.subscription_id
  WHERE s.user_id = p_user_id
  AND s.status = 'active';
  
  -- 3. Validar limite
  IF v_is_unlimited THEN
    -- Plano ilimitado: sempre pode adicionar
    RETURN QUERY SELECT 
      true::BOOLEAN,
      v_current_count,
      -1::INTEGER,
      'Unlimited collections'::TEXT,
      true::BOOLEAN;
  ELSIF p_new_collection_id IS NOT NULL THEN
    -- Verificando se pode adicionar uma coleção específica
    IF v_current_count < v_plan_limit THEN
      RETURN QUERY SELECT 
        true::BOOLEAN,
        v_current_count,
        v_plan_limit,
        format('Can add %s more collection(s)', v_plan_limit - v_current_count)::TEXT,
        false::BOOLEAN;
    ELSE
      RETURN QUERY SELECT 
        false::BOOLEAN,
        v_current_count,
        v_plan_limit,
        format('Limit reached: %s of %s collections', v_current_count, v_plan_limit)::TEXT,
        false::BOOLEAN;
    END IF;
  ELSE
    -- Apenas verificando status atual
    RETURN QUERY SELECT 
      (v_current_count < v_plan_limit)::BOOLEAN,
      v_current_count,
      v_plan_limit,
      format('%s of %s collections used', v_current_count, v_plan_limit)::TEXT,
      false::BOOLEAN;
  END IF;
END;
$function$;

-- Comentários explicativos
COMMENT ON FUNCTION validate_collection_limit IS 
  'Valida se usuário pode escolher mais coleções baseado no limite do plano.
   Retorna informações detalhadas sobre uso atual e limite máximo.
   Suporta planos ilimitados (collections_count = -1).';

-- Exemplos de uso:
-- SELECT * FROM validate_collection_limit('user-uuid');                    -- Verificar status atual
-- SELECT * FROM validate_collection_limit('user-uuid', 'collection-uuid'); -- Verificar se pode adicionar coleção específica
