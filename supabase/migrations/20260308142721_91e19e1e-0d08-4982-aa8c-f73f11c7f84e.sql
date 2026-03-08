
-- Fix SECURITY DEFINER views by recreating with SECURITY INVOKER
CREATE OR REPLACE VIEW public.pricing_tier_stats WITH (security_invoker = true) AS
SELECT 
  pt.id as tier_id, pt.name as tier_name, pt.description as tier_description,
  pt.base_price, pt.is_active, pt.is_default, pt.display_order, pt.features,
  COALESCE(plan_counts.plan_count, 0) as plan_count,
  COALESCE(sub_counts.subscriber_count, 0) as subscriber_count
FROM public.pricing_tiers pt
LEFT JOIN (SELECT tier_id, COUNT(*) as plan_count FROM public.subscription_plans WHERE is_active = true GROUP BY tier_id) plan_counts ON plan_counts.tier_id = pt.id
LEFT JOIN (SELECT sp.tier_id, COUNT(DISTINCT s.user_id) as subscriber_count FROM public.subscriptions s JOIN public.subscription_plans sp ON sp.id = s.plan_id WHERE s.status = 'active' GROUP BY sp.tier_id) sub_counts ON sub_counts.tier_id = pt.id;

CREATE OR REPLACE VIEW public.pricing_tiers_with_plans WITH (security_invoker = true) AS
SELECT 
  pt.id as tier_id, pt.name as tier_name, pt.description as tier_description,
  pt.base_price as tier_base_price, pt.is_active as tier_is_active, pt.is_default as tier_is_default,
  pt.display_order as tier_display_order, pt.features as tier_features,
  sp.id as plan_id, sp.name as plan_name, sp.slug as plan_slug, sp.description as plan_description,
  sp.price as plan_price, sp.billing_interval, sp.deliveries_per_cycle, sp.is_active as plan_is_active, sp.features as plan_features
FROM public.pricing_tiers pt
LEFT JOIN public.subscription_plans sp ON sp.tier_id = pt.id;
