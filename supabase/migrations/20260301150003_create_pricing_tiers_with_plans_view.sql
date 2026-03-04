-- Migration: Criar view pricing_tiers_with_plans
-- Feature: pricing-system-restructure
-- Requisitos: 11.7
-- DescriÃƒÂ§ÃƒÂ£o: Cria view consolidada mostrando nÃƒÂ­veis com todos os seus planos

-- Criar view consolidada
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
  
  (SELECT COUNT(*) FROM collection_tier_assignments WHERE tier_id = pt.id) as assigned_collections_count,
  (SELECT COUNT(*) FROM subscriptions WHERE plan_id = sp.id AND status = 'active') as active_subscriptions_count
  
FROM pricing_tiers pt
LEFT JOIN subscription_plans sp ON sp.tier_id = pt.id
LEFT JOIN purchase_modes pm ON pm.mode_key = sp.plan_mode
ORDER BY pt.display_order, pm.display_order;

-- Adicionar comentÃƒÂ¡rio
COMMENT ON VIEW pricing_tiers_with_plans IS 'View consolidada mostrando nÃƒÂ­veis de preÃƒÂ§o com todos os seus planos e estatÃƒÂ­sticas';

-- Configurar permissÃƒÂµes
GRANT SELECT ON pricing_tiers_with_plans TO authenticated, anon;
