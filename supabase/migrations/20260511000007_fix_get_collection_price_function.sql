-- ============================================================================
-- FIX: get_collection_price() - Corrigir referência de tabela
-- Problema: Função estava referenciando tabela inexistente 'user_subscription_collections'
-- Solução: Usar tabela correta 'subscription_collections'
-- Data: 2026-05-11
-- ============================================================================

CREATE OR REPLACE FUNCTION get_collection_price(
  p_collection_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  v_collection_type_name TEXT;
  v_base_price_coins INTEGER;
  v_has_subscription BOOLEAN;
  v_is_chosen BOOLEAN;
  v_discount_percentage INTEGER;
  v_multiplier DECIMAL(4,2);
  v_final_price INTEGER;
BEGIN
  -- 1. Buscar tipo da coleção e preço base
  SELECT 
    ct.name,
    cbp.base_price_coins
  INTO 
    v_collection_type_name,
    v_base_price_coins
  FROM collections c
  JOIN collection_types ct ON c.collection_type_id = ct.id
  JOIN collection_base_pricing cbp ON ct.id = cbp.collection_type_id
  WHERE c.id = p_collection_id
  AND cbp.is_active = true;
  
  -- Validar se coleção existe
  IF v_collection_type_name IS NULL THEN
    RAISE EXCEPTION 'Collection not found: %', p_collection_id;
  END IF;
  
  IF v_base_price_coins IS NULL THEN
    RAISE EXCEPTION 'Base price not configured for collection: %', p_collection_id;
  END IF;
  
  -- 2. PRIORIDADE MÁXIMA: Tipo de Coleção
  -- Catálogos têm preço fixo, ignora assinatura e escolha
  IF v_collection_type_name IN ('standard_catalog', 'premium_catalog') THEN
    RETURN v_base_price_coins;
  END IF;
  
  -- 3. PRIORIDADE MÉDIA: Status de Assinatura (apenas para tipo 'subscription')
  IF p_user_id IS NULL THEN
    v_has_subscription := false;
  ELSE
    SELECT EXISTS(
      SELECT 1 
      FROM subscriptions
      WHERE user_id = p_user_id 
      AND status = 'active'
    ) INTO v_has_subscription;
  END IF;
  
  -- Se não tem assinatura, aplica multiplicador no_subscription
  IF NOT v_has_subscription THEN
    SELECT multiplier INTO v_multiplier
    FROM pricing_context_multipliers
    WHERE user_context = 'no_subscription'
    AND is_active = true;
    
    IF v_multiplier IS NULL THEN
      RAISE EXCEPTION 'Multiplier not configured for context: no_subscription';
    END IF;
    
    v_final_price := ROUND(v_base_price_coins * v_multiplier);
    RETURN v_final_price;
  END IF;
  
  -- 4. PRIORIDADE BAIXA: Coleção Escolhida (apenas para assinantes)
  -- FIX: Usar tabela correta 'subscription_collections' ao invés de 'user_subscription_collections'
  SELECT EXISTS(
    SELECT 1 
    FROM subscription_collections sc
    JOIN subscriptions s ON s.id = sc.subscription_id
    WHERE s.user_id = p_user_id
    AND s.status = 'active'
    AND sc.collection_id = p_collection_id
  ) INTO v_is_chosen;
  
  IF v_is_chosen THEN
    -- Coleção escolhida: aplica desconto configurável (subtração percentual)
    SELECT chosen_collection_discount_percentage INTO v_discount_percentage
    FROM pricing_context_multipliers
    WHERE user_context = 'subscribed_chosen'
    AND is_active = true;
    
    IF v_discount_percentage IS NULL THEN
      RAISE EXCEPTION 'Discount percentage not configured for context: subscribed_chosen';
    END IF;
    
    -- Fórmula: base_price - (base_price × discount_percentage / 100)
    v_final_price := v_base_price_coins - ROUND(v_base_price_coins * v_discount_percentage / 100.0);
    RETURN v_final_price;
  ELSE
    -- Coleção não escolhida: aplica multiplicador
    SELECT multiplier INTO v_multiplier
    FROM pricing_context_multipliers
    WHERE user_context = 'subscribed_not_chosen'
    AND is_active = true;
    
    IF v_multiplier IS NULL THEN
      RAISE EXCEPTION 'Multiplier not configured for context: subscribed_not_chosen';
    END IF;
    
    v_final_price := ROUND(v_base_price_coins * v_multiplier);
    RETURN v_final_price;
  END IF;
END;
$function$;

-- Comentários explicativos
COMMENT ON FUNCTION get_collection_price IS 
  'Calcula preço contextual de uma coleção em COINS baseado em tipo, assinatura e escolha do usuário. 
   Usa dois métodos de cálculo:
   1. Coleções escolhidas: base_price - (base_price × discount_percentage / 100)
   2. Outras: base_price × multiplier
   
   FIX 2026-05-11: Corrigida referência de tabela user_subscription_collections -> subscription_collections';
