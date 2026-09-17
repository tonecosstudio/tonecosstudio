-- Scope: restore the narrow public pricing boundary consumed by the public catalog
-- and by create_standalone_purchase_atomic without granting anon direct access to
-- collection_tier_assignments.
--
-- This migration is intentionally staged in Git first. Do not apply remotely until
-- release review confirms the rollback below and validates the function against the
-- canonical Supabase project.
--
-- Rollback after application:
--   REVOKE EXECUTE ON FUNCTION public.get_collection_pricing(uuid)
--     FROM anon, authenticated, service_role;
--   DROP FUNCTION IF EXISTS public.get_collection_pricing(uuid);

CREATE OR REPLACE FUNCTION public.get_collection_pricing(p_collection_id uuid)
RETURNS TABLE (
  price_full numeric,
  price_pix numeric,
  deposit_amount numeric,
  remaining_full numeric,
  remaining_pix numeric,
  is_custom boolean,
  tier_id uuid,
  tier_name text,
  pricing_source text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_is_custom boolean;
  v_tier_id uuid;
  v_tier_name text;
  v_price_full numeric;
  v_price_pix numeric;
  v_deposit_amount numeric;
BEGIN
  IF p_collection_id IS NULL THEN
    RAISE EXCEPTION 'COLLECTION_ID_REQUIRED' USING ERRCODE = '22023';
  END IF;

  SELECT c.is_price_custom
    INTO v_is_custom
    FROM public.collections c
   WHERE c.id = p_collection_id
     AND c.is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'COLLECTION_NOT_FOUND_OR_INACTIVE' USING ERRCODE = 'P0002';
  END IF;

  -- The current schema no longer stores collection-level custom BRL amounts.
  -- Refuse to invent a price until a canonical custom-price source is introduced.
  IF v_is_custom THEN
    RAISE EXCEPTION 'CUSTOM_PRICING_SOURCE_NOT_CONFIGURED' USING ERRCODE = '22023';
  END IF;

  SELECT
    t.id,
    t.name,
    t.price_full,
    t.price_pix,
    t.deposit_amount
  INTO
    v_tier_id,
    v_tier_name,
    v_price_full,
    v_price_pix,
    v_deposit_amount
  FROM public.collection_tier_assignments a
  JOIN public.pricing_tiers t ON t.id = a.tier_id
  WHERE a.collection_id = p_collection_id
    AND COALESCE(t.is_active, false) = true
  LIMIT 1;

  IF FOUND THEN
    IF v_price_full IS NULL
       OR v_price_pix IS NULL
       OR v_deposit_amount IS NULL
       OR v_price_full <= 0
       OR v_price_pix <= 0
       OR v_price_pix > v_price_full
       OR v_deposit_amount < 0
       OR v_deposit_amount > LEAST(v_price_full, v_price_pix) THEN
      RAISE EXCEPTION 'INVALID_TIER_PRICING' USING ERRCODE = '22023';
    END IF;

    RETURN QUERY
    SELECT
      v_price_full,
      v_price_pix,
      v_deposit_amount,
      v_price_full - v_deposit_amount,
      v_price_pix - v_deposit_amount,
      false,
      v_tier_id,
      v_tier_name,
      'tier'::text;
    RETURN;
  END IF;

  SELECT
    MAX(CASE
      WHEN s.key = 'default_price_full'
       AND s.value ~ '^[0-9]+([.][0-9]+)?$'
      THEN s.value::numeric
    END),
    MAX(CASE
      WHEN s.key = 'default_price_pix'
       AND s.value ~ '^[0-9]+([.][0-9]+)?$'
      THEN s.value::numeric
    END),
    MAX(CASE
      WHEN s.key = 'default_deposit_amount'
       AND s.value ~ '^[0-9]+([.][0-9]+)?$'
      THEN s.value::numeric
    END)
  INTO v_price_full, v_price_pix, v_deposit_amount
  FROM public.system_settings s
  WHERE s.key IN (
    'default_price_full',
    'default_price_pix',
    'default_deposit_amount'
  );

  IF v_price_full IS NULL
     OR v_price_pix IS NULL
     OR v_deposit_amount IS NULL
     OR v_price_full <= 0
     OR v_price_pix <= 0
     OR v_price_pix > v_price_full
     OR v_deposit_amount < 0
     OR v_deposit_amount > LEAST(v_price_full, v_price_pix) THEN
    RAISE EXCEPTION 'DEFAULT_PRICING_NOT_CONFIGURED' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT
    v_price_full,
    v_price_pix,
    v_deposit_amount,
    v_price_full - v_deposit_amount,
    v_price_pix - v_deposit_amount,
    false,
    NULL::uuid,
    NULL::text,
    'default'::text;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_collection_pricing(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_collection_pricing(uuid) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.get_collection_pricing(uuid) IS
  'Public collection pricing boundary. Resolves one collection to active tier pricing or validated public defaults without exposing collection_tier_assignments directly.';
