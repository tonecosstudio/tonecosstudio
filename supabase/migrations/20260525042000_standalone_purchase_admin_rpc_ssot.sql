-- Canonical standalone purchase financial fields and admin-only status RPCs.
-- Keeps legacy aliases synchronized while sensitive transitions happen server-side.

ALTER TABLE public.standalone_purchases
  ADD COLUMN IF NOT EXISTS deposit_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS balance_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS total_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS price_deposit numeric(10,2),
  ADD COLUMN IF NOT EXISTS price_balance numeric(10,2),
  ADD COLUMN IF NOT EXISTS price_full numeric(10,2),
  ADD COLUMN IF NOT EXISTS deposit_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS balance_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS production_complete_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_voucher_deposit_url text,
  ADD COLUMN IF NOT EXISTS payment_voucher_balance_url text,
  ADD COLUMN IF NOT EXISTS deposit_voucher_url text,
  ADD COLUMN IF NOT EXISTS balance_voucher_url text,
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
  ADD COLUMN IF NOT EXISTS expected_delivery_date date,
  ADD COLUMN IF NOT EXISTS actual_delivery_date date;

DO $$
DECLARE
  value text;
BEGIN
  IF to_regtype('public.purchase_status') IS NOT NULL THEN
    FOREACH value IN ARRAY ARRAY[
      'awaiting_deposit',
      'deposit_paid',
      'awaiting_balance',
      'balance_paid',
      'completed'
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
END $$;

UPDATE public.standalone_purchases
   SET deposit_amount = COALESCE(deposit_amount, price_deposit, paid_amount, 0),
       total_amount = COALESCE(total_amount, price_full, amount, 0),
       balance_amount = COALESCE(
         balance_amount,
         price_balance,
         GREATEST(COALESCE(total_amount, price_full, amount, 0) - COALESCE(deposit_amount, price_deposit, paid_amount, 0), 0)
       ),
       price_deposit = COALESCE(price_deposit, deposit_amount, paid_amount, 0),
       price_balance = COALESCE(
         price_balance,
         balance_amount,
         GREATEST(COALESCE(total_amount, price_full, amount, 0) - COALESCE(deposit_amount, price_deposit, paid_amount, 0), 0)
       ),
       price_full = COALESCE(price_full, total_amount, amount, 0),
       payment_voucher_deposit_url = COALESCE(payment_voucher_deposit_url, deposit_voucher_url),
       payment_voucher_balance_url = COALESCE(payment_voucher_balance_url, balance_voucher_url),
       deposit_voucher_url = COALESCE(deposit_voucher_url, payment_voucher_deposit_url),
       balance_voucher_url = COALESCE(balance_voucher_url, payment_voucher_balance_url);

CREATE OR REPLACE FUNCTION public.sync_standalone_purchase_financial_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.price_deposit IS DISTINCT FROM OLD.price_deposit
       AND NEW.deposit_amount IS NOT DISTINCT FROM OLD.deposit_amount THEN
      NEW.deposit_amount := NEW.price_deposit;
    ELSIF NEW.deposit_amount IS DISTINCT FROM OLD.deposit_amount THEN
      NEW.price_deposit := NEW.deposit_amount;
    END IF;

    IF NEW.price_balance IS DISTINCT FROM OLD.price_balance
       AND NEW.balance_amount IS NOT DISTINCT FROM OLD.balance_amount THEN
      NEW.balance_amount := NEW.price_balance;
    ELSIF NEW.balance_amount IS DISTINCT FROM OLD.balance_amount THEN
      NEW.price_balance := NEW.balance_amount;
    END IF;

    IF NEW.price_full IS DISTINCT FROM OLD.price_full
       AND NEW.total_amount IS NOT DISTINCT FROM OLD.total_amount THEN
      NEW.total_amount := NEW.price_full;
    ELSIF NEW.total_amount IS DISTINCT FROM OLD.total_amount THEN
      NEW.price_full := NEW.total_amount;
    END IF;

    IF NEW.deposit_voucher_url IS DISTINCT FROM OLD.deposit_voucher_url
       AND NEW.payment_voucher_deposit_url IS NOT DISTINCT FROM OLD.payment_voucher_deposit_url THEN
      NEW.payment_voucher_deposit_url := NEW.deposit_voucher_url;
    ELSIF NEW.payment_voucher_deposit_url IS DISTINCT FROM OLD.payment_voucher_deposit_url THEN
      NEW.deposit_voucher_url := NEW.payment_voucher_deposit_url;
    END IF;

    IF NEW.balance_voucher_url IS DISTINCT FROM OLD.balance_voucher_url
       AND NEW.payment_voucher_balance_url IS NOT DISTINCT FROM OLD.payment_voucher_balance_url THEN
      NEW.payment_voucher_balance_url := NEW.balance_voucher_url;
    ELSIF NEW.payment_voucher_balance_url IS DISTINCT FROM OLD.payment_voucher_balance_url THEN
      NEW.balance_voucher_url := NEW.payment_voucher_balance_url;
    END IF;
  END IF;

  NEW.deposit_amount := COALESCE(NEW.deposit_amount, NEW.price_deposit, NEW.paid_amount, 0);
  NEW.total_amount := COALESCE(
    NEW.total_amount,
    NEW.price_full,
    NEW.amount,
    NEW.deposit_amount + COALESCE(NEW.balance_amount, NEW.price_balance, 0),
    0
  );
  NEW.balance_amount := COALESCE(
    NEW.balance_amount,
    NEW.price_balance,
    GREATEST(NEW.total_amount - NEW.deposit_amount, 0),
    0
  );

  NEW.price_deposit := COALESCE(NEW.price_deposit, NEW.deposit_amount);
  NEW.price_balance := COALESCE(NEW.price_balance, NEW.balance_amount);
  NEW.price_full := COALESCE(NEW.price_full, NEW.total_amount);
  NEW.amount := COALESCE(NEW.amount, NEW.total_amount);

  NEW.payment_voucher_deposit_url := COALESCE(NEW.payment_voucher_deposit_url, NEW.deposit_voucher_url);
  NEW.payment_voucher_balance_url := COALESCE(NEW.payment_voucher_balance_url, NEW.balance_voucher_url);
  NEW.deposit_voucher_url := COALESCE(NEW.deposit_voucher_url, NEW.payment_voucher_deposit_url);
  NEW.balance_voucher_url := COALESCE(NEW.balance_voucher_url, NEW.payment_voucher_balance_url);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_standalone_purchase_financial_columns
  ON public.standalone_purchases;
CREATE TRIGGER sync_standalone_purchase_financial_columns
  BEFORE INSERT OR UPDATE ON public.standalone_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_standalone_purchase_financial_columns();

CREATE TABLE IF NOT EXISTS public.standalone_purchase_admin_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES public.standalone_purchases(id) ON DELETE CASCADE,
  admin_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  action_type text NOT NULL CHECK (
    action_type IN (
      'cancel_order',
      'mark_production_complete',
      'approve_payment_voucher',
      'reject_payment_voucher',
      'update_tracking_code',
      'update_fulfillment_status'
    )
  ),
  previous_status text,
  new_status text,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_standalone_purchase_admin_action_logs_purchase
  ON public.standalone_purchase_admin_action_logs(purchase_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_standalone_purchase_admin_action_logs_admin
  ON public.standalone_purchase_admin_action_logs(admin_user_id, created_at DESC);

ALTER TABLE public.standalone_purchase_admin_action_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "standalone_purchase_admin_action_logs_select_admin"
  ON public.standalone_purchase_admin_action_logs;
CREATE POLICY "standalone_purchase_admin_action_logs_select_admin"
  ON public.standalone_purchase_admin_action_logs
  FOR SELECT
  USING (public.current_user_role() IN ('admin', 'super_admin'));

REVOKE ALL ON public.standalone_purchase_admin_action_logs FROM PUBLIC, anon;
GRANT SELECT ON public.standalone_purchase_admin_action_logs TO authenticated;
GRANT ALL ON public.standalone_purchase_admin_action_logs TO service_role;

CREATE OR REPLACE FUNCTION public.log_standalone_admin_action(
  p_purchase_id uuid,
  p_admin_user_id uuid DEFAULT NULL,
  p_action_type text DEFAULT NULL,
  p_previous_status text DEFAULT NULL,
  p_new_status text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_log_id uuid;
  v_admin_id uuid := auth.uid();
  v_action_type text := lower(btrim(COALESCE(p_action_type, '')));
BEGIN
  IF public.current_user_role()::text NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'ADMIN_AUTH_REQUIRED';
  END IF;

  IF p_purchase_id IS NULL THEN
    RAISE EXCEPTION 'PURCHASE_ID_REQUIRED';
  END IF;

  IF v_action_type NOT IN (
    'cancel_order',
    'mark_production_complete',
    'approve_payment_voucher',
    'reject_payment_voucher',
    'update_tracking_code',
    'update_fulfillment_status'
  ) THEN
    RAISE EXCEPTION 'INVALID_ACTION_TYPE';
  END IF;

  INSERT INTO public.standalone_purchase_admin_action_logs (
    purchase_id,
    admin_user_id,
    action_type,
    previous_status,
    new_status,
    notes,
    metadata
  )
  VALUES (
    p_purchase_id,
    v_admin_id,
    v_action_type,
    p_previous_status,
    p_new_status,
    left(p_notes, 1000),
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.ordax_is_holiday(p_date date)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_column text;
  v_exists boolean := false;
BEGIN
  IF to_regclass('public.holidays') IS NULL THEN
    RETURN false;
  END IF;

  SELECT column_name
    INTO v_column
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'holidays'
     AND column_name IN ('holiday_date', 'date')
   ORDER BY CASE column_name WHEN 'holiday_date' THEN 0 ELSE 1 END
   LIMIT 1;

  IF v_column IS NULL THEN
    RETURN false;
  END IF;

  EXECUTE format(
    'SELECT EXISTS (SELECT 1 FROM public.holidays WHERE (%I)::date = $1)',
    v_column
  )
  INTO v_exists
  USING p_date;

  RETURN COALESCE(v_exists, false);
EXCEPTION
  WHEN others THEN
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.ordax_is_business_day(p_date date)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXTRACT(ISODOW FROM p_date) BETWEEN 1 AND 5
     AND NOT public.ordax_is_holiday(p_date);
$$;

CREATE OR REPLACE FUNCTION public.ordax_add_business_days(
  p_start timestamptz,
  p_days integer
)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_local timestamp;
  v_date date;
  v_time time;
  v_count integer := 0;
BEGIN
  IF p_start IS NULL THEN
    RAISE EXCEPTION 'START_DATE_REQUIRED';
  END IF;

  IF p_days < 0 THEN
    RAISE EXCEPTION 'NEGATIVE_BUSINESS_DAYS_NOT_SUPPORTED';
  END IF;

  v_local := timezone('America/Sao_Paulo', p_start);
  v_date := v_local::date;
  v_time := v_local::time;

  WHILE v_count < p_days LOOP
    v_date := v_date + 1;

    IF public.ordax_is_business_day(v_date) THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN (v_date + v_time) AT TIME ZONE 'America/Sao_Paulo';
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_standalone_tracking_code()
RETURNS text
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT 'SP-'
      || to_char(timezone('UTC', now()), 'YYYYMMDD')
      || '-'
      || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 5));
$$;

CREATE OR REPLACE FUNCTION public.admin_cancel_standalone_purchase(
  p_purchase_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_purchase public.standalone_purchases%ROWTYPE;
  v_previous_status text;
  v_reason text := left(COALESCE(NULLIF(btrim(p_reason), ''), 'Cancelled by admin'), 500);
  v_before_cutoff boolean;
  v_capacity_released boolean := false;
BEGIN
  IF public.current_user_role()::text NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF p_purchase_id IS NULL THEN
    RAISE EXCEPTION 'PURCHASE_ID_REQUIRED';
  END IF;

  SELECT *
    INTO v_purchase
    FROM public.standalone_purchases
   WHERE id = p_purchase_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PURCHASE_NOT_FOUND';
  END IF;

  v_previous_status := v_purchase.status::text;

  IF v_previous_status = 'cancelled' THEN
    RAISE EXCEPTION 'ALREADY_CANCELLED';
  END IF;

  v_before_cutoff := public.is_before_cutoff();

  IF v_before_cutoff AND v_purchase.cycle_id IS NOT NULL THEN
    PERFORM public.release_capacity(v_purchase.cycle_id, 1);
    v_capacity_released := true;
  END IF;

  UPDATE public.standalone_purchases
     SET status = 'cancelled',
         cancelled_at = now(),
         cancellation_reason = v_reason,
         updated_at = now()
   WHERE id = p_purchase_id;

  PERFORM public.log_standalone_admin_action(
    p_purchase_id,
    auth.uid(),
    'cancel_order',
    v_previous_status,
    'cancelled',
    v_reason,
    jsonb_build_object(
      'capacity_released', v_capacity_released,
      'before_cutoff', v_before_cutoff
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'purchaseId', p_purchase_id,
    'previousStatus', v_previous_status,
    'newStatus', 'cancelled',
    'reason', v_reason,
    'capacityReleased', v_capacity_released
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_mark_standalone_production_complete(
  p_purchase_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_purchase public.standalone_purchases%ROWTYPE;
  v_previous_status text;
  v_production_complete_at timestamptz := now();
  v_balance_due_date timestamptz;
BEGIN
  IF public.current_user_role()::text NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF p_purchase_id IS NULL THEN
    RAISE EXCEPTION 'PURCHASE_ID_REQUIRED';
  END IF;

  SELECT *
    INTO v_purchase
    FROM public.standalone_purchases
   WHERE id = p_purchase_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PURCHASE_NOT_FOUND';
  END IF;

  v_previous_status := v_purchase.status::text;

  IF v_previous_status <> 'deposit_paid' THEN
    RAISE EXCEPTION 'INVALID_STATUS:%', v_previous_status;
  END IF;

  v_balance_due_date := public.ordax_add_business_days(v_production_complete_at, 5);

  UPDATE public.standalone_purchases
     SET status = 'awaiting_balance',
         production_complete_at = v_production_complete_at,
         balance_due_date = v_balance_due_date,
         updated_at = now()
   WHERE id = p_purchase_id;

  PERFORM public.log_standalone_admin_action(
    p_purchase_id,
    auth.uid(),
    'mark_production_complete',
    v_previous_status,
    'awaiting_balance',
    'Production marked complete',
    jsonb_build_object(
      'production_complete_at', v_production_complete_at,
      'balance_due_date', v_balance_due_date
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'purchaseId', p_purchase_id,
    'previousStatus', v_previous_status,
    'newStatus', 'awaiting_balance',
    'productionCompleteAt', v_production_complete_at,
    'balanceDueDate', v_balance_due_date,
    'userId', v_purchase.user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_approve_standalone_payment_voucher(
  p_purchase_id uuid,
  p_voucher_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_purchase public.standalone_purchases%ROWTYPE;
  v_voucher_type text := lower(btrim(COALESCE(p_voucher_type, '')));
  v_previous_status text;
  v_new_status text;
  v_tracking_code text;
BEGIN
  IF public.current_user_role()::text NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF p_purchase_id IS NULL THEN
    RAISE EXCEPTION 'PURCHASE_ID_REQUIRED';
  END IF;

  IF v_voucher_type NOT IN ('deposit', 'balance') THEN
    RAISE EXCEPTION 'INVALID_VOUCHER_TYPE';
  END IF;

  SELECT *
    INTO v_purchase
    FROM public.standalone_purchases
   WHERE id = p_purchase_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PURCHASE_NOT_FOUND';
  END IF;

  v_previous_status := v_purchase.status::text;

  IF v_voucher_type = 'deposit' THEN
    IF v_previous_status NOT IN ('pending', 'confirmed', 'deposit_paid') THEN
      RAISE EXCEPTION 'INVALID_STATUS:%', v_previous_status;
    END IF;

    UPDATE public.standalone_purchases
       SET status = 'deposit_paid',
           deposit_paid_at = COALESCE(deposit_paid_at, now()),
           updated_at = now()
     WHERE id = p_purchase_id;

    v_new_status := 'deposit_paid';
  ELSE
    IF v_previous_status <> 'awaiting_balance' THEN
      RAISE EXCEPTION 'INVALID_STATUS:%', v_previous_status;
    END IF;

    IF v_purchase.balance_due_date IS NOT NULL AND now() > v_purchase.balance_due_date THEN
      RAISE EXCEPTION 'BALANCE_DEADLINE_PASSED';
    END IF;

    v_tracking_code := COALESCE(v_purchase.tracking_code, public.generate_standalone_tracking_code());

    UPDATE public.standalone_purchases
       SET status = 'balance_paid',
           balance_paid_at = now(),
           tracking_code = v_tracking_code,
           updated_at = now()
     WHERE id = p_purchase_id;

    v_new_status := 'balance_paid';
  END IF;

  INSERT INTO public.payment_verification_audit_logs (
    order_id,
    order_type,
    admin_user_id,
    action_type,
    previous_status,
    new_status,
    notes
  )
  VALUES (
    p_purchase_id,
    'standalone_purchase',
    auth.uid(),
    'approve_payment_voucher',
    v_previous_status,
    v_new_status,
    'Approved ' || v_voucher_type || ' voucher'
  );

  PERFORM public.log_standalone_admin_action(
    p_purchase_id,
    auth.uid(),
    'approve_payment_voucher',
    v_previous_status,
    v_new_status,
    'Approved ' || v_voucher_type || ' voucher',
    jsonb_build_object('voucher_type', v_voucher_type)
  );

  RETURN jsonb_build_object(
    'success', true,
    'purchaseId', p_purchase_id,
    'previousStatus', v_previous_status,
    'newStatus', v_new_status,
    'trackingCode', v_tracking_code
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_standalone_payment_voucher(
  p_purchase_id uuid,
  p_voucher_type text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_purchase public.standalone_purchases%ROWTYPE;
  v_voucher_type text := lower(btrim(COALESCE(p_voucher_type, '')));
  v_reason text := left(COALESCE(NULLIF(btrim(p_reason), ''), 'Voucher rejected'), 1000);
  v_previous_status text;
BEGIN
  IF public.current_user_role()::text NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF p_purchase_id IS NULL THEN
    RAISE EXCEPTION 'PURCHASE_ID_REQUIRED';
  END IF;

  IF v_voucher_type NOT IN ('deposit', 'balance') THEN
    RAISE EXCEPTION 'INVALID_VOUCHER_TYPE';
  END IF;

  SELECT *
    INTO v_purchase
    FROM public.standalone_purchases
   WHERE id = p_purchase_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PURCHASE_NOT_FOUND';
  END IF;

  v_previous_status := v_purchase.status::text;

  IF v_voucher_type = 'deposit' THEN
    UPDATE public.standalone_purchases
       SET payment_voucher_deposit_url = NULL,
           deposit_voucher_url = NULL,
           updated_at = now()
     WHERE id = p_purchase_id;
  ELSE
    UPDATE public.standalone_purchases
       SET payment_voucher_balance_url = NULL,
           balance_voucher_url = NULL,
           updated_at = now()
     WHERE id = p_purchase_id;
  END IF;

  INSERT INTO public.payment_verification_audit_logs (
    order_id,
    order_type,
    admin_user_id,
    action_type,
    previous_status,
    new_status,
    notes
  )
  VALUES (
    p_purchase_id,
    'standalone_purchase',
    auth.uid(),
    'reject_payment_voucher',
    v_previous_status,
    v_previous_status,
    v_reason
  );

  PERFORM public.log_standalone_admin_action(
    p_purchase_id,
    auth.uid(),
    'reject_payment_voucher',
    v_previous_status,
    v_previous_status,
    v_reason,
    jsonb_build_object('voucher_type', v_voucher_type)
  );

  RETURN jsonb_build_object(
    'success', true,
    'purchaseId', p_purchase_id,
    'previousStatus', v_previous_status,
    'newStatus', v_previous_status,
    'voucherType', v_voucher_type,
    'reason', v_reason,
    'userId', v_purchase.user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_standalone_tracking_code(
  p_purchase_id uuid,
  p_tracking_code text,
  p_mark_shipped boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_purchase public.standalone_purchases%ROWTYPE;
  v_previous_status text;
  v_new_status text;
  v_tracking_code text := btrim(COALESCE(p_tracking_code, ''));
BEGIN
  IF public.current_user_role()::text NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF p_purchase_id IS NULL THEN
    RAISE EXCEPTION 'PURCHASE_ID_REQUIRED';
  END IF;

  IF v_tracking_code = '' THEN
    RAISE EXCEPTION 'TRACKING_CODE_REQUIRED';
  END IF;

  IF char_length(v_tracking_code) > 100 THEN
    RAISE EXCEPTION 'TRACKING_CODE_TOO_LONG';
  END IF;

  IF v_tracking_code ~ '[<>]' OR v_tracking_code ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'INVALID_TRACKING_CODE';
  END IF;

  SELECT *
    INTO v_purchase
    FROM public.standalone_purchases
   WHERE id = p_purchase_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PURCHASE_NOT_FOUND';
  END IF;

  v_previous_status := v_purchase.status::text;

  IF v_previous_status IN ('cancelled', 'delivered', 'completed') THEN
    RAISE EXCEPTION 'FINAL_STATUS:%', v_previous_status;
  END IF;

  IF COALESCE(p_mark_shipped, false)
     AND v_previous_status NOT IN ('balance_paid', 'in_production', 'shipped') THEN
    RAISE EXCEPTION 'INVALID_STATUS:%', v_previous_status;
  END IF;

  v_new_status := CASE
    WHEN COALESCE(p_mark_shipped, false) THEN 'shipped'
    ELSE v_previous_status
  END;

  UPDATE public.standalone_purchases
     SET tracking_code = v_tracking_code,
         status = v_new_status::public.purchase_status,
         shipped_at = CASE
           WHEN COALESCE(p_mark_shipped, false) THEN COALESCE(shipped_at, now())
           ELSE shipped_at
         END,
         updated_at = now()
   WHERE id = p_purchase_id;

  PERFORM public.log_standalone_admin_action(
    p_purchase_id,
    auth.uid(),
    'update_tracking_code',
    v_previous_status,
    v_new_status,
    CASE
      WHEN COALESCE(p_mark_shipped, false) THEN 'Tracking code updated and purchase marked shipped'
      ELSE 'Tracking code updated'
    END,
    jsonb_build_object(
      'tracking_code', v_tracking_code,
      'mark_shipped', COALESCE(p_mark_shipped, false)
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'purchaseId', p_purchase_id,
    'previousStatus', v_previous_status,
    'newStatus', v_new_status,
    'trackingCode', v_tracking_code
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_standalone_fulfillment_status(
  p_purchase_id uuid,
  p_new_status text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_purchase public.standalone_purchases%ROWTYPE;
  v_previous_status text;
  v_new_status text := lower(btrim(COALESCE(p_new_status, '')));
  v_notes text := left(NULLIF(btrim(COALESCE(p_notes, '')), ''), 1000);
BEGIN
  IF public.current_user_role()::text NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF p_purchase_id IS NULL THEN
    RAISE EXCEPTION 'PURCHASE_ID_REQUIRED';
  END IF;

  IF v_new_status NOT IN ('in_production', 'shipped', 'delivered', 'completed') THEN
    RAISE EXCEPTION 'INVALID_TARGET_STATUS:%', v_new_status;
  END IF;

  SELECT *
    INTO v_purchase
    FROM public.standalone_purchases
   WHERE id = p_purchase_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PURCHASE_NOT_FOUND';
  END IF;

  v_previous_status := v_purchase.status::text;

  IF v_previous_status IN ('cancelled', 'completed') THEN
    RAISE EXCEPTION 'FINAL_STATUS:%', v_previous_status;
  END IF;

  IF NOT (
    (v_previous_status = 'balance_paid' AND v_new_status IN ('in_production', 'shipped')) OR
    (v_previous_status = 'in_production' AND v_new_status = 'shipped') OR
    (v_previous_status = 'shipped' AND v_new_status = 'delivered') OR
    (v_previous_status = 'delivered' AND v_new_status = 'completed')
  ) THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION:%:%', v_previous_status, v_new_status;
  END IF;

  IF v_new_status = 'shipped' AND COALESCE(NULLIF(btrim(v_purchase.tracking_code), ''), '') = '' THEN
    RAISE EXCEPTION 'TRACKING_CODE_REQUIRED';
  END IF;

  UPDATE public.standalone_purchases
     SET status = v_new_status::public.purchase_status,
         shipped_at = CASE
           WHEN v_new_status = 'shipped' THEN COALESCE(shipped_at, now())
           ELSE shipped_at
         END,
         actual_delivery_date = CASE
           WHEN v_new_status IN ('delivered', 'completed') THEN COALESCE(actual_delivery_date, current_date)
           ELSE actual_delivery_date
         END,
         updated_at = now()
   WHERE id = p_purchase_id;

  PERFORM public.log_standalone_admin_action(
    p_purchase_id,
    auth.uid(),
    'update_fulfillment_status',
    v_previous_status,
    v_new_status,
    COALESCE(v_notes, 'Fulfillment status updated'),
    jsonb_build_object('target_status', v_new_status)
  );

  RETURN jsonb_build_object(
    'success', true,
    'purchaseId', p_purchase_id,
    'previousStatus', v_previous_status,
    'newStatus', v_new_status
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_standalone_admin_action(uuid, uuid, text, text, text, text, jsonb)
  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ordax_is_holiday(date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ordax_is_business_day(date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ordax_add_business_days(timestamptz, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_standalone_tracking_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_mark_standalone_production_complete(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_approve_standalone_payment_voucher(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_reject_standalone_payment_voucher(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_standalone_tracking_code(uuid, text, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_standalone_fulfillment_status(uuid, text, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.log_standalone_admin_action(uuid, uuid, text, text, text, text, jsonb)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ordax_is_holiday(date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ordax_is_business_day(date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ordax_add_business_days(timestamptz, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_standalone_tracking_code() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_mark_standalone_production_complete(uuid)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_approve_standalone_payment_voucher(uuid, text)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_reject_standalone_payment_voucher(uuid, text, text)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_standalone_tracking_code(uuid, text, boolean)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_standalone_fulfillment_status(uuid, text, text)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_mark_standalone_production_complete(uuid) IS
  'Admin-only standalone production completion transition with server-side business-day deadline calculation.';
COMMENT ON FUNCTION public.admin_approve_standalone_payment_voucher(uuid, text) IS
  'Admin-only standalone voucher approval transition and audit logging.';
COMMENT ON FUNCTION public.admin_reject_standalone_payment_voucher(uuid, text, text) IS
  'Admin-only standalone voucher rejection with audit logging.';
COMMENT ON FUNCTION public.admin_update_standalone_tracking_code(uuid, text, boolean) IS
  'Admin-only standalone tracking update with validation and optional shipped transition.';
COMMENT ON FUNCTION public.admin_update_standalone_fulfillment_status(uuid, text, text) IS
  'Admin-only standalone post-payment fulfillment transition with server-side validation and audit logging.';
COMMENT ON TRIGGER sync_standalone_purchase_financial_columns ON public.standalone_purchases IS
  'Synchronizes canonical standalone purchase fields with legacy aliases.';

NOTIFY pgrst, 'reload schema';
