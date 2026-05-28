-- Atomic cancellation for overdue standalone purchases.
-- Keeps status changes and capacity release in one database transaction.

ALTER TABLE public.standalone_purchases ADD COLUMN IF NOT EXISTS balance_due_date timestamptz;
ALTER TABLE public.standalone_purchases ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE public.standalone_purchases ADD COLUMN IF NOT EXISTS cancellation_reason text;

DO $$
DECLARE
  value text;
BEGIN
  IF to_regtype('public.purchase_status') IS NOT NULL THEN
    FOREACH value IN ARRAY ARRAY['deposit_paid', 'awaiting_balance', 'balance_paid'] LOOP
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

CREATE OR REPLACE FUNCTION public.cancel_standalone_purchase_for_non_payment(
  p_purchase_id uuid,
  p_now timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_purchase public.standalone_purchases%ROWTYPE;
  v_cancelled_at timestamptz := now();
  v_reason text := 'Balance payment not received within deadline (Arras Confirmatorias)';
  v_capacity_released boolean := false;
  v_rows integer := 0;
BEGIN
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

  IF v_purchase.status::text <> 'awaiting_balance' THEN
    RAISE EXCEPTION 'INVALID_STATUS:%', v_purchase.status::text;
  END IF;

  IF v_purchase.balance_due_date IS NULL THEN
    RAISE EXCEPTION 'BALANCE_DUE_DATE_REQUIRED';
  END IF;

  IF p_now <= v_purchase.balance_due_date THEN
    RAISE EXCEPTION 'BALANCE_DEADLINE_NOT_PASSED';
  END IF;

  IF v_purchase.cycle_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
        FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'cycles'
         AND column_name = 'used_capacity'
    ) THEN
      EXECUTE
        'UPDATE public.cycles
            SET used_capacity = GREATEST(COALESCE(used_capacity, 0) - 1, 0),
                updated_at = now()
          WHERE id = $1'
        USING v_purchase.cycle_id;
    ELSIF EXISTS (
      SELECT 1
        FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'cycles'
         AND column_name = 'capacity_current'
    ) THEN
      EXECUTE
        'UPDATE public.cycles
            SET capacity_current = GREATEST(COALESCE(capacity_current, 0) - 1, 0),
                updated_at = now()
          WHERE id = $1'
        USING v_purchase.cycle_id;
    ELSIF EXISTS (
      SELECT 1
        FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'cycles'
         AND column_name = 'reserved_capacity'
    ) THEN
      EXECUTE
        'UPDATE public.cycles
            SET reserved_capacity = GREATEST(COALESCE(reserved_capacity, 0) - 1, 0),
                updated_at = now()
          WHERE id = $1'
        USING v_purchase.cycle_id;
    ELSE
      RAISE EXCEPTION 'CYCLE_CAPACITY_COLUMN_NOT_FOUND';
    END IF;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows <> 1 THEN
      RAISE EXCEPTION 'CYCLE_NOT_FOUND';
    END IF;

    v_capacity_released := true;
  END IF;

  UPDATE public.standalone_purchases
     SET status = 'cancelled',
         cancelled_at = v_cancelled_at,
         cancellation_reason = v_reason,
         updated_at = now()
   WHERE id = p_purchase_id;

  RETURN jsonb_build_object(
    'success', true,
    'purchaseId', p_purchase_id,
    'status', 'cancelled',
    'cancellationReason', v_reason,
    'capacityReleased', v_capacity_released,
    'cancelledAt', v_cancelled_at
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cancel_standalone_purchase_for_non_payment(uuid, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_standalone_purchase_for_non_payment(uuid, timestamptz)
  TO service_role;

COMMENT ON FUNCTION public.cancel_standalone_purchase_for_non_payment(uuid, timestamptz) IS
  'Atomically cancels an overdue standalone purchase and releases cycle capacity.';
