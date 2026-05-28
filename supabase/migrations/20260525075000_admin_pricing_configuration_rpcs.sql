-- Admin pricing/configuration mutation RPCs.
-- Removes direct browser DML from pricing configuration surfaces.

ALTER TABLE public.collection_types
  ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'collection_types'
      AND column_name = 'display_order'
  ) THEN
    EXECUTE 'UPDATE public.collection_types SET sort_order = COALESCE(sort_order, display_order, 0)';
  ELSE
    UPDATE public.collection_types SET sort_order = COALESCE(sort_order, 0);
  END IF;
END;
$$;

ALTER TABLE public.collection_types
  ALTER COLUMN sort_order SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_collection_types_sort_order
  ON public.collection_types(sort_order);

CREATE TABLE IF NOT EXISTS public.purchase_modes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode_key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  price_multiplier numeric NOT NULL DEFAULT 1,
  collections_count integer NOT NULL DEFAULT 1,
  deliveries_total integer NOT NULL DEFAULT 1,
  includes_bonus boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT purchase_modes_mode_key_valid
    CHECK (mode_key IN ('standalone', 'trimestral', 'semestral', 'anual')),
  CONSTRAINT purchase_modes_multiplier_valid
    CHECK (price_multiplier >= 0.1 AND price_multiplier <= 2),
  CONSTRAINT purchase_modes_counts_valid
    CHECK (collections_count > 0 AND deliveries_total > 0),
  CONSTRAINT purchase_modes_display_order_valid
    CHECK (display_order >= 0)
);

ALTER TABLE public.purchase_modes
  ADD COLUMN IF NOT EXISTS mode_key text,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS price_multiplier numeric DEFAULT 1,
  ADD COLUMN IF NOT EXISTS collections_count integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS deliveries_total integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS includes_bonus boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE public.purchase_modes
SET price_multiplier = COALESCE(price_multiplier, 1),
    collections_count = COALESCE(collections_count, 1),
    deliveries_total = COALESCE(deliveries_total, 1),
    includes_bonus = COALESCE(includes_bonus, false),
    is_active = COALESCE(is_active, true),
    display_order = COALESCE(display_order, 0),
    created_at = COALESCE(created_at, now()),
    updated_at = COALESCE(updated_at, now());

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'purchase_modes_mode_key_valid'
      AND conrelid = 'public.purchase_modes'::regclass
  ) THEN
    ALTER TABLE public.purchase_modes
      ADD CONSTRAINT purchase_modes_mode_key_valid
      CHECK (mode_key IN ('standalone', 'trimestral', 'semestral', 'anual'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'purchase_modes_multiplier_valid'
      AND conrelid = 'public.purchase_modes'::regclass
  ) THEN
    ALTER TABLE public.purchase_modes
      ADD CONSTRAINT purchase_modes_multiplier_valid
      CHECK (price_multiplier >= 0.1 AND price_multiplier <= 2);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'purchase_modes_counts_valid'
      AND conrelid = 'public.purchase_modes'::regclass
  ) THEN
    ALTER TABLE public.purchase_modes
      ADD CONSTRAINT purchase_modes_counts_valid
      CHECK (collections_count > 0 AND deliveries_total > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'purchase_modes_display_order_valid'
      AND conrelid = 'public.purchase_modes'::regclass
  ) THEN
    ALTER TABLE public.purchase_modes
      ADD CONSTRAINT purchase_modes_display_order_valid
      CHECK (display_order >= 0);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_purchase_modes_active_order
  ON public.purchase_modes(is_active, display_order);

INSERT INTO public.purchase_modes (
  mode_key,
  name,
  description,
  price_multiplier,
  collections_count,
  deliveries_total,
  includes_bonus,
  is_active,
  display_order
)
SELECT
  v.mode_key,
  v.name,
  v.description,
  v.price_multiplier,
  v.collections_count,
  v.deliveries_total,
  v.includes_bonus,
  v.is_active,
  v.display_order
FROM (
  VALUES
  ('standalone', 'Avulso', 'Compra avulsa sem recorrencia', 1, 1, 1, false, true, 1),
  ('trimestral', 'Trimestral', 'Assinatura trimestral', 1, 3, 3, false, true, 2),
  ('semestral', 'Semestral', 'Assinatura semestral', 1, 6, 6, true, true, 3),
  ('anual', 'Anual', 'Assinatura anual', 1, 12, 12, true, true, 4)
) AS v(
  mode_key,
  name,
  description,
  price_multiplier,
  collections_count,
  deliveries_total,
  includes_bonus,
  is_active,
  display_order
)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.purchase_modes pm
  WHERE pm.mode_key = v.mode_key
);

CREATE TABLE IF NOT EXISTS public.purchase_mode_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode_key text NOT NULL,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_purchase_mode_history_mode_key
  ON public.purchase_mode_history(mode_key, changed_at DESC);

ALTER TABLE public.purchase_modes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_mode_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "purchase_modes_select_all" ON public.purchase_modes;
CREATE POLICY "purchase_modes_select_all"
  ON public.purchase_modes
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "purchase_modes_modify_admin" ON public.purchase_modes;
CREATE POLICY "purchase_modes_modify_admin"
  ON public.purchase_modes
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR COALESCE(auth.role(), '') = 'service_role')
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR COALESCE(auth.role(), '') = 'service_role');

DROP POLICY IF EXISTS "purchase_mode_history_select_admin" ON public.purchase_mode_history;
CREATE POLICY "purchase_mode_history_select_admin"
  ON public.purchase_mode_history
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR COALESCE(auth.role(), '') = 'service_role');

DO $$
BEGIN
  IF to_regclass('public.characters') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS price_multiplier numeric';
    EXECUTE 'ALTER TABLE public.characters DROP CONSTRAINT IF EXISTS characters_price_multiplier_valid';
    EXECUTE 'ALTER TABLE public.characters ADD CONSTRAINT characters_price_multiplier_valid CHECK (price_multiplier IS NULL OR (price_multiplier > 0 AND price_multiplier <= 10))';
  END IF;

  IF to_regclass('public.collection_characters') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.collection_characters ADD COLUMN IF NOT EXISTS price_multiplier numeric';
    EXECUTE 'ALTER TABLE public.collection_characters DROP CONSTRAINT IF EXISTS collection_characters_price_multiplier_valid';
    EXECUTE 'ALTER TABLE public.collection_characters ADD CONSTRAINT collection_characters_price_multiplier_valid CHECK (price_multiplier IS NULL OR (price_multiplier > 0 AND price_multiplier <= 10))';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_purchase_mode(
  p_mode_key text,
  p_updates jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_mode public.purchase_modes%ROWTYPE;
  v_new public.purchase_modes%ROWTYPE;
  v_key text := lower(btrim(COALESCE(p_mode_key, '')));
  v_field text;
  v_name text;
  v_description text;
  v_multiplier numeric;
  v_collections_count integer;
  v_deliveries_total integer;
  v_includes_bonus boolean;
  v_is_active boolean;
BEGIN
  PERFORM public.assert_admin_access();

  IF v_key NOT IN ('standalone', 'trimestral', 'semestral', 'anual') THEN
    RAISE EXCEPTION 'Invalid purchase mode' USING ERRCODE = '22023';
  END IF;

  IF p_updates IS NULL OR jsonb_typeof(p_updates) <> 'object' OR p_updates = '{}'::jsonb THEN
    RAISE EXCEPTION 'Purchase mode update payload must be a non-empty object' USING ERRCODE = '22023';
  END IF;

  FOR v_field IN SELECT jsonb_object_keys(p_updates)
  LOOP
    IF v_field NOT IN (
      'name',
      'description',
      'price_multiplier',
      'collections_count',
      'deliveries_total',
      'includes_bonus',
      'is_active'
    ) THEN
      RAISE EXCEPTION 'Unsupported purchase mode field: %', v_field USING ERRCODE = '22023';
    END IF;
  END LOOP;

  SELECT * INTO v_mode
  FROM public.purchase_modes
  WHERE mode_key = v_key;

  IF v_mode.id IS NULL THEN
    RAISE EXCEPTION 'Purchase mode not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_updates ? 'name' THEN
    v_name := public.admin_validate_collection_text(p_updates->>'name', 'Name', 100, true);
  END IF;

  IF p_updates ? 'description' THEN
    v_description := public.admin_validate_collection_text(p_updates->>'description', 'Description', 500, false);
  END IF;

  IF p_updates ? 'price_multiplier' THEN
    v_multiplier := (p_updates->>'price_multiplier')::numeric;
    IF v_multiplier < 0.1 OR v_multiplier > 2 THEN
      RAISE EXCEPTION 'Invalid purchase mode multiplier' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF p_updates ? 'collections_count' THEN
    v_collections_count := (p_updates->>'collections_count')::integer;
    IF v_collections_count < 1 OR v_collections_count > 10000 THEN
      RAISE EXCEPTION 'Invalid purchase mode collections count' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF p_updates ? 'deliveries_total' THEN
    v_deliveries_total := (p_updates->>'deliveries_total')::integer;
    IF v_deliveries_total < 1 OR v_deliveries_total > 10000 THEN
      RAISE EXCEPTION 'Invalid purchase mode deliveries total' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF p_updates ? 'includes_bonus' THEN
    v_includes_bonus := (p_updates->>'includes_bonus')::boolean;
  END IF;

  IF p_updates ? 'is_active' THEN
    v_is_active := (p_updates->>'is_active')::boolean;
  END IF;

  UPDATE public.purchase_modes
  SET name = CASE WHEN p_updates ? 'name' THEN v_name ELSE name END,
      description = CASE WHEN p_updates ? 'description' THEN v_description ELSE description END,
      price_multiplier = CASE WHEN p_updates ? 'price_multiplier' THEN v_multiplier ELSE price_multiplier END,
      collections_count = CASE WHEN p_updates ? 'collections_count' THEN v_collections_count ELSE collections_count END,
      deliveries_total = CASE WHEN p_updates ? 'deliveries_total' THEN v_deliveries_total ELSE deliveries_total END,
      includes_bonus = CASE WHEN p_updates ? 'includes_bonus' THEN v_includes_bonus ELSE includes_bonus END,
      is_active = CASE WHEN p_updates ? 'is_active' THEN v_is_active ELSE is_active END,
      updated_at = now()
  WHERE mode_key = v_key
  RETURNING * INTO v_new;

  IF p_updates ? 'price_multiplier' AND v_mode.price_multiplier IS DISTINCT FROM v_new.price_multiplier THEN
    INSERT INTO public.purchase_mode_history (
      mode_key,
      field_name,
      old_value,
      new_value,
      changed_by,
      metadata
    )
    VALUES (
      v_key,
      'price_multiplier',
      v_mode.price_multiplier::text,
      v_new.price_multiplier::text,
      auth.uid(),
      jsonb_build_object('source', 'admin_update_purchase_mode')
    );
  END IF;

  RETURN to_jsonb(v_new);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_save_collection_type(
  p_type_id uuid,
  p_data jsonb
)
RETURNS public.collection_types
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_allowed_keys text[] := ARRAY['name', 'display_name', 'description', 'sort_order', 'is_active'];
  v_key text;
  v_name text;
  v_display_name text;
  v_description text;
  v_sort_order integer;
  v_is_active boolean;
  v_result public.collection_types%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_data IS NULL OR jsonb_typeof(p_data) <> 'object' THEN
    RAISE EXCEPTION 'Collection type payload must be an object' USING ERRCODE = '22023';
  END IF;

  IF p_type_id IS NULL AND (
    NULLIF(btrim(COALESCE(p_data->>'name', '')), '') IS NULL
    OR NULLIF(btrim(COALESCE(p_data->>'display_name', '')), '') IS NULL
  ) THEN
    RAISE EXCEPTION 'Collection type name and display name are required' USING ERRCODE = '22023';
  END IF;

  FOR v_key IN SELECT jsonb_object_keys(p_data)
  LOOP
    IF NOT v_key = ANY(v_allowed_keys) THEN
      RAISE EXCEPTION 'Unsupported collection type field: %', v_key USING ERRCODE = '22023';
    END IF;
  END LOOP;

  IF p_data ? 'name' THEN
    v_name := lower(public.admin_validate_collection_text(p_data->>'name', 'Name', 80, true));
    IF v_name !~ '^[a-z0-9][a-z0-9_-]{1,79}$' THEN
      RAISE EXCEPTION 'Invalid collection type name' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF p_data ? 'display_name' THEN
    v_display_name := public.admin_validate_collection_text(p_data->>'display_name', 'Display name', 120, true);
  END IF;

  IF p_data ? 'description' THEN
    v_description := public.admin_validate_collection_text(p_data->>'description', 'Description', 500, false);
  END IF;

  IF p_data ? 'sort_order' THEN
    v_sort_order := (p_data->>'sort_order')::integer;
    IF v_sort_order < 0 OR v_sort_order > 10000 THEN
      RAISE EXCEPTION 'Invalid collection type sort order' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF p_data ? 'is_active' THEN
    v_is_active := (p_data->>'is_active')::boolean;
  END IF;

  IF p_type_id IS NULL THEN
    INSERT INTO public.collection_types (
      name,
      display_name,
      description,
      sort_order,
      is_active
    )
    VALUES (
      v_name,
      v_display_name,
      v_description,
      COALESCE(v_sort_order, 0),
      COALESCE(v_is_active, true)
    )
    RETURNING * INTO v_result;
  ELSE
    UPDATE public.collection_types
    SET name = CASE WHEN p_data ? 'name' THEN v_name ELSE name END,
        display_name = CASE WHEN p_data ? 'display_name' THEN v_display_name ELSE display_name END,
        description = CASE WHEN p_data ? 'description' THEN v_description ELSE description END,
        sort_order = CASE WHEN p_data ? 'sort_order' THEN v_sort_order ELSE sort_order END,
        is_active = CASE WHEN p_data ? 'is_active' THEN v_is_active ELSE is_active END,
        updated_at = now()
    WHERE id = p_type_id
    RETURNING * INTO v_result;

    IF v_result.id IS NULL THEN
      RAISE EXCEPTION 'Collection type not found' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_collection_type(p_type_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result_id uuid;
BEGIN
  PERFORM public.assert_admin_access();

  DELETE FROM public.collection_types
  WHERE id = p_type_id
  RETURNING id INTO v_result_id;

  IF v_result_id IS NULL THEN
    RAISE EXCEPTION 'Collection type not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_assign_collection_to_tier(
  p_collection_id uuid,
  p_tier_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.assert_admin_access();

  IF NOT EXISTS (SELECT 1 FROM public.collections WHERE id = p_collection_id) THEN
    RAISE EXCEPTION 'Collection not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.pricing_tiers WHERE id = p_tier_id) THEN
    RAISE EXCEPTION 'Pricing tier not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.collection_tier_assignments (collection_id, tier_id)
  VALUES (p_collection_id, p_tier_id)
  ON CONFLICT (collection_id) DO UPDATE
    SET tier_id = EXCLUDED.tier_id;

  RETURN p_collection_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_unassign_collection_from_tier(p_collection_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result_id uuid;
BEGIN
  PERFORM public.assert_admin_access();

  DELETE FROM public.collection_tier_assignments
  WHERE collection_id = p_collection_id
  RETURNING collection_id INTO v_result_id;

  IF v_result_id IS NULL THEN
    RAISE EXCEPTION 'Collection tier assignment not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_bulk_assign_collections_to_tier(
  p_tier_id uuid,
  p_collection_ids jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item jsonb;
  v_collection_id uuid;
  v_collection_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  PERFORM public.assert_admin_access();

  IF NOT EXISTS (SELECT 1 FROM public.pricing_tiers WHERE id = p_tier_id) THEN
    RAISE EXCEPTION 'Pricing tier not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_collection_ids IS NULL OR jsonb_typeof(p_collection_ids) <> 'array' THEN
    RAISE EXCEPTION 'Collection IDs payload must be an array' USING ERRCODE = '22023';
  END IF;

  IF jsonb_array_length(p_collection_ids) < 1 OR jsonb_array_length(p_collection_ids) > 100 THEN
    RAISE EXCEPTION 'Invalid collection IDs count' USING ERRCODE = '22023';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_collection_ids)
  LOOP
    v_collection_id := (v_item #>> '{}')::uuid;

    IF NOT EXISTS (SELECT 1 FROM public.collections WHERE id = v_collection_id) THEN
      RAISE EXCEPTION 'Collection not found' USING ERRCODE = 'P0002';
    END IF;

    v_collection_ids := array_append(v_collection_ids, v_collection_id);
  END LOOP;

  DELETE FROM public.collection_tier_assignments
  WHERE collection_id = ANY(v_collection_ids);

  INSERT INTO public.collection_tier_assignments (collection_id, tier_id)
  SELECT unnest(v_collection_ids), p_tier_id;

  RETURN jsonb_build_object(
    'ok', true,
    'success', to_jsonb(v_collection_ids),
    'failed', '[]'::jsonb
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_character_multiplier_table()
RETURNS regclass
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  IF to_regclass('public.characters') IS NOT NULL THEN
    RETURN 'public.characters'::regclass;
  END IF;

  IF to_regclass('public.collection_characters') IS NOT NULL THEN
    RETURN 'public.collection_characters'::regclass;
  END IF;

  RAISE EXCEPTION 'Character table not found' USING ERRCODE = '42P01';
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_character_price_multiplier(
  p_character_id uuid,
  p_new_multiplier numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_table regclass := public.admin_character_multiplier_table();
  v_result jsonb;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_new_multiplier IS NOT NULL AND (p_new_multiplier <= 0 OR p_new_multiplier > 10) THEN
    RAISE EXCEPTION 'Invalid character price multiplier' USING ERRCODE = '22023';
  END IF;

  EXECUTE format(
    'UPDATE %s AS t SET price_multiplier = $1, updated_at = now() WHERE id = $2 RETURNING to_jsonb(t.*)',
    v_table
  )
  INTO v_result
  USING p_new_multiplier, p_character_id;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Character not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_bulk_update_character_price_multipliers(
  p_character_ids jsonb,
  p_new_multiplier numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_table regclass := public.admin_character_multiplier_table();
  v_item jsonb;
  v_character_id uuid;
  v_character_ids uuid[] := ARRAY[]::uuid[];
  v_count integer := 0;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_new_multiplier IS NOT NULL AND (p_new_multiplier <= 0 OR p_new_multiplier > 10) THEN
    RAISE EXCEPTION 'Invalid character price multiplier' USING ERRCODE = '22023';
  END IF;

  IF p_character_ids IS NULL OR jsonb_typeof(p_character_ids) <> 'array' THEN
    RAISE EXCEPTION 'Character IDs payload must be an array' USING ERRCODE = '22023';
  END IF;

  IF jsonb_array_length(p_character_ids) < 1 OR jsonb_array_length(p_character_ids) > 200 THEN
    RAISE EXCEPTION 'Invalid character IDs count' USING ERRCODE = '22023';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_character_ids)
  LOOP
    v_character_id := (v_item #>> '{}')::uuid;
    v_character_ids := array_append(v_character_ids, v_character_id);
  END LOOP;

  EXECUTE format(
    'UPDATE %s AS t SET price_multiplier = $1, updated_at = now() WHERE id = ANY($2)',
    v_table
  )
  USING p_new_multiplier, v_character_ids;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count <> array_length(v_character_ids, 1) THEN
    RAISE EXCEPTION 'One or more characters were not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object('updated', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_purchase_mode(text, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_save_collection_type(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_collection_type(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_assign_collection_to_tier(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_unassign_collection_from_tier(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_bulk_assign_collections_to_tier(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_character_multiplier_table() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_character_price_multiplier(uuid, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_bulk_update_character_price_multipliers(jsonb, numeric) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_update_purchase_mode(text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_save_collection_type(uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_collection_type(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_assign_collection_to_tier(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_unassign_collection_from_tier(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_bulk_assign_collections_to_tier(uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_character_price_multiplier(uuid, numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_bulk_update_character_price_multipliers(jsonb, numeric) TO authenticated, service_role;

GRANT SELECT ON TABLE public.purchase_modes TO anon, authenticated;
GRANT SELECT ON TABLE public.purchase_mode_history TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.purchase_modes FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.purchase_mode_history FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.collection_types FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.collection_tier_assignments FROM anon, authenticated;

DO $$
BEGIN
  IF to_regclass('public.characters') IS NOT NULL THEN
    EXECUTE 'REVOKE INSERT, UPDATE, DELETE ON TABLE public.characters FROM anon, authenticated';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.admin_update_purchase_mode(text, jsonb) IS
  'Admin-only validated purchase mode update.';
COMMENT ON FUNCTION public.admin_save_collection_type(uuid, jsonb) IS
  'Admin-only validated collection type create/update.';
COMMENT ON FUNCTION public.admin_delete_collection_type(uuid) IS
  'Admin-only validated collection type deletion.';
COMMENT ON FUNCTION public.admin_assign_collection_to_tier(uuid, uuid) IS
  'Admin-only validated single collection tier assignment.';
COMMENT ON FUNCTION public.admin_unassign_collection_from_tier(uuid) IS
  'Admin-only validated single collection tier removal.';
COMMENT ON FUNCTION public.admin_bulk_assign_collections_to_tier(uuid, jsonb) IS
  'Admin-only atomic bulk collection tier assignment.';
COMMENT ON FUNCTION public.admin_update_character_price_multiplier(uuid, numeric) IS
  'Admin-only validated character price multiplier update.';
COMMENT ON FUNCTION public.admin_bulk_update_character_price_multipliers(jsonb, numeric) IS
  'Admin-only validated bulk character price multiplier update.';

NOTIFY pgrst, 'reload schema';
