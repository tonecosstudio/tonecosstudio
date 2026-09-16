-- Expand the canonical admin pricing snapshot so purchase-mode configuration
-- can use the same server-authoritative read boundary instead of a browser
-- client with locally forged Supabase table types.
CREATE OR REPLACE FUNCTION public.admin_get_pricing_tiers_snapshot(
  p_tier_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
BEGIN
  PERFORM public.assert_admin_access();

  SELECT jsonb_build_object(
    'tiers', COALESCE((
      SELECT jsonb_agg(to_jsonb(t) ORDER BY t.display_order NULLS LAST, t.name, t.id)
      FROM (
        SELECT
          pt.id,
          pt.name,
          pt.description,
          pt.price_brl,
          pt.price_full,
          pt.price_pix,
          pt.deposit_amount,
          pt.is_active,
          pt.is_default,
          pt.display_order
        FROM public.pricing_tiers pt
        WHERE p_tier_id IS NULL OR pt.id = p_tier_id
      ) t
    ), '[]'::jsonb),
    'plans', COALESCE((
      SELECT jsonb_agg(to_jsonb(p) ORDER BY p.pricing_tier_id, p.display_order NULLS LAST, p.name, p.id)
      FROM (
        SELECT
          sp.id,
          sp.pricing_tier_id,
          sp.name,
          sp.description,
          sp.price,
          sp.price_full,
          sp.price_pix,
          sp.plan_type,
          sp.billing_interval,
          sp.collections_count,
          sp.deliveries_total,
          sp.deliveries_per_cycle,
          sp.is_active,
          sp.display_order,
          sp.created_at,
          sp.updated_at
        FROM public.subscription_plans sp
        WHERE sp.pricing_tier_id IS NOT NULL
          AND (p_tier_id IS NULL OR sp.pricing_tier_id = p_tier_id)
      ) p
    ), '[]'::jsonb),
    'purchase_modes', COALESCE((
      SELECT jsonb_agg(to_jsonb(pm) ORDER BY pm.display_order, pm.mode_key)
      FROM (
        SELECT
          id,
          mode_key,
          name,
          description,
          price_multiplier,
          collections_count,
          deliveries_total,
          includes_bonus,
          is_active,
          display_order,
          created_at,
          updated_at
        FROM public.purchase_modes
      ) pm
    ), '[]'::jsonb),
    'assignment_counts', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object('tier_id', cta.tier_id, 'count', cta.assignment_count)
        ORDER BY cta.tier_id
      )
      FROM (
        SELECT tier_id, count(*)::integer AS assignment_count
        FROM public.collection_tier_assignments
        WHERE p_tier_id IS NULL OR tier_id = p_tier_id
        GROUP BY tier_id
      ) cta
    ), '[]'::jsonb),
    'active_subscription_counts', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object('plan_id', s.plan_id, 'count', s.subscription_count)
        ORDER BY s.plan_id
      )
      FROM (
        SELECT sub.plan_id, count(*)::integer AS subscription_count
        FROM public.subscriptions sub
        JOIN public.subscription_plans sp ON sp.id = sub.plan_id
        WHERE sub.status = 'active'
          AND sp.pricing_tier_id IS NOT NULL
          AND (p_tier_id IS NULL OR sp.pricing_tier_id = p_tier_id)
        GROUP BY sub.plan_id
      ) s
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_pricing_tiers_snapshot(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_pricing_tiers_snapshot(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.admin_get_pricing_tiers_snapshot(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_pricing_tiers_snapshot(uuid) TO service_role;

NOTIFY pgrst, 'reload schema';
