-- ============================================
-- Migration: Funções de Atribuição de Coleções a Níveis
-- Data: 2026-03-01 12:00
-- Descrição: Criar funções para atribuir/remover coleções de níveis
-- ============================================

-- =====================================================
-- 1. FUNÇÃO: assign_collection_to_tier
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
  -- Validar que o nível existe e está ativo
  SELECT * INTO v_tier FROM pricing_tiers WHERE id = p_tier_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nível de preço não encontrado';
  END IF;
  
  IF NOT v_tier.is_active THEN
    RAISE EXCEPTION 'Não é possível atribuir coleções a um nível inativo';
  END IF;
  
  -- Validar que a coleção existe
  SELECT * INTO v_collection FROM collections WHERE id = p_collection_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Coleção não encontrada';
  END IF;
  
  -- Buscar atribuição anterior (se existir)
  SELECT tier_id INTO v_previous_tier_id
  FROM collection_tier_assignments
  WHERE collection_id = p_collection_id;
  
  -- Remover atribuição anterior
  IF v_previous_tier_id IS NOT NULL THEN
    DELETE FROM collection_tier_assignments WHERE collection_id = p_collection_id;
    
    -- Registrar remoção no histórico
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
  
  -- Criar nova atribuição
  INSERT INTO collection_tier_assignments (
    collection_id, tier_id, assigned_by, previous_tier_id
  )
  VALUES (
    p_collection_id, p_tier_id, p_assigned_by, v_previous_tier_id
  )
  RETURNING id INTO v_assignment_id;
  
  -- Atualizar coleção para usar preços do nível
  UPDATE collections
  SET
    uses_tier_pricing = true,
    is_price_custom = false,
    price_full = v_tier.price_full,
    price_pix = v_tier.price_pix,
    deposit_amount = v_tier.deposit_amount,
    updated_at = NOW()
  WHERE id = p_collection_id;
  
  -- Registrar atribuição no histórico
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

COMMENT ON FUNCTION assign_collection_to_tier IS 'Atribui coleção a um nível de preço';

-- =====================================================
-- 2. FUNÇÃO: unassign_collection_from_tier
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
  -- Buscar atribuição atual
  SELECT * INTO v_assignment
  FROM collection_tier_assignments
  WHERE collection_id = p_collection_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Coleção não está atribuída a nenhum nível';
  END IF;
  
  -- Buscar dados atuais da coleção
  SELECT * INTO v_collection FROM collections WHERE id = p_collection_id;
  
  -- Buscar preços padrão do sistema
  SELECT value::NUMERIC INTO v_default_price_full 
  FROM system_settings WHERE key = 'default_price_full';
  
  SELECT value::NUMERIC INTO v_default_price_pix 
  FROM system_settings WHERE key = 'default_price_pix';
  
  SELECT value::NUMERIC INTO v_default_deposit 
  FROM system_settings WHERE key = 'default_deposit_amount';
  
  -- Remover atribuição
  DELETE FROM collection_tier_assignments WHERE collection_id = p_collection_id;
  
  -- Atualizar coleção para usar preços padrão
  UPDATE collections
  SET
    uses_tier_pricing = false,
    is_price_custom = false,
    price_full = v_default_price_full,
    price_pix = v_default_price_pix,
    deposit_amount = v_default_deposit,
    updated_at = NOW()
  WHERE id = p_collection_id;
  
  -- Registrar no histórico
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

COMMENT ON FUNCTION unassign_collection_from_tier IS 'Remove atribuição de nível e reverte para preços padrão';

-- =====================================================
-- 3. FUNÇÃO: analyze_pricing_for_migration
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
    'Nível ' || ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC, c.price_full) as suggested_tier_name
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

COMMENT ON FUNCTION analyze_pricing_for_migration IS 'Analisa preços e sugere agrupamentos para migração';

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
