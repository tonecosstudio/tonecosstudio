-- ============================================
-- Migration: Views e Triggers para Sistema de Níveis de Preço
-- Data: 2026-03-01 13:00
-- Descrição: Criar views otimizadas e triggers automáticos
-- ============================================

-- =====================================================
-- 1. VIEW: pricing_tier_stats
-- =====================================================

CREATE OR REPLACE VIEW pricing_tier_stats AS
SELECT
  pt.id,
  pt.name,
  pt.description,
  pt.price_full,
  pt.price_pix,
  pt.deposit_amount,
  pt.pix_discount_percentage,
  pt.is_active,
  pt.is_default,
  pt.display_order,
  pt.created_at,
  pt.updated_at,
  COUNT(cta.collection_id) as assigned_collections_count,
  COALESCE(SUM(CASE WHEN c.is_active THEN 1 ELSE 0 END), 0) as active_collections_count
FROM pricing_tiers pt
LEFT JOIN collection_tier_assignments cta ON pt.id = cta.tier_id
LEFT JOIN collections c ON cta.collection_id = c.id
GROUP BY pt.id, pt.name, pt.description, pt.price_full, pt.price_pix, 
         pt.deposit_amount, pt.pix_discount_percentage, pt.is_active, 
         pt.is_default, pt.display_order, pt.created_at, pt.updated_at;

COMMENT ON VIEW pricing_tier_stats IS 'Estatísticas de uso de cada nível de preço';

-- Permitir leitura da view
GRANT SELECT ON pricing_tier_stats TO authenticated, anon;

-- =====================================================
-- 2. VIEW: collections_with_tier_info
-- =====================================================

CREATE OR REPLACE VIEW collections_with_tier_info AS
SELECT
  c.id,
  c.name,
  c.slug,
  c.price_full,
  c.price_pix,
  c.deposit_amount,
  c.uses_tier_pricing,
  c.is_price_custom,
  c.is_active,
  cta.tier_id,
  pt.name as tier_name,
  pt.is_default as is_default_tier,
  cta.assigned_at as tier_assigned_at
FROM collections c
LEFT JOIN collection_tier_assignments cta ON c.id = cta.collection_id
LEFT JOIN pricing_tiers pt ON cta.tier_id = pt.id;

COMMENT ON VIEW collections_with_tier_info IS 'Coleções com informações de nível atribuído';

-- Permitir leitura da view
GRANT SELECT ON collections_with_tier_info TO authenticated, anon;

-- =====================================================
-- 3. VIEW: collection_effective_pricing
-- =====================================================

CREATE OR REPLACE VIEW collection_effective_pricing AS
SELECT
  c.id as collection_id,
  c.name as collection_name,
  c.slug,
  c.is_price_custom,
  cta.tier_id as pricing_tier_id,
  pt.name as tier_name,
  CASE
    WHEN c.is_price_custom THEN c.price_full
    WHEN c.uses_tier_pricing AND pt.id IS NOT NULL THEN pt.price_full
    ELSE (SELECT value::NUMERIC FROM system_settings WHERE key = 'default_price_full')
  END as effective_price_full,
  CASE
    WHEN c.is_price_custom THEN c.price_pix
    WHEN c.uses_tier_pricing AND pt.id IS NOT NULL THEN pt.price_pix
    ELSE (SELECT value::NUMERIC FROM system_settings WHERE key = 'default_price_pix')
  END as effective_price_pix,
  CASE
    WHEN c.is_price_custom THEN c.deposit_amount
    WHEN c.uses_tier_pricing AND pt.id IS NOT NULL THEN pt.deposit_amount
    ELSE (SELECT value::NUMERIC FROM system_settings WHERE key = 'default_deposit_amount')
  END as effective_deposit_amount,
  CASE
    WHEN c.is_price_custom THEN 'custom'
    WHEN c.uses_tier_pricing AND pt.id IS NOT NULL THEN 'tier'
    ELSE 'default'
  END as pricing_source
FROM collections c
LEFT JOIN collection_tier_assignments cta ON c.id = cta.collection_id
LEFT JOIN pricing_tiers pt ON cta.tier_id = pt.id;

COMMENT ON VIEW collection_effective_pricing IS 'Preços efetivos de cada coleção (tier, custom ou default)';

-- Permitir leitura da view
GRANT SELECT ON collection_effective_pricing TO authenticated, anon;

-- =====================================================
-- 4. TRIGGER: Garantir apenas um nível padrão
-- =====================================================

CREATE OR REPLACE FUNCTION validate_single_default_tier()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    -- Remover flag de outros níveis
    UPDATE pricing_tiers 
    SET is_default = false 
    WHERE is_default = true AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_single_default_tier ON pricing_tiers;
CREATE TRIGGER trigger_validate_single_default_tier
  BEFORE INSERT OR UPDATE ON pricing_tiers
  FOR EACH ROW
  EXECUTE FUNCTION validate_single_default_tier();

COMMENT ON FUNCTION validate_single_default_tier IS 'Garante que apenas um nível seja padrão';

-- =====================================================
-- 5. TRIGGER: Atribuir nível padrão a novas coleções
-- =====================================================

CREATE OR REPLACE FUNCTION apply_default_tier_to_new_collection()
RETURNS TRIGGER AS $$
DECLARE
  v_default_tier_id UUID;
  v_default_tier RECORD;
BEGIN
  -- Buscar nível padrão
  SELECT id INTO v_default_tier_id
  FROM pricing_tiers
  WHERE is_default = true AND is_active = true
  LIMIT 1;
  
  -- Se existe nível padrão, atribuir
  IF v_default_tier_id IS NOT NULL THEN
    SELECT * INTO v_default_tier FROM pricing_tiers WHERE id = v_default_tier_id;
    
    -- Criar atribuição
    INSERT INTO collection_tier_assignments (collection_id, tier_id)
    VALUES (NEW.id, v_default_tier_id);
    
    -- Atualizar preços da coleção
    NEW.uses_tier_pricing := true;
    NEW.is_price_custom := false;
    NEW.price_full := v_default_tier.price_full;
    NEW.price_pix := v_default_tier.price_pix;
    NEW.deposit_amount := v_default_tier.deposit_amount;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_apply_default_tier_to_new_collection ON collections;
CREATE TRIGGER trigger_apply_default_tier_to_new_collection
  BEFORE INSERT ON collections
  FOR EACH ROW
  EXECUTE FUNCTION apply_default_tier_to_new_collection();

COMMENT ON FUNCTION apply_default_tier_to_new_collection IS 'Atribui nível padrão a novas coleções automaticamente';

-- =====================================================
-- 6. TRIGGER: Prevenir desativação de nível padrão
-- =====================================================

CREATE OR REPLACE FUNCTION prevent_default_tier_deactivation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_default = true AND NEW.is_active = false THEN
    RAISE EXCEPTION 'Não é possível desativar o nível padrão. Defina outro nível como padrão primeiro.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_default_tier_deactivation ON pricing_tiers;
CREATE TRIGGER trigger_prevent_default_tier_deactivation
  BEFORE UPDATE ON pricing_tiers
  FOR EACH ROW
  EXECUTE FUNCTION prevent_default_tier_deactivation();

COMMENT ON FUNCTION prevent_default_tier_deactivation IS 'Previne desativação do nível padrão';

-- =====================================================
-- 7. TRIGGER: Remover tier_id quando is_price_custom = true
-- =====================================================

CREATE OR REPLACE FUNCTION remove_tier_on_custom_pricing()
RETURNS TRIGGER AS $$
BEGIN
  -- Se está habilitando preço customizado, remover atribuição de nível
  IF NEW.is_price_custom = true AND (OLD.is_price_custom IS NULL OR OLD.is_price_custom = false) THEN
    -- Remover atribuição
    DELETE FROM collection_tier_assignments WHERE collection_id = NEW.id;
    
    -- Marcar que não usa tier pricing
    NEW.uses_tier_pricing := false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_remove_tier_on_custom_pricing ON collections;
CREATE TRIGGER trigger_remove_tier_on_custom_pricing
  BEFORE UPDATE ON collections
  FOR EACH ROW
  EXECUTE FUNCTION remove_tier_on_custom_pricing();

COMMENT ON FUNCTION remove_tier_on_custom_pricing IS 'Remove atribuição de nível quando preço customizado é habilitado';

-- =====================================================
-- 8. TRIGGER: Atualizar timestamp de updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_pricing_tier_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_pricing_tier_timestamp ON pricing_tiers;
CREATE TRIGGER trigger_update_pricing_tier_timestamp
  BEFORE UPDATE ON pricing_tiers
  FOR EACH ROW
  EXECUTE FUNCTION update_pricing_tier_timestamp();

COMMENT ON FUNCTION update_pricing_tier_timestamp IS 'Atualiza timestamp de updated_at automaticamente';

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
