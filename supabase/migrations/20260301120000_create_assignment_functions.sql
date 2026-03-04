-- ============================================
-- Migration: FunÃƒÂ§ÃƒÂµes de AtribuiÃƒÂ§ÃƒÂ£o de ColeÃƒÂ§ÃƒÂµes a NÃƒÂ­veis
-- Data: 2026-03-01 12:00
-- DescriÃƒÂ§ÃƒÂ£o: Criar funÃƒÂ§ÃƒÂµes para atribuir/remover coleÃƒÂ§ÃƒÂµes de nÃƒÂ­veis
-- ============================================

-- =====================================================
-- 1. FUNÃƒâ€¡ÃƒÆ’O: assign_collection_to_tier
-- =====================================================

CREATE OR REPLACE FUNCTION assign_collection_to_tier(
  p_collection_id UUID,
  p_tier_id UUID,
  p_assigned_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_assignment_id UUID;
  v_previous_tier_id UUID;
  v_tier RECORD;
  v_collection RECORD;
BEGIN
  -- Validar que o nÃƒÂ­vel existe e estÃƒÂ¡ ativo
  SELECT * INTO v_tier FROM pricing_tiers WHERE id = p_tier_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NÃƒÂ­vel de preÃƒÂ§o nÃƒÂ£o encontrado';
  END IF;
  
  IF NOT v_tier.is_active THEN
    RAISE EXCEPTION 'NÃƒÂ£o ÃƒÂ© possÃƒÂ­vel atribuir coleÃƒÂ§ÃƒÂµes a um nÃƒÂ­vel inativo';
  END IF;
  
  -- Validar que a coleÃƒÂ§ÃƒÂ£o existe
  SELECT * INTO v_collection FROM collections WHERE id = p_collection_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ColeÃƒÂ§ÃƒÂ£o nÃƒÂ£o encontrada';
  END IF;
  
  -- Buscar atribuiÃƒÂ§ÃƒÂ£o anterior (se existir)
  SELECT tier_id INTO v_previous_tier_id
  FROM collection_tier_assignments
  WHERE collection_id = p_collection_id;
  
  -- Remover atribuiÃƒÂ§ÃƒÂ£o anterior
  IF v_previous_tier_id IS NOT NULL THEN
    DELETE FROM collection_tier_assignments WHERE collection_id = p_collection_id;
    
    -- Registrar remoÃƒÂ§ÃƒÂ£o no histÃƒÂ³rico
    INSERT INTO pricing_history (
      collection_id, tier_id, change_type, changed_by,
      old_price_full, old_price_pix, old_deposit_amount,
      metadata
    )
    VALUES (
      p_collection_id, v_previous_tier_id, 'tier_unassigned', p_assigned_by,
      v_collection.price_full, v_collection.price_pix, v_collection.deposit_amount,
      jsonb_build_object('previous_tier_id', v_previous_tier_id)
    );
  END IF;
  
  -- Criar nova atribuiÃƒÂ§ÃƒÂ£o
  INSERT INTO collection_tier_assignments (
    collection_id, tier_id, assigned_by, previous_tier_id
  )
  VALUES (
    p_collection_id, p_tier_id, p_assigned_by, v_previous_tier_id
  )
  RETURNING id INTO v_assignment_id;
  
  -- Atualizar coleÃƒÂ§ÃƒÂ£o para usar preÃƒÂ§os do nÃƒÂ­vel
  UPDATE collections
  SET
    uses_tier_pricing = true,
    is_price_custom = false,
    price_full = v_tier.price_full,
    price_pix = v_tier.price_pix,
    deposit_amount = v_tier.deposit_amount,
    updated_at = NOW()
  WHERE id = p_collection_id;
  
  -- Registrar atribuiÃƒÂ§ÃƒÂ£o no histÃƒÂ³rico
  INSERT INTO pricing_history (
    collection_id, tier_id, change_type, changed_by,
    old_price_full, new_price_full,
    old_price_pix, new_price_pix,
    old_deposit_amount, new_deposit_amount,
    metadata
  )
  VALUES (
    p_collection_id, p_tier_id, 'tier_assigned', p_assigned_by,
    v_collection.price_full, v_tier.price_full,
    v_collection.price_pix, v_tier.price_pix,
    v_collection.deposit_amount, v_tier.deposit_amount,
    jsonb_build_object(
      'tier_name', v_tier.name,
      'previous_tier_id', v_previous_tier_id
    )
  );
  
  RETURN v_assignment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION assign_collection_to_tier IS 'Atribui coleÃƒÂ§ÃƒÂ£o a um nÃƒÂ­vel de preÃƒÂ§o';

-- =====================================================
-- 2. FUNÃƒâ€¡ÃƒÆ’O: unassign_collection_from_tier
-- =====================================================

CREATE OR REPLACE FUNCTION unassign_collection_from_tier(
  p_collection_id UUID,
  p_unassigned_by UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_assignment RECORD;
  v_default_price_full NUMERIC;
  v_default_price_pix NUMERIC;
  v_default_deposit NUMERIC;
  v_collection RECORD;
BEGIN
  -- Buscar atribuiÃƒÂ§ÃƒÂ£o atual
  SELECT * INTO v_assignment
  FROM collection_tier_assignments
  WHERE collection_id = p_collection_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ColeÃƒÂ§ÃƒÂ£o nÃƒÂ£o estÃƒÂ¡ atribuÃƒÂ­da a nenhum nÃƒÂ­vel';
  END IF;
  
  -- Buscar dados atuais da coleÃƒÂ§ÃƒÂ£o
  SELECT * INTO v_collection FROM collections WHERE id = p_collection_id;
  
  -- Buscar preÃƒÂ§os padrÃƒÂ£o do sistema
  SELECT value::NUMERIC INTO v_default_price_full 
  FROM system_settings WHERE key = 'default_price_full';
  
  SELECT value::NUMERIC INTO v_default_price_pix 
  FROM system_settings WHERE key = 'default_price_pix';
  
  SELECT value::NUMERIC INTO v_default_deposit 
  FROM system_settings WHERE key = 'default_deposit_amount';
  
  -- Remover atribuiÃƒÂ§ÃƒÂ£o
  DELETE FROM collection_tier_assignments WHERE collection_id = p_collection_id;
  
  -- Atualizar coleÃƒÂ§ÃƒÂ£o para usar preÃƒÂ§os padrÃƒÂ£o
  UPDATE collections
  SET
    uses_tier_pricing = false,
    is_price_custom = false,
    price_full = v_default_price_full,
    price_pix = v_default_price_pix,
    deposit_amount = v_default_deposit,
    updated_at = NOW()
  WHERE id = p_collection_id;
  
  -- Registrar no histÃƒÂ³rico
  INSERT INTO pricing_history (
    collection_id, tier_id, change_type, changed_by,
    old_price_full, new_price_full,
    old_price_pix, new_price_pix,
    old_deposit_amount, new_deposit_amount,
    metadata
  )
  VALUES (
    p_collection_id, v_assignment.tier_id, 'tier_unassigned', p_unassigned_by,
    v_collection.price_full, v_default_price_full,
    v_collection.price_pix, v_default_price_pix,
    v_collection.deposit_amount, v_default_deposit,
    jsonb_build_object('reverted_to_default', true)
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION unassign_collection_from_tier IS 'Remove atribuiÃƒÂ§ÃƒÂ£o de nÃƒÂ­vel e reverte para preÃƒÂ§os padrÃƒÂ£o';

-- =====================================================
-- 3. FUNÃƒâ€¡ÃƒÆ’O: analyze_pricing_for_migration
-- =====================================================

CREATE OR REPLACE FUNCTION analyze_pricing_for_migration()
RETURNS TABLE (
  price_full NUMERIC,
  price_pix NUMERIC,
  deposit_amount NUMERIC,
  collection_count BIGINT,
  collection_ids UUID[],
  suggested_tier_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.price_full,
    c.price_pix,
    c.deposit_amount,
    COUNT(*)::BIGINT as collection_count,
    ARRAY_AGG(c.id) as collection_ids,
    'NÃƒÂ­vel ' || ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC, c.price_full) as suggested_tier_name
  FROM collections c
  WHERE 
    c.is_active = true
    AND c.uses_tier_pricing = false
    AND c.is_price_custom = false
  GROUP BY c.price_full, c.price_pix, c.deposit_amount
  HAVING COUNT(*) > 0
  ORDER BY COUNT(*) DESC, c.price_full;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION analyze_pricing_for_migration IS 'Analisa preÃƒÂ§os e sugere agrupamentos para migraÃƒÂ§ÃƒÂ£o';

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
