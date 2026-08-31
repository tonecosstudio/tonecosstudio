BEGIN;

-- Delivery scheduling must use persisted subscription/plan configuration.
-- The legacy p_plan_type argument is retained only for API compatibility and
-- may not override the plan attached to the subscription.
CREATE OR REPLACE FUNCTION public.admin_schedule_subscription_deliveries(
  p_subscription_id uuid,
  p_plan_type text,
  p_entry_cycle_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_requested_plan_type text := lower(NULLIF(btrim(COALESCE(p_plan_type, '')), ''));
  v_subscription record;
  v_entry_cycle public.cycles%ROWTYPE;
  v_existing_count integer;
  v_delivery_count integer;
  v_plan_type text;
  v_current_month integer;
  v_current_year integer;
  v_cycle_json jsonb;
  v_cycle_id uuid;
  v_shipping_date date;
  v_delivery public.subscription_deliveries%ROWTYPE;
  v_deliveries jsonb := '[]'::jsonb;
  v_bonus public.bonus_pieces%ROWTYPE;
  v_sixth_delivery_id uuid;
  i integer;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_subscription_id IS NULL OR p_entry_cycle_id IS NULL THEN
    RAISE EXCEPTION 'SUBSCRIPTION_AND_ENTRY_CYCLE_REQUIRED' USING ERRCODE = '22023';
  END IF;

  SELECT
    s.id,
    s.plan_id,
    s.plan_type AS subscription_plan_type,
    s.deliveries_total AS subscription_deliveries_total,
    sp.plan_type AS configured_plan_type,
    sp.deliveries_total AS configured_deliveries_total
    INTO v_subscription
    FROM public.subscriptions s
    LEFT JOIN public.subscription_plans sp ON sp.id = s.plan_id
   WHERE s.id = p_subscription_id
   FOR UPDATE OF s;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUBSCRIPTION_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_subscription.plan_id IS NULL OR v_subscription.configured_plan_type IS NULL THEN
    RAISE EXCEPTION 'SUBSCRIPTION_PLAN_NOT_CONFIGURED' USING ERRCODE = '22023';
  END IF;

  v_plan_type := lower(NULLIF(btrim(v_subscription.configured_plan_type), ''));
  IF v_plan_type IS NULL THEN
    RAISE EXCEPTION 'SUBSCRIPTION_PLAN_TYPE_NOT_CONFIGURED' USING ERRCODE = '22023';
  END IF;

  IF v_subscription.subscription_plan_type IS NOT NULL
     AND lower(btrim(v_subscription.subscription_plan_type)) <> v_plan_type THEN
    RAISE EXCEPTION 'SUBSCRIPTION_PLAN_TYPE_DRIFT' USING ERRCODE = '22023';
  END IF;

  IF v_requested_plan_type IS NOT NULL AND v_requested_plan_type <> v_plan_type THEN
    RAISE EXCEPTION 'SUBSCRIPTION_PLAN_TYPE_MISMATCH' USING ERRCODE = '22023';
  END IF;

  v_delivery_count := COALESCE(
    NULLIF(v_subscription.subscription_deliveries_total, 0),
    NULLIF(v_subscription.configured_deliveries_total, 0)
  );

  IF v_delivery_count IS NULL OR v_delivery_count < 1 OR v_delivery_count > 24 THEN
    RAISE EXCEPTION 'SUBSCRIPTION_DELIVERIES_NOT_CONFIGURED' USING ERRCODE = '22023';
  END IF;

  IF v_subscription.subscription_deliveries_total IS NOT NULL
     AND v_subscription.subscription_deliveries_total > 0
     AND v_subscription.configured_deliveries_total IS NOT NULL
     AND v_subscription.configured_deliveries_total > 0
     AND v_subscription.subscription_deliveries_total <> v_subscription.configured_deliveries_total THEN
    RAISE EXCEPTION 'SUBSCRIPTION_DELIVERIES_DRIFT' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_entry_cycle
    FROM public.cycles
   WHERE id = p_entry_cycle_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ENTRY_CYCLE_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_entry_cycle.month IS NULL
     OR v_entry_cycle.month < 1
     OR v_entry_cycle.month > 12
     OR v_entry_cycle.year IS NULL
     OR v_entry_cycle.year < 2020
     OR v_entry_cycle.year > 2100 THEN
    RAISE EXCEPTION 'ENTRY_CYCLE_INVALID' USING ERRCODE = '22023';
  END IF;

  SELECT count(*)
    INTO v_existing_count
    FROM public.subscription_deliveries
   WHERE subscription_id = p_subscription_id;

  IF v_existing_count > 0 THEN
    RAISE EXCEPTION 'SUBSCRIPTION_DELIVERIES_ALREADY_EXIST' USING ERRCODE = '23505';
  END IF;

  v_current_month := v_entry_cycle.month;
  v_current_year := v_entry_cycle.year;

  FOR i IN 1..v_delivery_count LOOP
    v_current_month := v_current_month + 1;
    IF v_current_month > 12 THEN
      v_current_month := 1;
      v_current_year := v_current_year + 1;
    END IF;

    v_cycle_json := public.admin_get_or_create_delivery_cycle(
      1,
      v_current_month,
      v_current_year
    );

    IF v_cycle_json IS NULL OR NULLIF(v_cycle_json->>'id', '') IS NULL THEN
      RAISE EXCEPTION 'DELIVERY_CYCLE_NOT_AVAILABLE' USING ERRCODE = '55000';
    END IF;

    v_cycle_id := (v_cycle_json->>'id')::uuid;
    v_shipping_date := NULLIF(v_cycle_json->>'shipping_date', '')::date;

    IF v_shipping_date IS NULL THEN
      RAISE EXCEPTION 'DELIVERY_CYCLE_SHIPPING_DATE_NOT_CONFIGURED' USING ERRCODE = '22023';
    END IF;

    PERFORM public.reserve_capacity(v_cycle_id, 1);

    INSERT INTO public.subscription_deliveries (
      subscription_id,
      cycle_id,
      delivery_number,
      delivery_order,
      status,
      delivery_date,
      expected_delivery_date,
      auto_maintained
    )
    VALUES (
      p_subscription_id,
      v_cycle_id,
      i,
      i,
      'scheduled'::public.purchase_status,
      v_shipping_date,
      v_shipping_date::timestamptz,
      false
    )
    RETURNING * INTO v_delivery;

    v_deliveries := v_deliveries || jsonb_build_array(to_jsonb(v_delivery));
    IF i = 6 THEN
      v_sixth_delivery_id := v_delivery.id;
    END IF;
  END LOOP;

  -- Preserve the existing Semestral bonus rule, but derive eligibility from
  -- the persisted plan instead of the caller-provided plan type.
  IF v_plan_type = 'semestral' AND v_sixth_delivery_id IS NOT NULL THEN
    INSERT INTO public.bonus_pieces (
      subscription_id,
      delivery_id,
      description,
      status
    )
    VALUES (
      p_subscription_id,
      v_sixth_delivery_id,
      'Exclusive bonus piece for Semestral plan',
      'pending'
    )
    RETURNING * INTO v_bonus;

    UPDATE public.subscription_deliveries
       SET bonus_piece_id = v_bonus.id,
           updated_at = now()
     WHERE id = v_sixth_delivery_id;
  END IF;

  RETURN jsonb_build_object(
    'deliveries', v_deliveries,
    'bonusPiece', CASE WHEN v_bonus.id IS NULL THEN NULL ELSE to_jsonb(v_bonus) END
  );
END;
$$;

COMMENT ON FUNCTION public.admin_schedule_subscription_deliveries(uuid, text, uuid) IS
  'Admin-only subscription delivery scheduler. Delivery count and plan type are derived from persisted subscription/plan SSOT; missing cycle shipping dates fail closed.';

NOTIFY pgrst, 'reload schema';

COMMIT;
