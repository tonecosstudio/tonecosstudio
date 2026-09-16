-- Pricing/configuration state is server-authoritative. Browser code reads these
-- tables, while mutations use admin RPCs/Edge gateways. Remove residual direct
-- DML grants and legacy FOR ALL policies so an admin session cannot bypass the
-- canonical validation/audit path.

REVOKE INSERT, UPDATE, DELETE ON TABLE public.pricing_tiers FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.collection_base_pricing FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.pricing_context_multipliers FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.price_categories FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.coin_packages FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.coin_exchange_rate FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.quick_replies FROM authenticated;

DROP POLICY IF EXISTS "Admins can manage tiers" ON public.pricing_tiers;
DROP POLICY IF EXISTS "Admins can manage pricing" ON public.collection_base_pricing;
DROP POLICY IF EXISTS "Admins can manage multipliers" ON public.pricing_context_multipliers;
DROP POLICY IF EXISTS "Admins can manage price categories" ON public.price_categories;
DROP POLICY IF EXISTS "Admins can manage packages" ON public.coin_packages;
DROP POLICY IF EXISTS "Admins can manage exchange rates" ON public.coin_exchange_rate;
DROP POLICY IF EXISTS quick_replies_modify_admin ON public.quick_replies;

-- Preserve direct reads required by product/admin UI.
GRANT SELECT ON TABLE public.pricing_tiers TO authenticated;
GRANT SELECT ON TABLE public.collection_base_pricing TO authenticated;
GRANT SELECT ON TABLE public.pricing_context_multipliers TO authenticated;
GRANT SELECT ON TABLE public.price_categories TO authenticated;
GRANT SELECT ON TABLE public.coin_packages TO authenticated;
GRANT SELECT ON TABLE public.coin_exchange_rate TO authenticated;
GRANT SELECT ON TABLE public.quick_replies TO authenticated;

NOTIFY pgrst, 'reload schema';
