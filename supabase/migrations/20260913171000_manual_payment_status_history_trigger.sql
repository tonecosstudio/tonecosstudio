BEGIN;

-- Manual-payment status history must be written in the same database transaction
-- as the status mutation. This removes the old browser-side best-effort gap where
-- a payment could change successfully while its audit row failed afterwards.

CREATE OR REPLACE FUNCTION public.audit_manual_payment_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_actor_name text;
  v_notes text;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF v_actor_id IS NOT NULL THEN
    SELECT COALESCE(full_name, email)
      INTO v_actor_name
      FROM public.profiles
     WHERE id = v_actor_id;
  END IF;

  IF NEW.status::text = 'rejected' THEN
    v_notes := NULLIF(btrim(COALESCE(NEW.rejection_reason, '')), '');
  END IF;

  INSERT INTO public.order_status_history (
    order_id,
    order_type,
    old_status,
    new_status,
    changed_by,
    changed_by_name,
    notes,
    created_at
  )
  VALUES (
    NEW.id,
    'manual_payment',
    OLD.status::text,
    NEW.status::text,
    v_actor_id,
    COALESCE(v_actor_name, CASE WHEN v_actor_id IS NULL THEN 'System' ELSE 'Admin' END),
    v_notes,
    now()
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_manual_payment_status_transition()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS audit_manual_payment_status_transition
  ON public.manual_payments;
CREATE TRIGGER audit_manual_payment_status_transition
AFTER UPDATE OF status ON public.manual_payments
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.audit_manual_payment_status_transition();

-- The generic order-history RPC remains authoritative for other order types.
-- For manual payments, the trigger above already owns the write. Returning the
-- matching trigger-created row keeps legacy callers idempotent and prevents a
-- duplicate audit event while those callers are phased out.
CREATE OR REPLACE FUNCTION public.admin_record_order_status_history(
  p_order_id uuid,
  p_order_type text,
  p_old_status text,
  p_new_status text,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order_type text := public.admin_validate_order_text(p_order_type, 'order type', 80);
  v_old_status text := public.admin_validate_order_text(p_old_status, 'old status', 80, false);
  v_new_status text := public.admin_validate_order_text(p_new_status, 'new status', 80);
  v_notes text := public.admin_validate_order_text(p_notes, 'history notes', 1000, false);
  v_admin_name text;
  v_history_id uuid;
BEGIN
  PERFORM public.assert_admin_access();

  IF v_order_type NOT IN ('standalone_purchase', 'subscription_delivery', 'manual_payment', 'quote') THEN
    RAISE EXCEPTION 'Invalid order type' USING ERRCODE = '22023';
  END IF;

  IF v_order_type = 'manual_payment' THEN
    SELECT id
      INTO v_history_id
      FROM public.order_status_history
     WHERE order_id = p_order_id
       AND order_type = 'manual_payment'
       AND old_status IS NOT DISTINCT FROM v_old_status
       AND new_status = v_new_status
     ORDER BY created_at DESC
     LIMIT 1;

    RETURN v_history_id;
  END IF;

  SELECT COALESCE(full_name, email, 'Admin')
    INTO v_admin_name
    FROM public.profiles
   WHERE id = auth.uid();

  INSERT INTO public.order_status_history (
    order_id,
    order_type,
    old_status,
    new_status,
    changed_by,
    changed_by_name,
    notes,
    created_at
  )
  VALUES (
    p_order_id,
    v_order_type,
    v_old_status,
    v_new_status,
    auth.uid(),
    COALESCE(v_admin_name, 'Admin'),
    v_notes,
    now()
  )
  RETURNING id INTO v_history_id;

  RETURN v_history_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_record_order_status_history(uuid, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_record_order_status_history(uuid, text, text, text, text)
  TO service_role;

COMMIT;
