-- Delivery/cycle/bonus mutation RPCs.
-- Moves legacy client-side delivery scheduling, cycle updates, collection choice,
-- automatic maintenance, and bonus-piece writes behind validated DB boundaries.

DO $$
DECLARE
  value text;
BEGIN
  IF to_regtype('public.purchase_status') IS NOT NULL THEN
    FOREACH value IN ARRAY ARRAY[
      'scheduled',
      'pending_choice',
      'pending_production',
      'processing',
      'revealed'
    ] LOOP
      IF NOT EXISTS (
        SELECT 1
          FROM pg_enum
         WHERE enumtypid = to_regtype('public.purchase_status')
           AND enumlabel = value
      ) THEN
        EXECUTE format('ALTER TYPE public.purchase_status ADD VALUE %L', value);
      END IF;
    END LOOP;
  END IF;

  IF to_regtype('public.cycle_status') IS NOT NULL THEN
    FOREACH value IN ARRAY ARRAY['open', 'active'] LOOP
      IF NOT EXISTS (
        SELECT 1
          FROM pg_enum
         WHERE enumtypid = to_regtype('public.cycle_status')
           AND enumlabel = value
      ) THEN
        EXECUTE format('ALTER TYPE public.cycle_status ADD VALUE %L', value);
      END IF;
    END LOOP;
  END IF;
END $$;

ALTER TABLE public.subscription_deliveries
  ADD COLUMN IF NOT EXISTS expected_delivery_date timestamptz,
  ADD COLUMN IF NOT EXISTS auto_maintained boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bonus_piece_id uuid;

CREATE TABLE IF NOT EXISTS public.bonus_pieces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  delivery_id uuid REFERENCES public.subscription_deliveries(id) ON DELETE SET NULL,
  description text,
  image_url text,
  status text NOT NULL DEFAULT 'pending',
  prepared_at timestamptz,
  shipped_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'bonus_pieces_status_valid'
       AND conrelid = 'public.bonus_pieces'::regclass
  ) THEN
    ALTER TABLE public.bonus_pieces
      ADD CONSTRAINT bonus_pieces_status_valid
      CHECK (status IN ('pending', 'prepared', 'shipped')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'bonus_pieces_one_per_subscription'
       AND conrelid = 'public.bonus_pieces'::regclass
  ) THEN
    ALTER TABLE public.bonus_pieces
      ADD CONSTRAINT bonus_pieces_one_per_subscription UNIQUE (subscription_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'subscription_deliveries_bonus_piece_id_fkey'
       AND conrelid = 'public.subscription_deliveries'::regclass
  ) THEN
    ALTER TABLE public.subscription_deliveries
      ADD CONSTRAINT subscription_deliveries_bonus_piece_id_fkey
      FOREIGN KEY (bonus_piece_id) REFERENCES public.bonus_pieces(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.collection_choice_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES public.subscription_deliveries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  previous_collection_id uuid REFERENCES public.collections(id) ON DELETE SET NULL,
  new_collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE RESTRICT,
  change_reason text NOT NULL,
  changed_by_admin boolean NOT NULL DEFAULT false,
  admin_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'collection_choice_history_reason_valid'
       AND conrelid = 'public.collection_choice_history'::regclass
  ) THEN
    ALTER TABLE public.collection_choice_history
      ADD CONSTRAINT collection_choice_history_reason_valid
      CHECK (change_reason IN ('manual', 'automatic_maintenance', 'admin_override')) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bonus_pieces_subscription
  ON public.bonus_pieces(subscription_id);
CREATE INDEX IF NOT EXISTS idx_bonus_pieces_delivery
  ON public.bonus_pieces(delivery_id);
CREATE INDEX IF NOT EXISTS idx_collection_choice_history_delivery
  ON public.collection_choice_history(delivery_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collection_choice_history_user
  ON public.collection_choice_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_deliveries_subscription_order
  ON public.subscription_deliveries(subscription_id, delivery_number, delivery_order);
CREATE INDEX IF NOT EXISTS idx_subscription_deliveries_cycle_status
  ON public.subscription_deliveries(cycle_id, status);

DROP TRIGGER IF EXISTS set_updated_at_bonus_pieces ON public.bonus_pieces;
CREATE TRIGGER set_updated_at_bonus_pieces
  BEFORE UPDATE ON public.bonus_pieces
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.bonus_pieces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_choice_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bonus_pieces_select_owner_admin" ON public.bonus_pieces;
CREATE POLICY "bonus_pieces_select_owner_admin"
  ON public.bonus_pieces FOR SELECT
  USING (
    COALESCE(auth.role(), '') = 'service_role'
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1
        FROM public.subscriptions s
       WHERE s.id = bonus_pieces.subscription_id
         AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "bonus_pieces_mutate_admin_service" ON public.bonus_pieces;
CREATE POLICY "bonus_pieces_mutate_admin_service"
  ON public.bonus_pieces FOR ALL
  USING (
    COALESCE(auth.role(), '') = 'service_role'
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    COALESCE(auth.role(), '') = 'service_role'
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "collection_choice_history_select_owner_admin" ON public.collection_choice_history;
CREATE POLICY "collection_choice_history_select_owner_admin"
  ON public.collection_choice_history FOR SELECT
  USING (
    user_id = auth.uid()
    OR COALESCE(auth.role(), '') = 'service_role'
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "collection_choice_history_insert_service_admin" ON public.collection_choice_history;
CREATE POLICY "collection_choice_history_insert_service_admin"
  ON public.collection_choice_history FOR INSERT
  WITH CHECK (
    COALESCE(auth.role(), '') = 'service_role'
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE OR REPLACE FUNCTION public.delivery_cycle_validate_text(
  p_value text,
  p_label text,
  p_max_length integer DEFAULT 500,
  p_required boolean DEFAULT true
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_value text := NULLIF(btrim(COALESCE(p_value, '')), '');
BEGIN
  IF p_required AND v_value IS NULL THEN
    RAISE EXCEPTION '% is required', p_label USING ERRCODE = '22023';
  END IF;

  IF v_value IS NOT NULL AND (
    length(v_value) > p_max_length
    OR v_value ~ '[[:cntrl:]]'
    OR v_value ~ '<[^>]*>'
  ) THEN
    RAISE EXCEPTION 'Invalid %', p_label USING ERRCODE = '22023';
  END IF;

  RETURN v_value;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_or_create_delivery_cycle(
  p_cycle_number integer,
  p_month integer,
  p_year integer,
  p_capacity integer DEFAULT 100
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cycle public.cycles%ROWTYPE;
  v_cycle_number integer := COALESCE(p_cycle_number, 1);
  v_capacity integer := COALESCE(NULLIF(p_capacity, 0), 100);
  v_open_start date;
  v_open_end date;
  v_production_start date;
  v_production_end date;
  v_shipping_date date;
BEGIN
  PERFORM public.assert_admin_access();

  IF v_cycle_number NOT IN (1, 2) THEN
    RAISE EXCEPTION 'Invalid cycle number' USING ERRCODE = '22023';
  END IF;

  IF p_month IS NULL OR p_month < 1 OR p_month > 12 THEN
    RAISE EXCEPTION 'Invalid cycle month' USING ERRCODE = '22023';
  END IF;

  IF p_year IS NULL OR p_year < 2020 OR p_year > 2100 THEN
    RAISE EXCEPTION 'Invalid cycle year' USING ERRCODE = '22023';
  END IF;

  IF v_capacity < 1 OR v_capacity > 10000 THEN
    RAISE EXCEPTION 'Invalid cycle capacity' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_cycle
    FROM public.cycles
   WHERE year = p_year
     AND month = p_month
     AND COALESCE(cycle_number, 1) = v_cycle_number
   LIMIT 1;

  IF FOUND THEN
    RETURN to_jsonb(v_cycle);
  END IF;

  v_open_start := make_date(p_year, p_month, 1);
  v_open_end := (v_open_start + interval '1 month - 1 day')::date;
  v_production_start := (v_open_start + interval '1 month')::date;
  v_production_end := (v_open_start + interval '2 months - 1 day')::date;
  v_shipping_date := (v_open_start + interval '2 months')::date;

  BEGIN
    INSERT INTO public.cycles (
      year,
      month,
      cycle_number,
      name,
      status,
      open_start,
      open_end,
      production_start,
      production_end,
      shipping_date,
      cutoff_date,
      sales_start_date,
      sales_end_date,
      production_start_date,
      production_end_date,
      shipping_start_date,
      shipping_end_date,
      capacity,
      used_capacity,
      capacity_max,
      capacity_current,
      capacity_limit,
      reserved_capacity
    )
    VALUES (
      p_year,
      p_month,
      v_cycle_number,
      p_year::text || '-' || lpad(p_month::text, 2, '0') || '-cycle-' || v_cycle_number::text,
      'open',
      v_open_start::timestamptz,
      v_open_end::timestamptz,
      v_production_start::timestamptz,
      v_production_end::timestamptz,
      v_shipping_date,
      v_open_end::timestamptz,
      v_open_start,
      v_open_end,
      v_production_start,
      v_production_end,
      v_shipping_date,
      v_shipping_date,
      v_capacity,
      0,
      v_capacity,
      0,
      v_capacity,
      0
    )
    RETURNING * INTO v_cycle;
  EXCEPTION WHEN unique_violation THEN
    SELECT *
      INTO v_cycle
      FROM public.cycles
     WHERE year = p_year
       AND month = p_month
       AND COALESCE(cycle_number, 1) = v_cycle_number
     LIMIT 1;
  END;

  RETURN to_jsonb(v_cycle);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_transition_delivery_cycle_status(
  p_cycle_id uuid,
  p_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status text := lower(public.delivery_cycle_validate_text(p_status, 'cycle status', 40));
  v_cycle public.cycles%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_cycle_id IS NULL THEN
    RAISE EXCEPTION 'Cycle id is required' USING ERRCODE = '22023';
  END IF;

  IF v_status NOT IN ('open', 'active', 'sales', 'production', 'shipping', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid cycle status' USING ERRCODE = '22023';
  END IF;

  UPDATE public.cycles
     SET status = v_status::public.cycle_status,
         status_changed_at = now(),
         updated_at = now()
   WHERE id = p_cycle_id
   RETURNING * INTO v_cycle;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cycle not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN to_jsonb(v_cycle);
END;
$$;

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
  v_plan_type text := lower(public.delivery_cycle_validate_text(p_plan_type, 'plan type', 40));
  v_delivery_count integer;
  v_entry_cycle public.cycles%ROWTYPE;
  v_subscription public.subscriptions%ROWTYPE;
  v_existing_count integer;
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

  IF v_plan_type NOT IN ('trimestral', 'semestral') THEN
    RAISE EXCEPTION 'Invalid plan type' USING ERRCODE = '22023';
  END IF;

  IF p_subscription_id IS NULL OR p_entry_cycle_id IS NULL THEN
    RAISE EXCEPTION 'Subscription and entry cycle are required' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_subscription
    FROM public.subscriptions
   WHERE id = p_subscription_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT *
    INTO v_entry_cycle
    FROM public.cycles
   WHERE id = p_entry_cycle_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entry cycle not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT count(*)
    INTO v_existing_count
    FROM public.subscription_deliveries
   WHERE subscription_id = p_subscription_id;

  IF v_existing_count > 0 THEN
    RAISE EXCEPTION 'Subscription deliveries already exist' USING ERRCODE = '23505';
  END IF;

  v_delivery_count := CASE v_plan_type WHEN 'trimestral' THEN 3 ELSE 6 END;
  v_current_month := v_entry_cycle.month;
  v_current_year := v_entry_cycle.year;

  FOR i IN 1..v_delivery_count LOOP
    v_current_month := v_current_month + 1;
    IF v_current_month > 12 THEN
      v_current_month := 1;
      v_current_year := v_current_year + 1;
    END IF;

    v_cycle_json := public.admin_get_or_create_delivery_cycle(1, v_current_month, v_current_year);
    v_cycle_id := (v_cycle_json->>'id')::uuid;
    v_shipping_date := COALESCE(
      NULLIF(v_cycle_json->>'shipping_date', '')::date,
      NULLIF(v_cycle_json->>'shipping_start_date', '')::date,
      make_date(v_current_year, v_current_month, 1)
    );

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

CREATE OR REPLACE FUNCTION public.admin_update_delivery_status_legacy(
  p_delivery_id uuid,
  p_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status text := lower(public.delivery_cycle_validate_text(p_status, 'delivery status', 60));
  v_delivery public.subscription_deliveries%ROWTYPE;
  v_now timestamptz := now();
BEGIN
  PERFORM public.assert_admin_access();

  IF p_delivery_id IS NULL THEN
    RAISE EXCEPTION 'Delivery id is required' USING ERRCODE = '22023';
  END IF;

  IF v_status NOT IN (
    'scheduled',
    'pending_production',
    'pending',
    'pending_choice',
    'confirmed',
    'processing',
    'in_production',
    'shipped',
    'delivered',
    'revealed',
    'cancelled'
  ) THEN
    RAISE EXCEPTION 'Invalid delivery status' USING ERRCODE = '22023';
  END IF;

  UPDATE public.subscription_deliveries
     SET status = v_status::public.purchase_status,
         shipping_date = CASE WHEN v_status = 'shipped' THEN COALESCE(shipping_date, v_now) ELSE shipping_date END,
         delivered_date = CASE WHEN v_status = 'delivered' THEN COALESCE(delivered_date, v_now) ELSE delivered_date END,
         actual_delivery_date = CASE WHEN v_status = 'delivered' THEN COALESCE(actual_delivery_date, v_now) ELSE actual_delivery_date END,
         reveal_date = CASE WHEN v_status = 'revealed' THEN COALESCE(reveal_date, v_now) ELSE reveal_date END,
         updated_at = v_now
   WHERE id = p_delivery_id
   RETURNING * INTO v_delivery;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN to_jsonb(v_delivery);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_assign_delivery_to_cycle(
  p_delivery_id uuid,
  p_cycle_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_delivery public.subscription_deliveries%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_delivery_id IS NULL OR p_cycle_id IS NULL THEN
    RAISE EXCEPTION 'Delivery and cycle are required' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.cycles WHERE id = p_cycle_id) THEN
    RAISE EXCEPTION 'Cycle not found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.subscription_deliveries
     SET cycle_id = p_cycle_id,
         updated_at = now()
   WHERE id = p_delivery_id
   RETURNING * INTO v_delivery;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN to_jsonb(v_delivery);
END;
$$;

CREATE OR REPLACE FUNCTION public.change_delivery_character_for_current_user(
  p_delivery_id uuid,
  p_character_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_delivery public.subscription_deliveries%ROWTYPE;
  v_subscription_user_id uuid;
  v_cycle_status text;
  v_is_admin boolean := COALESCE(auth.role(), '') = 'service_role'
    OR COALESCE(public.has_role(auth.uid(), 'admin'), false);
BEGIN
  IF p_delivery_id IS NULL OR p_character_id IS NULL THEN
    RAISE EXCEPTION 'Delivery and character are required' USING ERRCODE = '22023';
  END IF;

  IF auth.uid() IS NULL AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT *
    INTO v_delivery
    FROM public.subscription_deliveries
   WHERE id = p_delivery_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT s.user_id, c.status::text
    INTO v_subscription_user_id, v_cycle_status
    FROM public.subscriptions s
    LEFT JOIN public.cycles c ON c.id = v_delivery.cycle_id
   WHERE s.id = v_delivery.subscription_id;

  IF NOT v_is_admin AND v_subscription_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  IF COALESCE(v_cycle_status, '') NOT IN ('open', 'active', 'sales') THEN
    RAISE EXCEPTION 'Character changes are not allowed for this cycle' USING ERRCODE = '22023';
  END IF;

  UPDATE public.subscription_deliveries
     SET character_id = p_character_id,
         updated_at = now()
   WHERE id = p_delivery_id
   RETURNING * INTO v_delivery;

  RETURN to_jsonb(v_delivery);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_bonus_piece(
  p_subscription_id uuid,
  p_description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_description text := public.delivery_cycle_validate_text(p_description, 'bonus description', 1000, false);
  v_subscription public.subscriptions%ROWTYPE;
  v_bonus public.bonus_pieces%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_subscription_id IS NULL THEN
    RAISE EXCEPTION 'Subscription id is required' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_subscription
    FROM public.subscriptions
   WHERE id = p_subscription_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found' USING ERRCODE = 'P0002';
  END IF;

  IF COALESCE(v_subscription.plan_type, '') <> 'semestral' THEN
    RAISE EXCEPTION 'Bonus pieces are restricted to semestral subscriptions' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.bonus_pieces (
    subscription_id,
    description,
    status
  )
  VALUES (
    p_subscription_id,
    v_description,
    'pending'
  )
  RETURNING * INTO v_bonus;

  RETURN to_jsonb(v_bonus);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_link_bonus_piece_to_delivery(
  p_bonus_id uuid,
  p_delivery_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_bonus public.bonus_pieces%ROWTYPE;
  v_delivery public.subscription_deliveries%ROWTYPE;
  v_plan_type text;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_bonus_id IS NULL OR p_delivery_id IS NULL THEN
    RAISE EXCEPTION 'Bonus and delivery are required' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_bonus
    FROM public.bonus_pieces
   WHERE id = p_bonus_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bonus piece not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT *
    INTO v_delivery
    FROM public.subscription_deliveries
   WHERE id = p_delivery_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT plan_type
    INTO v_plan_type
    FROM public.subscriptions
   WHERE id = v_delivery.subscription_id;

  IF v_delivery.subscription_id <> v_bonus.subscription_id THEN
    RAISE EXCEPTION 'Bonus and delivery belong to different subscriptions' USING ERRCODE = '22023';
  END IF;

  IF COALESCE(v_plan_type, '') <> 'semestral' OR COALESCE(v_delivery.delivery_number, v_delivery.delivery_order) <> 6 THEN
    RAISE EXCEPTION 'Bonus pieces can only be linked to the sixth semestral delivery' USING ERRCODE = '22023';
  END IF;

  UPDATE public.bonus_pieces
     SET delivery_id = p_delivery_id,
         updated_at = now()
   WHERE id = p_bonus_id
   RETURNING * INTO v_bonus;

  UPDATE public.subscription_deliveries
     SET bonus_piece_id = p_bonus_id,
         updated_at = now()
   WHERE id = p_delivery_id;

  RETURN to_jsonb(v_bonus);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_bonus_piece_status(
  p_bonus_id uuid,
  p_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status text := lower(public.delivery_cycle_validate_text(p_status, 'bonus status', 40));
  v_bonus public.bonus_pieces%ROWTYPE;
  v_current_order integer;
  v_next_order integer;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_bonus_id IS NULL THEN
    RAISE EXCEPTION 'Bonus id is required' USING ERRCODE = '22023';
  END IF;

  IF v_status NOT IN ('pending', 'prepared', 'shipped') THEN
    RAISE EXCEPTION 'Invalid bonus status' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_bonus
    FROM public.bonus_pieces
   WHERE id = p_bonus_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bonus piece not found' USING ERRCODE = 'P0002';
  END IF;

  v_current_order := CASE v_bonus.status WHEN 'pending' THEN 0 WHEN 'prepared' THEN 1 ELSE 2 END;
  v_next_order := CASE v_status WHEN 'pending' THEN 0 WHEN 'prepared' THEN 1 ELSE 2 END;

  IF v_next_order < v_current_order THEN
    RAISE EXCEPTION 'Bonus status cannot move backwards' USING ERRCODE = '22023';
  END IF;

  UPDATE public.bonus_pieces
     SET status = v_status,
         prepared_at = CASE WHEN v_status = 'prepared' THEN COALESCE(prepared_at, now()) ELSE prepared_at END,
         shipped_at = CASE WHEN v_status = 'shipped' THEN COALESCE(shipped_at, now()) ELSE shipped_at END,
         updated_at = now()
   WHERE id = p_bonus_id
   RETURNING * INTO v_bonus;

  RETURN to_jsonb(v_bonus);
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_automatic_delivery_maintenance(
  p_delivery_id uuid,
  p_subscription_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current public.subscription_deliveries%ROWTYPE;
  v_previous public.subscription_deliveries%ROWTYPE;
  v_subscription public.subscriptions%ROWTYPE;
  v_collection_is_active boolean;
  v_history_id uuid;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_delivery_id IS NULL OR p_subscription_id IS NULL THEN
    RAISE EXCEPTION 'Delivery and subscription are required' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_current
    FROM public.subscription_deliveries
   WHERE id = p_delivery_id
     AND subscription_id = p_subscription_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT *
    INTO v_subscription
    FROM public.subscriptions
   WHERE id = p_subscription_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found' USING ERRCODE = 'P0002';
  END IF;

  IF COALESCE(v_current.delivery_number, v_current.delivery_order, 1) <= 1 THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'first_delivery');
  END IF;

  SELECT *
    INTO v_previous
    FROM public.subscription_deliveries
   WHERE subscription_id = p_subscription_id
     AND COALESCE(delivery_number, delivery_order) = COALESCE(v_current.delivery_number, v_current.delivery_order) - 1
   ORDER BY created_at DESC
   LIMIT 1;

  IF NOT FOUND OR v_previous.collection_id IS NULL THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'previous_collection_missing');
  END IF;

  SELECT COALESCE(c.is_active, true)
         AND COALESCE(c.status::text, 'active') = 'active'
    INTO v_collection_is_active
    FROM public.collections c
   WHERE c.id = v_previous.collection_id;

  IF COALESCE(v_collection_is_active, false) IS NOT TRUE THEN
    RETURN jsonb_build_object(
      'applied', false,
      'reason', 'previous_collection_inactive',
      'previousCollectionId', v_previous.collection_id
    );
  END IF;

  UPDATE public.subscription_deliveries
     SET collection_id = v_previous.collection_id,
         auto_maintained = true,
         updated_at = now()
   WHERE id = p_delivery_id
   RETURNING * INTO v_current;

  INSERT INTO public.collection_choice_history (
    delivery_id,
    user_id,
    previous_collection_id,
    new_collection_id,
    change_reason,
    changed_by_admin,
    admin_user_id
  )
  VALUES (
    p_delivery_id,
    v_subscription.user_id,
    NULL,
    v_previous.collection_id,
    'automatic_maintenance',
    false,
    NULL
  )
  RETURNING id INTO v_history_id;

  RETURN jsonb_build_object(
    'applied', true,
    'delivery', to_jsonb(v_current),
    'historyId', v_history_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_delivery_with_auto_maintenance(
  p_delivery_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_delivery public.subscription_deliveries%ROWTYPE;
  v_maintenance jsonb := NULL;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_delivery_id IS NULL THEN
    RAISE EXCEPTION 'Delivery id is required' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_delivery
    FROM public.subscription_deliveries
   WHERE id = p_delivery_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_delivery.status::text <> 'scheduled' THEN
    RETURN jsonb_build_object(
      'activated', false,
      'reason', 'not_scheduled',
      'delivery', to_jsonb(v_delivery)
    );
  END IF;

  UPDATE public.subscription_deliveries
     SET status = 'pending_choice'::public.purchase_status,
         updated_at = now()
   WHERE id = p_delivery_id
   RETURNING * INTO v_delivery;

  IF COALESCE(v_delivery.delivery_number, v_delivery.delivery_order, 1) > 1 THEN
    v_maintenance := public.apply_automatic_delivery_maintenance(p_delivery_id, v_delivery.subscription_id);
  END IF;

  RETURN jsonb_build_object(
    'activated', true,
    'delivery', to_jsonb(v_delivery),
    'maintenance', v_maintenance
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.change_delivery_collection_choice_for_current_user(
  p_delivery_id uuid,
  p_new_collection_id uuid,
  p_user_id uuid,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ip_address text := public.delivery_cycle_validate_text(p_ip_address, 'ip address', 80, false);
  v_user_agent text := public.delivery_cycle_validate_text(p_user_agent, 'user agent', 500, false);
  v_delivery public.subscription_deliveries%ROWTYPE;
  v_subscription public.subscriptions%ROWTYPE;
  v_previous_collection_id uuid;
  v_history public.collection_choice_history%ROWTYPE;
  v_is_admin boolean := COALESCE(auth.role(), '') = 'service_role'
    OR COALESCE(public.has_role(auth.uid(), 'admin'), false);
BEGIN
  IF p_delivery_id IS NULL OR p_new_collection_id IS NULL OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'Delivery, collection, and user are required' USING ERRCODE = '22023';
  END IF;

  IF NOT v_is_admin AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_before_cutoff() THEN
    RAISE EXCEPTION 'CUTOFF_PASSED' USING ERRCODE = '22023';
  END IF;

  SELECT sd.*
    INTO v_delivery
    FROM public.subscription_deliveries sd
   WHERE sd.id = p_delivery_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT *
    INTO v_subscription
    FROM public.subscriptions
   WHERE id = v_delivery.subscription_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_subscription.user_id <> p_user_id THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  IF v_delivery.status::text NOT IN ('pending_choice', 'confirmed') THEN
    RAISE EXCEPTION 'Delivery status does not allow collection changes' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.collections c
     WHERE c.id = p_new_collection_id
       AND COALESCE(c.is_active, true)
       AND COALESCE(c.status::text, 'active') = 'active'
  ) THEN
    RAISE EXCEPTION 'Collection is not active' USING ERRCODE = '22023';
  END IF;

  v_previous_collection_id := v_delivery.collection_id;

  UPDATE public.subscription_deliveries
     SET collection_id = p_new_collection_id,
         auto_maintained = false,
         updated_at = now()
   WHERE id = p_delivery_id
   RETURNING * INTO v_delivery;

  INSERT INTO public.collection_choice_history (
    delivery_id,
    user_id,
    previous_collection_id,
    new_collection_id,
    change_reason,
    changed_by_admin,
    admin_user_id,
    ip_address,
    user_agent
  )
  VALUES (
    p_delivery_id,
    p_user_id,
    v_previous_collection_id,
    p_new_collection_id,
    'manual',
    false,
    NULL,
    v_ip_address,
    v_user_agent
  )
  RETURNING * INTO v_history;

  RETURN jsonb_build_object(
    'delivery', to_jsonb(v_delivery),
    'history', to_jsonb(v_history)
  );
END;
$$;

REVOKE INSERT, UPDATE, DELETE ON public.cycles FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.subscription_deliveries FROM anon, authenticated;
REVOKE ALL ON public.bonus_pieces FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE ON public.bonus_pieces FROM authenticated;
REVOKE ALL ON public.collection_choice_history FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE ON public.collection_choice_history FROM authenticated;

GRANT SELECT ON public.cycles TO anon, authenticated;
GRANT SELECT ON public.subscription_deliveries TO authenticated;
GRANT SELECT ON public.bonus_pieces TO authenticated;
GRANT SELECT ON public.collection_choice_history TO authenticated;
GRANT ALL ON public.cycles TO service_role;
GRANT ALL ON public.subscription_deliveries TO service_role;
GRANT ALL ON public.bonus_pieces TO service_role;
GRANT ALL ON public.collection_choice_history TO service_role;

REVOKE EXECUTE ON FUNCTION public.delivery_cycle_validate_text(text, text, integer, boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_get_or_create_delivery_cycle(integer, integer, integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_transition_delivery_cycle_status(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_schedule_subscription_deliveries(uuid, text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_delivery_status_legacy(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_assign_delivery_to_cycle(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.change_delivery_character_for_current_user(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_create_bonus_piece(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_link_bonus_piece_to_delivery(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_bonus_piece_status(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.apply_automatic_delivery_maintenance(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.activate_delivery_with_auto_maintenance(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.change_delivery_collection_choice_for_current_user(uuid, uuid, uuid, text, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_get_or_create_delivery_cycle(integer, integer, integer, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_transition_delivery_cycle_status(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_schedule_subscription_deliveries(uuid, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_delivery_status_legacy(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_assign_delivery_to_cycle(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.change_delivery_character_for_current_user(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_create_bonus_piece(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_link_bonus_piece_to_delivery(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_bonus_piece_status(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_automatic_delivery_maintenance(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.activate_delivery_with_auto_maintenance(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.change_delivery_collection_choice_for_current_user(uuid, uuid, uuid, text, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_schedule_subscription_deliveries(uuid, text, uuid) IS
  'Admin/service-only atomic creation of subscription deliveries, capacity reservations, and semestral bonus linkage.';
COMMENT ON FUNCTION public.change_delivery_collection_choice_for_current_user(uuid, uuid, uuid, text, text) IS
  'Current-user collection choice mutation with ownership, cutoff, active collection validation, and audit history.';
COMMENT ON FUNCTION public.activate_delivery_with_auto_maintenance(uuid) IS
  'Admin/service-only activation from scheduled to pending_choice with automatic collection maintenance.';

NOTIFY pgrst, 'reload schema';
