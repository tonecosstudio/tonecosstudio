-- Scope: align admin_upsert_price_category with the live price_categories table.
--
-- The live table has no `description` column, but the current SECURITY DEFINER RPC
-- attempts to INSERT/UPDATE that column and therefore fails at runtime.
--
-- Compatibility decision:
-- - keep the existing function signature so admin-rpc and generated clients do not
--   break only because of this migration;
-- - reject a non-empty p_description explicitly instead of silently discarding it;
-- - write only columns that actually exist in public.price_categories;
-- - keep EXECUTE restricted to service_role (plus the postgres owner).
--
-- This migration is staged in Git only. Do not apply remotely until the release
-- checkpoint explicitly approves the change and validates the rollback below.
--
-- Rollback proof: the block at the end of this file contains the exact previous
-- function definition observed in the canonical Supabase project on 2026-09-17.

CREATE OR REPLACE FUNCTION public.admin_upsert_price_category(
  p_category_id uuid DEFAULT NULL,
  p_name text DEFAULT NULL,
  p_display_name text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_price_coins integer DEFAULT 0,
  p_coin_value_in_cents integer DEFAULT 0,
  p_price_standalone integer DEFAULT 0,
  p_display_order integer DEFAULT 0,
  p_is_active boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name text := NULLIF(btrim(COALESCE(p_name, '')), '');
  v_display_name text := NULLIF(btrim(COALESCE(p_display_name, '')), '');
  v_description text := NULLIF(btrim(COALESCE(p_description, '')), '');
  v_result_id uuid;
BEGIN
  PERFORM public.assert_admin_catalog_access();

  IF v_name IS NULL OR length(v_name) > 80 OR v_name ~ '<[^>]*>' THEN
    RAISE EXCEPTION 'Invalid category name' USING ERRCODE = '22023';
  END IF;

  IF v_display_name IS NULL OR length(v_display_name) > 120 OR v_display_name ~ '<[^>]*>' THEN
    RAISE EXCEPTION 'Invalid category display name' USING ERRCODE = '22023';
  END IF;

  IF v_description IS NOT NULL THEN
    RAISE EXCEPTION 'Price category description is not supported by the canonical schema'
      USING ERRCODE = '22023';
  END IF;

  IF p_price_coins < 0
     OR p_coin_value_in_cents < 0
     OR p_price_standalone < 0
     OR p_display_order < 0 THEN
    RAISE EXCEPTION 'Invalid category numeric value' USING ERRCODE = '22023';
  END IF;

  IF p_category_id IS NULL THEN
    INSERT INTO public.price_categories (
      name,
      display_name,
      price_coins,
      coin_value_in_cents,
      price_standalone,
      display_order,
      is_active
    )
    VALUES (
      v_name,
      v_display_name,
      p_price_coins,
      p_coin_value_in_cents,
      p_price_standalone,
      p_display_order,
      COALESCE(p_is_active, true)
    )
    RETURNING id INTO v_result_id;
  ELSE
    UPDATE public.price_categories
    SET
      name = v_name,
      display_name = v_display_name,
      price_coins = p_price_coins,
      coin_value_in_cents = p_coin_value_in_cents,
      price_standalone = p_price_standalone,
      display_order = p_display_order,
      is_active = COALESCE(p_is_active, true)
    WHERE id = p_category_id
    RETURNING id INTO v_result_id;
  END IF;

  IF v_result_id IS NULL THEN
    RAISE EXCEPTION 'Price category not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_upsert_price_category(
  uuid, text, text, text, integer, integer, integer, integer, boolean
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_upsert_price_category(
  uuid, text, text, text, integer, integer, integer, integer, boolean
) TO service_role;

COMMENT ON FUNCTION public.admin_upsert_price_category(
  uuid, text, text, text, integer, integer, integer, integer, boolean
) IS 'Admin-only price-category upsert aligned with the canonical price_categories schema. Description remains an input only for compatibility and is rejected when non-empty.';

/*
ROLLBACK AFTER APPLICATION
==========================
Execute the SQL below to restore the exact function body that was live before this
migration. This intentionally restores the previous behavior, including its reference
to the absent `description` column, because rollback means returning to the prior DB
state while the application release is rolled back as well.

CREATE OR REPLACE FUNCTION public.admin_upsert_price_category(
  p_category_id uuid DEFAULT NULL::uuid,
  p_name text DEFAULT NULL::text,
  p_display_name text DEFAULT NULL::text,
  p_description text DEFAULT NULL::text,
  p_price_coins integer DEFAULT 0,
  p_coin_value_in_cents integer DEFAULT 0,
  p_price_standalone integer DEFAULT 0,
  p_display_order integer DEFAULT 0,
  p_is_active boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_name text := NULLIF(btrim(COALESCE(p_name, '')), '');
  v_display_name text := NULLIF(btrim(COALESCE(p_display_name, '')), '');
  v_description text := NULLIF(btrim(COALESCE(p_description, '')), '');
  v_result_id uuid;
BEGIN
  PERFORM public.assert_admin_catalog_access();

  IF v_name IS NULL OR length(v_name) > 80 OR v_name ~ '<[^>]*>' THEN
    RAISE EXCEPTION 'Invalid category name' USING ERRCODE = '22023';
  END IF;

  IF v_display_name IS NULL OR length(v_display_name) > 120 OR v_display_name ~ '<[^>]*>' THEN
    RAISE EXCEPTION 'Invalid category display name' USING ERRCODE = '22023';
  END IF;

  IF v_description IS NOT NULL AND (length(v_description) > 500 OR v_description ~ '<[^>]*>') THEN
    RAISE EXCEPTION 'Invalid category description' USING ERRCODE = '22023';
  END IF;

  IF p_price_coins < 0 OR p_coin_value_in_cents < 0 OR p_price_standalone < 0 OR p_display_order < 0 THEN
    RAISE EXCEPTION 'Invalid category numeric value' USING ERRCODE = '22023';
  END IF;

  IF p_category_id IS NULL THEN
    INSERT INTO public.price_categories (
      name,
      display_name,
      description,
      price_coins,
      coin_value_in_cents,
      price_standalone,
      display_order,
      is_active
    )
    VALUES (
      v_name,
      v_display_name,
      v_description,
      p_price_coins,
      p_coin_value_in_cents,
      p_price_standalone,
      p_display_order,
      COALESCE(p_is_active, true)
    )
    RETURNING id INTO v_result_id;
  ELSE
    UPDATE public.price_categories
    SET
      name = v_name,
      display_name = v_display_name,
      description = v_description,
      price_coins = p_price_coins,
      coin_value_in_cents = p_coin_value_in_cents,
      price_standalone = p_price_standalone,
      display_order = p_display_order,
      is_active = COALESCE(p_is_active, true)
    WHERE id = p_category_id
    RETURNING id INTO v_result_id;
  END IF;

  IF v_result_id IS NULL THEN
    RAISE EXCEPTION 'Price category not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_upsert_price_category(
  uuid, text, text, text, integer, integer, integer, integer, boolean
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_upsert_price_category(
  uuid, text, text, text, integer, integer, integer, integer, boolean
) TO service_role;
*/
