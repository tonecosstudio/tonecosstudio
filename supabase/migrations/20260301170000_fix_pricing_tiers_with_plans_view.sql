-- Migration: Corrigir view pricing_tiers_with_plans para funcionar com RLS
-- Feature: pricing-system-restructure
-- DescriÃƒÂ§ÃƒÂ£o: Recria a view usando funÃƒÂ§ÃƒÂ£o SECURITY DEFINER para bypassar RLS

-- =====================================================
-- 1. REMOVER VIEW ANTIGA
-- =====================================================

DROP VIEW IF EXISTS pricing_tiers_with_plans CASCADE;

-- =====================================================
-- 2. CRIAR FUNÃƒâ€¡ÃƒÆ’O PARA CONTAR ASSINATURAS ATIVAS
-- =====================================================

-- FunÃƒÂ§ÃƒÂ£o auxiliar para contar assinaturas ativas de um plano
-- SECURITY DEFINER permite bypassar RLS para estatÃƒÂ­sticas agregadas
CREATE OR REPLACE FUNCTION get_active_subscriptions_count(p_plan_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM subscriptions
    WHERE plan_id = p_plan_id
    AND status = 'active'
  );
END;
$$;

-- Adicionar comentÃƒÂ¡rio
COMMENT ON FUNCTION get_active_subscriptions_count IS 'Conta assinaturas ativas de um plano (bypassa RLS para estatÃƒÂ­sticas)';

-- =====================================================
-- 3. CRIAR FUNÃƒâ€¡ÃƒÆ’O PARA CONTAR COLEÃƒâ€¡Ãƒâ€¢ES ATRIBUÃƒÂDAS
-- =====================================================

-- FunÃƒÂ§ÃƒÂ£o auxiliar para contar coleÃƒÂ§ÃƒÂµes atribuÃƒÂ­das a um nÃƒÂ­vel
-- SECURITY DEFINER permite bypassar RLS para estatÃƒÂ­sticas agregadas
CREATE OR REPLACE FUNCTION get_assigned_collections_count(p_tier_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM collection_tier_assignments
    WHERE tier_id = p_tier_id
  );
END;
$$;

-- Adicionar comentÃƒÂ¡rio
COMMENT ON FUNCTION get_assigned_collections_count IS 'Conta coleÃƒÂ§ÃƒÂµes atribuÃƒÂ­das a um nÃƒÂ­vel (bypassa RLS para estatÃƒÂ­sticas)';

-- =====================================================
-- 4. RECRIAR VIEW SEM SUBQUERIES PROBLEMÃƒÂTICOS
-- =====================================================

CREATE OR REPLACE VIEW pricing_tiers_with_plans AS
SELECT
  pt.id as tier_id,
  pt.name as tier_name,
  pt.description as tier_description,
  pt.price_full as tier_price_base,
  pt.price_pix as tier_price_pix_base,
  pt.deposit_amount as tier_deposit,
  pt.is_active as tier_is_active,
  pt.is_default as tier_is_default,
  pt.display_order as tier_display_order,
  pt.created_at as tier_created_at,
  pt.updated_at as tier_updated_at,
  
  sp.id as plan_id,
  sp.plan_mode,
  sp.name as plan_name,
  sp.description as plan_description,
  sp.price_full as plan_price_full,
  sp.price_pix as plan_price_pix,
  sp.price_multiplier,
  sp.collections_count,
  sp.deliveries_total,
  sp.is_active as plan_is_active,
  sp.display_order as plan_display_order,
  
  pm.name as mode_name,
  pm.description as mode_description,
  pm.includes_bonus,
  
  -- Usar funÃƒÂ§ÃƒÂµes SECURITY DEFINER para estatÃƒÂ­sticas
  get_assigned_collections_count(pt.id) as assigned_collections_count,
  COALESCE(get_active_subscriptions_count(sp.id), 0) as active_subscriptions_count
  
FROM pricing_tiers pt
LEFT JOIN subscription_plans sp ON sp.tier_id = pt.id
LEFT JOIN purchase_modes pm ON pm.mode_key = sp.plan_mode
ORDER BY pt.display_order, pm.display_order;

-- Adicionar comentÃƒÂ¡rio
COMMENT ON VIEW pricing_tiers_with_plans IS 'View consolidada mostrando nÃƒÂ­veis de preÃƒÂ§o com todos os seus planos e estatÃƒÂ­sticas (usa SECURITY DEFINER para bypassar RLS)';

-- =====================================================
-- 5. CONFIGURAR PERMISSÃƒâ€¢ES
-- =====================================================

-- Permitir acesso ÃƒÂ  view para usuÃƒÂ¡rios autenticados e anÃƒÂ´nimos
GRANT SELECT ON pricing_tiers_with_plans TO authenticated, anon;

-- Permitir execuÃƒÂ§ÃƒÂ£o das funÃƒÂ§ÃƒÂµes auxiliares
GRANT EXECUTE ON FUNCTION get_active_subscriptions_count(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_assigned_collections_count(UUID) TO authenticated, anon;

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
