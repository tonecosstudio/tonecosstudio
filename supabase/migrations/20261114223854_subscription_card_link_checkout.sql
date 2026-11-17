-- Restore the existing manual card-link option alongside PIX for curated plans.
-- Both paths keep the same private proof upload and admin review before activation.
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
  IF v_payment_method NOT IN ('pix', 'credit_card') THEN
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

  v_amount := CASE v_payment_method
    WHEN 'pix' THEN COALESCE(v_plan.price_pix, 0)::numeric
    WHEN 'credit_card' THEN COALESCE(v_plan.price_full, 0)::numeric
  END;
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
    v_subscription.id, 'one_time', v_payment_status, v_payment_method, v_notes
  )
  RETURNING * INTO v_payment;

  UPDATE public.subscriptions
     SET payment_id = v_payment.id::text, updated_at = now()
   WHERE id = v_subscription.id
   RETURNING * INTO v_subscription;

  RETURN jsonb_build_object('subscription', to_jsonb(v_subscription), 'payment', to_jsonb(v_payment));
END;
$$;

COMMENT ON FUNCTION private_api.create_subscription_checkout_for_current_user(uuid, uuid, text[], text, text) IS
  'Creates one pending PIX or card-link subscription only when the exact plan count of curated canonical models is selected; payment evidence stays in private Storage and activation requires admin review.';

NOTIFY pgrst, 'reload schema';
