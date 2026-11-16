-- Curated subscription selections use the canonical catalog's public slugs.
-- Collection, plan, subscription, and payment records stay in their existing
-- authority tables; this migration adds no catalog copy or parallel ledger.

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS catalog_model_slugs text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS model_selection_limit integer;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS selected_model_slugs text[] NOT NULL DEFAULT '{}'::text[];

-- Seed editable payment settings without overwriting any configured PIX key or link.
INSERT INTO public.system_settings (key, value, description, updated_at)
VALUES
  ('pix_key_onetime', '', 'Chave PIX para compra avulsa', now()),
  ('payment_link_onetime', '', 'Link de pagamento para compra avulsa', now()),
  ('pix_key_voucher', '', 'Chave PIX para voucher de entrada', now()),
  ('payment_link_voucher', '', 'Link de pagamento para voucher de entrada', now()),
  ('pix_key_subscription_bimonthly', '', 'Chave PIX para assinatura bimestral', now()),
  ('payment_link_subscription_bimonthly', '', 'Link para assinatura bimestral', now()),
  ('pix_key_subscription_quarterly', '', 'Chave PIX para assinatura trimestral', now()),
  ('payment_link_subscription_quarterly', '', 'Link para assinatura trimestral', now()),
  ('pix_key_subscription_semiannual', '', 'Chave PIX para assinatura semestral', now()),
  ('payment_link_subscription_semiannual', '', 'Link para assinatura semestral', now()),
  ('pix_key_subscription_annual', '', 'Chave PIX para assinatura anual', now()),
  ('payment_link_subscription_annual', '', 'Link para assinatura anual', now())
ON CONFLICT (key) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'subscription_plans_model_selection_limit_valid'
       AND conrelid = 'public.subscription_plans'::regclass
  ) THEN
    ALTER TABLE public.subscription_plans
      ADD CONSTRAINT subscription_plans_model_selection_limit_valid
      CHECK (model_selection_limit IS NULL OR model_selection_limit IN (6, 12));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'collections_catalog_model_slugs_valid'
       AND conrelid = 'public.collections'::regclass
  ) THEN
    ALTER TABLE public.collections
      ADD CONSTRAINT collections_catalog_model_slugs_valid
      CHECK (
        cardinality(catalog_model_slugs) <= 20
        AND array_position(catalog_model_slugs, NULL) IS NULL
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'subscriptions_selected_model_slugs_valid'
       AND conrelid = 'public.subscriptions'::regclass
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_selected_model_slugs_valid
      CHECK (
        cardinality(selected_model_slugs) <= 12
        AND array_position(selected_model_slugs, NULL) IS NULL
      );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.admin_save_subscription_plan_configuration(
  p_plan_id uuid,
  p_data jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_allowed_keys text[] := ARRAY[
    'name', 'description', 'billing_interval', 'plan_type', 'slug',
    'price', 'price_full', 'price_pix', 'coins_included',
    'deliveries_per_cycle', 'deliveries_total', 'is_active',
    'model_selection_limit'
  ];
  v_allowed_plan_types text[] := ARRAY['avulso', 'bimestral', 'trimestral', 'semestral', 'anual'];
  v_key text;
  v_value jsonb;
  v_text text;
  v_assignments text[] := ARRAY[]::text[];
  v_columns text[] := ARRAY[]::text[];
  v_values text[] := ARRAY[]::text[];
  v_result_id uuid;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT (SELECT private_api.is_current_admin()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  IF p_data IS NULL OR jsonb_typeof(p_data) <> 'object' THEN
    RAISE EXCEPTION 'Subscription plan payload must be an object' USING ERRCODE = '22023';
  END IF;
  IF p_plan_id IS NULL AND NULLIF(btrim(COALESCE(p_data->>'name', '')), '') IS NULL THEN
    RAISE EXCEPTION 'Subscription plan name is required' USING ERRCODE = '22023';
  END IF;
  IF p_plan_id IS NULL AND NULLIF(btrim(COALESCE(p_data->>'plan_type', '')), '') IS NULL THEN
    RAISE EXCEPTION 'Subscription plan type is required' USING ERRCODE = '22023';
  END IF;

  FOR v_key IN SELECT jsonb_object_keys(p_data) LOOP
    IF NOT v_key = ANY(v_allowed_keys) THEN
      RAISE EXCEPTION 'Unsupported subscription plan field: %', v_key USING ERRCODE = '22023';
    END IF;
  END LOOP;

  FOR v_key, v_value IN SELECT key, value FROM jsonb_each(p_data) LOOP
    v_text := NULLIF(btrim(COALESCE(v_value #>> '{}', '')), '');

    IF v_key IN ('name', 'slug') THEN
      v_text := public.admin_validate_setting_value(v_text, 120);
    ELSIF v_key = 'description' THEN
      IF v_text IS NOT NULL AND (length(v_text) > 500 OR v_text ~ '[[:cntrl:]<>]') THEN
        RAISE EXCEPTION 'Invalid subscription plan description' USING ERRCODE = '22023';
      END IF;
    ELSIF v_key IN ('billing_interval', 'plan_type') THEN
      IF v_text IS NULL OR NOT v_text = ANY(v_allowed_plan_types) THEN
        RAISE EXCEPTION 'Invalid subscription plan type' USING ERRCODE = '22023';
      END IF;
    ELSIF v_key IN ('price', 'price_full', 'price_pix') THEN
      IF v_text IS NULL OR v_text !~ '^[0-9]+(\.[0-9]+)?$' OR v_text::numeric < 0 OR v_text::numeric > 1000000 THEN
        RAISE EXCEPTION 'Invalid subscription plan price' USING ERRCODE = '22023';
      END IF;
    ELSIF v_key IN ('coins_included', 'deliveries_per_cycle', 'deliveries_total') THEN
      IF v_text IS NULL OR v_text !~ '^[0-9]+$' OR v_text::integer < 0 OR v_text::integer > 10000000 THEN
        RAISE EXCEPTION 'Invalid subscription plan quantity' USING ERRCODE = '22023';
      END IF;
    ELSIF v_key = 'model_selection_limit' THEN
      IF v_text IS NOT NULL AND v_text NOT IN ('6', '12') THEN
        RAISE EXCEPTION 'Model selection limit must be 6 or 12' USING ERRCODE = '22023';
      END IF;
    ELSIF v_key = 'is_active' THEN
      IF v_text NOT IN ('true', 'false') THEN
        RAISE EXCEPTION 'Invalid subscription plan active flag' USING ERRCODE = '22023';
      END IF;
    END IF;

    IF v_text IS NULL THEN
      v_assignments := array_append(v_assignments, format('%I = NULL', v_key));
      v_columns := array_append(v_columns, format('%I', v_key));
      v_values := array_append(v_values, 'NULL');
    ELSIF v_key IN ('price', 'price_full', 'price_pix', 'coins_included', 'deliveries_per_cycle', 'deliveries_total', 'model_selection_limit') THEN
      v_assignments := array_append(v_assignments, format('%I = %s', v_key, v_text));
      v_columns := array_append(v_columns, format('%I', v_key));
      v_values := array_append(v_values, v_text);
    ELSIF v_key = 'is_active' THEN
      v_assignments := array_append(v_assignments, format('%I = %L', v_key, v_text::boolean));
      v_columns := array_append(v_columns, format('%I', v_key));
      v_values := array_append(v_values, quote_literal(v_text::boolean));
    ELSE
      v_assignments := array_append(v_assignments, format('%I = %L', v_key, v_text));
      v_columns := array_append(v_columns, format('%I', v_key));
      v_values := array_append(v_values, quote_literal(v_text));
    END IF;
  END LOOP;

  v_assignments := array_append(v_assignments, 'updated_at = now()');
  IF p_plan_id IS NOT NULL THEN
    EXECUTE format(
      'UPDATE public.subscription_plans SET %s WHERE id = %L RETURNING id',
      array_to_string(v_assignments, ', '), p_plan_id
    ) INTO v_result_id;
  ELSE
    EXECUTE format(
      'INSERT INTO public.subscription_plans (%s) VALUES (%s) RETURNING id',
      array_to_string(v_columns, ', '), array_to_string(v_values, ', ')
    ) INTO v_result_id;
  END IF;
  IF v_result_id IS NULL THEN
    RAISE EXCEPTION 'Subscription plan not found' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_result_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_subscription_collection_models(
  p_collection_id uuid,
  p_model_slugs text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_slugs text[] := COALESCE(p_model_slugs, '{}'::text[]);
  v_count integer;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT (SELECT private_api.is_current_admin()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_collection_id IS NULL THEN
    RAISE EXCEPTION 'Collection is required' USING ERRCODE = '22023';
  END IF;
  IF cardinality(v_slugs) > 20 THEN
    RAISE EXCEPTION 'A collection can curate at most 20 catalog models' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(v_slugs) AS item(slug)
     WHERE slug IS NULL OR slug !~ '^[a-z0-9][a-z0-9-]{0,239}$'
  ) THEN
    RAISE EXCEPTION 'Invalid catalog model slug' USING ERRCODE = '22023';
  END IF;
  SELECT count(*) INTO v_count FROM (SELECT DISTINCT slug FROM unnest(v_slugs) AS item(slug)) unique_slugs;
  IF v_count <> cardinality(v_slugs) THEN
    RAISE EXCEPTION 'Duplicate catalog model slug' USING ERRCODE = '22023';
  END IF;

  UPDATE public.collections
     SET catalog_model_slugs = v_slugs,
         updated_at = now()
   WHERE id = p_collection_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Collection not found' USING ERRCODE = 'P0002';
  END IF;
  RETURN jsonb_build_object('id', p_collection_id, 'catalog_model_slugs', to_jsonb(v_slugs), 'count', cardinality(v_slugs));
END;
$$;

-- Keep the established private RPC boundary and its private-storage voucher path.
CREATE OR REPLACE FUNCTION private_api.create_subscription_checkout_for_current_user(
  p_plan_id uuid,
  p_collection_id uuid,
  p_selected_model_slugs text[],
  p_payment_method text,
  p_payment_voucher_url text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_payment_method text := lower(NULLIF(btrim(COALESCE(p_payment_method, '')), ''));
  v_voucher_path text := NULLIF(btrim(COALESCE(p_payment_voucher_url, '')), '');
  v_selected text[] := COALESCE(p_selected_model_slugs, '{}'::text[]);
  v_plan record;
  v_collection record;
  v_amount numeric;
  v_payment_status text;
  v_notes text;
  v_reference text;
  v_subscription public.subscriptions%ROWTYPE;
  v_payment public.manual_payments%ROWTYPE;
  v_distinct_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;
  IF p_plan_id IS NULL THEN
    RAISE EXCEPTION 'SUBSCRIPTION_PLAN_REQUIRED' USING ERRCODE = '22023';
  END IF;
  IF p_collection_id IS NULL THEN
    RAISE EXCEPTION 'SUBSCRIPTION_COLLECTION_REQUIRED' USING ERRCODE = '22023';
  END IF;
  IF v_payment_method <> 'pix' THEN
    RAISE EXCEPTION 'INVALID_SUBSCRIPTION_PAYMENT_METHOD' USING ERRCODE = '22023';
  END IF;
  IF v_voucher_path IS NULL OR length(v_voucher_path) > 512 OR v_voucher_path !~
    '^subscriptions/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9]{10,16}-[0-9a-f]{16}\.(jpg|jpeg|png|pdf)$'
    OR split_part(v_voucher_path, '/', 2) <> v_user_id::text THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_VOUCHER_PATH' USING ERRCODE = '22023';
  END IF;

  SELECT id, name, description, plan_type, price_pix, price_full, deliveries_total,
         model_selection_limit, is_active
    INTO v_plan
    FROM public.subscription_plans
   WHERE id = p_plan_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUBSCRIPTION_PLAN_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF v_plan.model_selection_limit IS NULL OR v_plan.model_selection_limit NOT IN (6, 12) THEN
    RAISE EXCEPTION 'SUBSCRIPTION_MODEL_LIMIT_NOT_CONFIGURED' USING ERRCODE = '22023';
  END IF;

  SELECT id, catalog_model_slugs
    INTO v_collection
    FROM public.collections
   WHERE id = p_collection_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUBSCRIPTION_COLLECTION_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF p_selected_model_slugs IS NULL OR cardinality(v_selected) <> v_plan.model_selection_limit THEN
    RAISE EXCEPTION 'SUBSCRIPTION_MODEL_SELECTION_COUNT_INVALID' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(v_selected) AS item(slug)
     WHERE slug IS NULL OR slug !~ '^[a-z0-9][a-z0-9-]{0,239}$'
  ) THEN
    RAISE EXCEPTION 'SUBSCRIPTION_MODEL_SELECTION_INVALID' USING ERRCODE = '22023';
  END IF;
  SELECT count(*) INTO v_distinct_count FROM (SELECT DISTINCT slug FROM unnest(v_selected) AS item(slug)) unique_slugs;
  IF v_distinct_count <> cardinality(v_selected) THEN
    RAISE EXCEPTION 'SUBSCRIPTION_MODEL_SELECTION_DUPLICATE' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(v_selected) AS selected(slug)
     WHERE NOT (selected.slug = ANY(v_collection.catalog_model_slugs))
  ) THEN
    RAISE EXCEPTION 'SUBSCRIPTION_MODEL_NOT_IN_COLLECTION' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.subscriptions
     WHERE user_id = v_user_id
       AND collection_id = p_collection_id
       AND status::text IN ('active', 'pending_payment')
  ) THEN
    RAISE EXCEPTION 'SUBSCRIPTION_CHECKOUT_EXISTS' USING ERRCODE = '22023';
  END IF;

  v_amount := COALESCE(v_plan.price_pix, 0)::numeric;
  IF v_amount <= 0 THEN
    RAISE EXCEPTION 'SUBSCRIPTION_PRICE_NOT_CONFIGURED' USING ERRCODE = '22023';
  END IF;
  v_payment_status := 'under_review';
  v_notes := 'Comprovante armazenado em Storage privado';
  v_reference := public.generate_payment_reference();

  INSERT INTO public.subscriptions (
    user_id, plan_id, plan_type, status, payment_status, collection_id,
    payment_method, total_paid, deliveries_total, notes, payment_voucher_path,
    payment_voucher_url, selected_model_slugs
  )
  VALUES (
    v_user_id, v_plan.id, v_plan.plan_type, 'pending_payment', 'pending', v_collection.id,
    v_payment_method, v_amount, COALESCE(v_plan.deliveries_total, 0), v_notes,
    v_voucher_path, NULL, v_selected
  )
  RETURNING * INTO v_subscription;

  INSERT INTO public.manual_payments (
    reference_number, user_id, amount, currency, reference_type, reference_id,
    subscription_id, payment_type, status, payment_method, notes
  )
  VALUES (
    v_reference, v_user_id, v_amount, 'BRL', 'subscription', v_subscription.id::text,
    v_subscription.id, 'recurring', v_payment_status, v_payment_method, v_notes
  )
  RETURNING * INTO v_payment;

  UPDATE public.subscriptions
     SET payment_id = v_payment.id::text, updated_at = now()
   WHERE id = v_subscription.id
   RETURNING * INTO v_subscription;

  RETURN jsonb_build_object('subscription', to_jsonb(v_subscription), 'payment', to_jsonb(v_payment));
END;
$$;

REVOKE ALL ON FUNCTION private_api.create_subscription_checkout_for_current_user(uuid, uuid, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private_api.create_subscription_checkout_for_current_user(uuid, uuid, text[], text, text)
  FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private_api TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private_api.create_subscription_checkout_for_current_user(uuid, uuid, text[], text, text)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.create_subscription_checkout_for_current_user(
  p_plan_id uuid,
  p_collection_id uuid,
  p_payment_method text,
  p_payment_voucher_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'SUBSCRIPTION_MODEL_SELECTION_REQUIRED' USING ERRCODE = '22023';
END;
$$;

CREATE OR REPLACE FUNCTION public.create_subscription_checkout_for_current_user(
  p_plan_id uuid,
  p_collection_id uuid,
  p_selected_model_slugs text[],
  p_payment_method text,
  p_payment_voucher_url text
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $function$
  SELECT private_api.create_subscription_checkout_for_current_user(
    p_plan_id,
    p_collection_id,
    p_selected_model_slugs,
    p_payment_method,
    p_payment_voucher_url
  );
$function$;

REVOKE ALL ON FUNCTION public.admin_save_subscription_plan_configuration(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_subscription_plan_configuration(uuid, jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.admin_set_subscription_collection_models(uuid, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_subscription_collection_models(uuid, text[]) TO service_role;
REVOKE ALL ON FUNCTION public.create_subscription_checkout_for_current_user(uuid, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_subscription_checkout_for_current_user(uuid, uuid, text, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.create_subscription_checkout_for_current_user(uuid, uuid, text[], text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_subscription_checkout_for_current_user(uuid, uuid, text[], text, text) TO authenticated, service_role;

COMMENT ON COLUMN public.collections.catalog_model_slugs IS
  'Ordered references to public model slugs in the canonical D1 catalog; no catalog attributes are copied here.';
COMMENT ON COLUMN public.subscription_plans.model_selection_limit IS
  'Number of canonical catalog models selected for a subscription: 6 or 12.';
COMMENT ON COLUMN public.subscriptions.selected_model_slugs IS
  'Customer selections from the collection curated slugs, saved at checkout.';
COMMENT ON FUNCTION public.admin_set_subscription_collection_models(uuid, text[]) IS
  'Admin-only curator for canonical catalog model slugs on an existing collection.';
COMMENT ON FUNCTION private_api.create_subscription_checkout_for_current_user(uuid, uuid, text[], text, text) IS
  'Creates one pending PIX subscription only when the exact plan count of curated canonical models is selected; payment evidence stays in private Storage.';

NOTIFY pgrst, 'reload schema';
