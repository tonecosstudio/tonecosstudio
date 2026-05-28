-- Server-side cutoff and admin standalone cancellation primitives.
-- Keeps capacity release and status updates atomic and removes frontend capacity mutation.

CREATE OR REPLACE FUNCTION public.is_before_cutoff(
  p_now timestamptz DEFAULT now()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT timezone('America/Sao_Paulo', p_now)
       <= (
            date_trunc('month', timezone('America/Sao_Paulo', p_now))
            + interval '14 days 23 hours 59 minutes 59 seconds 999 milliseconds'
          );
$$;

ALTER TABLE public.standalone_purchases ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE public.standalone_purchases ADD COLUMN IF NOT EXISTS cancellation_reason text;

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

REVOKE EXECUTE ON FUNCTION public.is_before_cutoff(timestamptz) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_cancel_standalone_purchase(uuid, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_before_cutoff(timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_cancel_standalone_purchase(uuid, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.is_before_cutoff(timestamptz) IS
  'Returns true when the current Sao Paulo time is before the monthly cutoff.';
COMMENT ON FUNCTION public.admin_cancel_standalone_purchase(uuid, text) IS
  'Admin-only atomic standalone cancellation with server-side capacity release.';
