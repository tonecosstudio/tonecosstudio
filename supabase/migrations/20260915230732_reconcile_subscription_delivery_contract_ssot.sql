BEGIN;

UPDATE public.subscription_plans
   SET deliveries_total = CASE lower(btrim(plan_type))
         WHEN 'avulso' THEN 1
         WHEN 'mensal' THEN 1
         WHEN 'bimestral' THEN 2
         WHEN 'trimestral' THEN 3
         WHEN 'semestral' THEN 6
         WHEN 'anual' THEN 12
       END,
       updated_at = now()
 WHERE plan_type IS NOT NULL
   AND lower(btrim(plan_type)) IN ('avulso', 'mensal', 'bimestral', 'trimestral', 'semestral', 'anual')
   AND deliveries_total IS DISTINCT FROM CASE lower(btrim(plan_type))
         WHEN 'avulso' THEN 1
         WHEN 'mensal' THEN 1
         WHEN 'bimestral' THEN 2
         WHEN 'trimestral' THEN 3
         WHEN 'semestral' THEN 6
         WHEN 'anual' THEN 12
       END;

ALTER TABLE public.subscription_plans
  ALTER COLUMN deliveries_total DROP DEFAULT;

CREATE OR REPLACE FUNCTION private_api.enforce_subscription_plan_delivery_contract()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_plan_type text := lower(NULLIF(btrim(COALESCE(NEW.plan_type, '')), ''));
  v_expected_deliveries integer;
BEGIN
  v_expected_deliveries := CASE v_plan_type
    WHEN 'avulso' THEN 1
    WHEN 'mensal' THEN 1
    WHEN 'bimestral' THEN 2
    WHEN 'trimestral' THEN 3
    WHEN 'semestral' THEN 6
    WHEN 'anual' THEN 12
    ELSE NULL
  END;

  IF v_expected_deliveries IS NULL THEN
    RAISE EXCEPTION 'INVALID_SUBSCRIPTION_PLAN_TYPE' USING ERRCODE = '22023';
  END IF;

  NEW.plan_type := v_plan_type;

  IF NEW.deliveries_total IS NULL OR NEW.deliveries_total = 0 THEN
    NEW.deliveries_total := v_expected_deliveries;
  ELSIF TG_OP = 'UPDATE'
        AND NEW.plan_type IS DISTINCT FROM lower(NULLIF(btrim(COALESCE(OLD.plan_type, '')), ''))
        AND NEW.deliveries_total IS NOT DISTINCT FROM OLD.deliveries_total THEN
    NEW.deliveries_total := v_expected_deliveries;
  ELSIF NEW.deliveries_total <> v_expected_deliveries THEN
    RAISE EXCEPTION 'SUBSCRIPTION_PLAN_DELIVERIES_MISMATCH:%:%', v_plan_type, v_expected_deliveries
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private_api.enforce_subscription_plan_delivery_contract()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS enforce_subscription_plan_delivery_contract
  ON public.subscription_plans;
CREATE TRIGGER enforce_subscription_plan_delivery_contract
BEFORE INSERT OR UPDATE OF plan_type, deliveries_total
ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION private_api.enforce_subscription_plan_delivery_contract();

ALTER TABLE public.subscription_plans
  DROP CONSTRAINT IF EXISTS subscription_plans_delivery_contract_check;
ALTER TABLE public.subscription_plans
  ADD CONSTRAINT subscription_plans_delivery_contract_check
  CHECK (
    plan_type IS NOT NULL
    AND deliveries_total IS NOT NULL
    AND lower(btrim(plan_type)) IN ('avulso', 'mensal', 'bimestral', 'trimestral', 'semestral', 'anual')
    AND deliveries_total = CASE lower(btrim(plan_type))
      WHEN 'avulso' THEN 1
      WHEN 'mensal' THEN 1
      WHEN 'bimestral' THEN 2
      WHEN 'trimestral' THEN 3
      WHEN 'semestral' THEN 6
      WHEN 'anual' THEN 12
    END
  );

CREATE OR REPLACE FUNCTION public.create_subscription_atomic(
  p_user_id uuid,
  p_collection_ids uuid[],
  p_plan_type text,
  p_payment_method text,
  p_payment_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_plan_type text := lower(btrim(COALESCE(p_plan_type, '')));
  v_payment_method text := lower(btrim(COALESCE(p_payment_method, '')));
  v_payment_id text := NULLIF(btrim(COALESCE(p_payment_id, '')), '');
  v_collection_ids uuid[] := COALESCE(p_collection_ids, ARRAY[]::uuid[]);
  v_collection_count integer := cardinality(COALESCE(p_collection_ids, ARRAY[]::uuid[]));
  v_total_active_collections integer;
  v_required_collections integer;
  v_active_selected_count integer;
  v_first_collection_id uuid;
  v_collection record;
  v_deliveries_total integer;
  v_total_paid numeric;
  v_available_characters integer;
  v_subscription public.subscriptions%ROWTYPE;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'USER_ID_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF v_collection_count = 0 THEN
    RAISE EXCEPTION 'COLLECTION_IDS_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF v_collection_count <> (
    SELECT count(DISTINCT selected.value)
      FROM unnest(v_collection_ids) AS selected(value)
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_COLLECTION_IDS' USING ERRCODE = '22023';
  END IF;

  IF v_plan_type NOT IN ('trimestral', 'semestral', 'anual') THEN
    RAISE EXCEPTION 'INVALID_PLAN_TYPE' USING ERRCODE = '22023';
  END IF;

  IF v_payment_method NOT IN ('pix', 'credit_card', 'boleto') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_METHOD' USING ERRCODE = '22023';
  END IF;

  SELECT count(*)
    INTO v_total_active_collections
    FROM public.collections
   WHERE is_active = true;

  v_required_collections := CASE v_plan_type
    WHEN 'trimestral' THEN 2
    WHEN 'semestral' THEN 3
    WHEN 'anual' THEN COALESCE(v_total_active_collections, 0)
    ELSE 1
  END;

  IF v_collection_count <> v_required_collections THEN
    RAISE EXCEPTION 'INVALID_COLLECTION_COUNT:%', v_required_collections USING ERRCODE = '22023';
  END IF;

  v_first_collection_id := v_collection_ids[1];

  SELECT id, name, price_bimonthly, price_yearly
    INTO v_collection
    FROM public.collections
   WHERE id = v_first_collection_id
     AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'COLLECTION_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  SELECT count(*)
    INTO v_active_selected_count
    FROM public.collections
   WHERE id = ANY(v_collection_ids)
     AND is_active = true;

  IF v_active_selected_count <> v_collection_count THEN
    RAISE EXCEPTION 'COLLECTIONS_INACTIVE_OR_NOT_FOUND' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.subscriptions
     WHERE user_id = p_user_id
       AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'ACTIVE_SUBSCRIPTION_EXISTS' USING ERRCODE = '22023';
  END IF;

  v_deliveries_total := CASE v_plan_type
    WHEN 'trimestral' THEN 3
    WHEN 'semestral' THEN 6
    WHEN 'anual' THEN 12
  END;

  v_total_paid := CASE v_plan_type
    WHEN 'trimestral' THEN COALESCE(v_collection.price_bimonthly, 0)::numeric * 1.5
    WHEN 'semestral' THEN COALESCE(v_collection.price_bimonthly, 0)::numeric * 3
    WHEN 'anual' THEN COALESCE(v_collection.price_yearly, 0)::numeric
  END;

  IF v_total_paid <= 0 THEN
    RAISE EXCEPTION 'PRICING_NOT_CONFIGURED' USING ERRCODE = '22023';
  END IF;

  SELECT count(*)
    INTO v_available_characters
    FROM public.collection_characters
   WHERE collection_id = v_first_collection_id;

  IF v_available_characters < v_deliveries_total THEN
    RAISE EXCEPTION 'INSUFFICIENT_CHARACTERS' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.subscriptions (
    user_id,
    collection_id,
    plan_type,
    status,
    total_paid,
    payment_method,
    payment_id,
    deliveries_total,
    next_delivery_at
  )
  VALUES (
    p_user_id,
    v_first_collection_id,
    v_plan_type,
    'active',
    v_total_paid,
    v_payment_method,
    v_payment_id,
    v_deliveries_total,
    now() + interval '30 days'
  )
  RETURNING * INTO v_subscription;

  INSERT INTO public.subscription_collections (subscription_id, collection_id)
  SELECT v_subscription.id, selected.collection_id
    FROM unnest(v_collection_ids) AS selected(collection_id);

  WITH selected_characters AS (
    SELECT
      id,
      row_number() OVER (ORDER BY COALESCE(release_order, 2147483647), created_at, id) AS delivery_index
    FROM public.collection_characters
    WHERE collection_id = v_first_collection_id
    ORDER BY COALESCE(release_order, 2147483647), created_at, id
    LIMIT v_deliveries_total
  )
  INSERT INTO public.subscription_deliveries (
    subscription_id,
    character_id,
    delivery_order,
    delivery_number,
    status,
    reveal_date
  )
  SELECT
    v_subscription.id,
    id,
    delivery_index::integer,
    delivery_index::integer,
    'scheduled',
    CASE WHEN delivery_index = 1 THEN now() + interval '30 days' ELSE NULL END
  FROM selected_characters;

  RETURN jsonb_build_object(
    'success', true,
    'subscription', jsonb_build_object(
      'id', v_subscription.id,
      'collection_name', v_collection.name,
      'collections_count', v_collection_count,
      'plan_type', v_plan_type,
      'deliveries_total', v_deliveries_total,
      'total_paid', v_total_paid,
      'next_delivery_at', v_subscription.next_delivery_at
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_subscription_atomic(uuid, uuid[], text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_subscription_atomic(uuid, uuid[], text, text, text)
  TO service_role;

COMMENT ON FUNCTION public.create_subscription_atomic(uuid, uuid[], text, text, text) IS
  'Service-role only atomic legacy subscription creation using the canonical 3/6/12 delivery contract.';

NOTIFY pgrst, 'reload schema';

COMMIT;
