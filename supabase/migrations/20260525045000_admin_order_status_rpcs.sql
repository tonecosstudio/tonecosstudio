-- Admin order status RPCs
-- Validates small admin status/date updates at the database boundary.

CREATE OR REPLACE FUNCTION public.assert_admin_access()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role'
    AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_manual_payment_status(
  p_payment_id uuid,
  p_status text,
  p_rejection_reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status text := NULLIF(btrim(COALESCE(p_status, '')), '');
  v_reason text := NULLIF(btrim(COALESCE(p_rejection_reason, '')), '');
  v_result_id uuid;
BEGIN
  PERFORM public.assert_admin_access();

  IF v_status NOT IN ('pending', 'under_review', 'requires_info', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid manual payment status' USING ERRCODE = '22023';
  END IF;

  IF v_reason IS NOT NULL AND (length(v_reason) > 1000 OR v_reason ~ '<[^>]*>') THEN
    RAISE EXCEPTION 'Invalid rejection reason' USING ERRCODE = '22023';
  END IF;

  IF v_status = 'rejected' AND v_reason IS NULL THEN
    RAISE EXCEPTION 'Rejection reason is required' USING ERRCODE = '22023';
  END IF;

  UPDATE public.manual_payments
  SET
    status = v_status,
    rejection_reason = CASE WHEN v_status = 'rejected' THEN v_reason ELSE rejection_reason END,
    approved_at = CASE WHEN v_status = 'approved' THEN now() ELSE approved_at END,
    approved_by = CASE WHEN v_status = 'approved' THEN auth.uid() ELSE approved_by END,
    updated_at = now()
  WHERE id = p_payment_id
  RETURNING id INTO v_result_id;

  IF v_result_id IS NULL THEN
    RAISE EXCEPTION 'Manual payment not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_quote_status(
  p_quote_id uuid,
  p_status text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status text := NULLIF(btrim(COALESCE(p_status, '')), '');
  v_result_id uuid;
BEGIN
  PERFORM public.assert_admin_access();

  IF v_status NOT IN ('pending', 'reviewing', 'answered', 'archived', 'approved', 'rejected', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid quote status' USING ERRCODE = '22023';
  END IF;

  UPDATE public.quotes
  SET
    status = v_status,
    updated_at = now()
  WHERE id = p_quote_id
  RETURNING id INTO v_result_id;

  IF v_result_id IS NULL THEN
    RAISE EXCEPTION 'Quote not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_subscription_delivery_dates(
  p_delivery_id uuid,
  p_actual_delivery_date timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result_id uuid;
BEGIN
  PERFORM public.assert_admin_access();

  UPDATE public.subscription_deliveries
  SET
    actual_delivery_date = p_actual_delivery_date,
    updated_at = now()
  WHERE id = p_delivery_id
  RETURNING id INTO v_result_id;

  IF v_result_id IS NULL THEN
    RAISE EXCEPTION 'Subscription delivery not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_quote_tracking_code(
  p_quote_id uuid,
  p_tracking_code text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tracking_code text := NULLIF(btrim(COALESCE(p_tracking_code, '')), '');
  v_result_id uuid;
BEGIN
  PERFORM public.assert_admin_access();

  IF v_tracking_code IS NULL
    OR length(v_tracking_code) > 100
    OR v_tracking_code ~ '[[:cntrl:]<>]' THEN
    RAISE EXCEPTION 'Invalid tracking code' USING ERRCODE = '22023';
  END IF;

  UPDATE public.quotes
  SET
    tracking_code = v_tracking_code,
    updated_at = now()
  WHERE id = p_quote_id
  RETURNING id INTO v_result_id;

  IF v_result_id IS NULL THEN
    RAISE EXCEPTION 'Quote not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result_id;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_admin_access() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_manual_payment_status(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_quote_status(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_subscription_delivery_dates(uuid, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_quote_tracking_code(uuid, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.assert_admin_access() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_manual_payment_status(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_quote_status(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_subscription_delivery_dates(uuid, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_quote_tracking_code(uuid, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_update_manual_payment_status(uuid, text, text) IS
  'Admin-only validated manual payment status update.';
COMMENT ON FUNCTION public.admin_update_quote_status(uuid, text) IS
  'Admin-only validated quote status update.';
COMMENT ON FUNCTION public.admin_update_subscription_delivery_dates(uuid, timestamptz) IS
  'Admin-only validated subscription delivery date update.';
COMMENT ON FUNCTION public.admin_update_quote_tracking_code(uuid, text) IS
  'Admin-only validated quote tracking code update.';

NOTIFY pgrst, 'reload schema';
