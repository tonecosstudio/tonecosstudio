-- Scope public catalog/config reads to anon explicitly and fold authenticated
-- public visibility + admin visibility into one policy per table.
-- postgres/service_role are the only other SELECT grantees and both BYPASSRLS.

DROP POLICY IF EXISTS characters_select_public ON public.characters;
DROP POLICY IF EXISTS characters_select_admin ON public.characters;
CREATE POLICY characters_select_public_anon
ON public.characters FOR SELECT TO anon
USING (is_revealed = true);
CREATE POLICY characters_select_public_or_admin_authenticated
ON public.characters FOR SELECT TO authenticated
USING (
  is_revealed = true
  OR (SELECT current_user_role()) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
);

DROP POLICY IF EXISTS "Anyone can view active exchange rate" ON public.coin_exchange_rate;
DROP POLICY IF EXISTS "Admins can view all exchange rates" ON public.coin_exchange_rate;
CREATE POLICY coin_exchange_rate_select_active_anon
ON public.coin_exchange_rate FOR SELECT TO anon
USING (is_active = true);
CREATE POLICY coin_exchange_rate_select_active_or_admin_authenticated
ON public.coin_exchange_rate FOR SELECT TO authenticated
USING (
  is_active = true
  OR (SELECT current_user_role()) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
);

DROP POLICY IF EXISTS "Anyone can view active packages" ON public.coin_packages;
DROP POLICY IF EXISTS "Admins can view all packages" ON public.coin_packages;
CREATE POLICY coin_packages_select_active_anon
ON public.coin_packages FOR SELECT TO anon
USING (is_active = true);
CREATE POLICY coin_packages_select_active_or_admin_authenticated
ON public.coin_packages FOR SELECT TO authenticated
USING (
  is_active = true
  OR (SELECT current_user_role()) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
);

DROP POLICY IF EXISTS "Anyone can view active pricing" ON public.collection_base_pricing;
DROP POLICY IF EXISTS "Admins can view all pricing" ON public.collection_base_pricing;
CREATE POLICY collection_base_pricing_select_active_anon
ON public.collection_base_pricing FOR SELECT TO anon
USING (is_active = true);
CREATE POLICY collection_base_pricing_select_active_or_admin_authenticated
ON public.collection_base_pricing FOR SELECT TO authenticated
USING (
  is_active = true
  OR (SELECT current_user_role()) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
);

DROP POLICY IF EXISTS collection_characters_select_public ON public.collection_characters;
DROP POLICY IF EXISTS "Admins can view all collection characters" ON public.collection_characters;
CREATE POLICY collection_characters_select_public_anon
ON public.collection_characters FOR SELECT TO anon
USING (
  is_catalog = true
  OR (
    status <> 'archived'::text
    AND EXISTS (
      SELECT 1
      FROM public.collections c
      WHERE c.id = collection_characters.collection_id
        AND c.is_active = true
        AND c.status = 'active'::collection_status
    )
  )
);
CREATE POLICY collection_characters_select_public_or_admin_authenticated
ON public.collection_characters FOR SELECT TO authenticated
USING (
  is_catalog = true
  OR (
    status <> 'archived'::text
    AND EXISTS (
      SELECT 1
      FROM public.collections c
      WHERE c.id = collection_characters.collection_id
        AND c.is_active = true
        AND c.status = 'active'::collection_status
    )
  )
  OR (SELECT current_user_role()) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
);

DROP POLICY IF EXISTS "Anyone can view active collection types" ON public.collection_types;
DROP POLICY IF EXISTS "Admins can view all collection types" ON public.collection_types;
CREATE POLICY collection_types_select_active_anon
ON public.collection_types FOR SELECT TO anon
USING (is_active = true);
CREATE POLICY collection_types_select_active_or_admin_authenticated
ON public.collection_types FOR SELECT TO authenticated
USING (
  is_active = true
  OR (SELECT current_user_role()) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
);

DROP POLICY IF EXISTS collections_select_public ON public.collections;
DROP POLICY IF EXISTS collections_select_admin ON public.collections;
CREATE POLICY collections_select_public_anon
ON public.collections FOR SELECT TO anon
USING (is_active = true AND status = 'active'::collection_status);
CREATE POLICY collections_select_public_or_admin_authenticated
ON public.collections FOR SELECT TO authenticated
USING (
  (is_active = true AND status = 'active'::collection_status)
  OR (SELECT current_user_role()) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
);

DROP POLICY IF EXISTS "Anyone can view active multipliers" ON public.pricing_context_multipliers;
DROP POLICY IF EXISTS "Admins can view all multipliers" ON public.pricing_context_multipliers;
CREATE POLICY pricing_context_multipliers_select_active_anon
ON public.pricing_context_multipliers FOR SELECT TO anon
USING (is_active = true);
CREATE POLICY pricing_context_multipliers_select_active_or_admin_authenticated
ON public.pricing_context_multipliers FOR SELECT TO authenticated
USING (
  is_active = true
  OR (SELECT current_user_role()) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
);

DROP POLICY IF EXISTS "Anyone can view active tiers" ON public.pricing_tiers;
DROP POLICY IF EXISTS "Admins can view all tiers" ON public.pricing_tiers;
CREATE POLICY pricing_tiers_select_active_anon
ON public.pricing_tiers FOR SELECT TO anon
USING (is_active = true);
CREATE POLICY pricing_tiers_select_active_or_admin_authenticated
ON public.pricing_tiers FOR SELECT TO authenticated
USING (
  is_active = true
  OR (SELECT current_user_role()) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
);
