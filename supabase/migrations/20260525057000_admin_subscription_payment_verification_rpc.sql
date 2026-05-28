-- Admin subscription payment verification RPC.
-- Keeps subscription payment approval/rejection and audit logging inside one
-- database boundary.

DO $$
DECLARE
  value text;
BEGIN
  IF to_regtype('public.subscription_status') IS NOT NULL THEN
    FOREACH value IN ARRAY ARRAY['pending_payment'] LOOP
      IF NOT EXISTS (
        SELECT 1
          FROM pg_enum
         WHERE enumtypid = to_regtype('public.subscription_status')
           AND enumlabel = value
      ) THEN
        EXECUTE format('ALTER TYPE public.subscription_status ADD VALUE %L', value);
      END IF;
    END LOOP;
  END IF;
END $$;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS payment_voucher_url text,
  ADD COLUMN IF NOT EXISTS payment_rejection_reason text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'subscriptions_payment_rejection_reason_safe'
       AND conrelid = 'public.subscriptions'::regclass
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_payment_rejection_reason_safe
      CHECK (
        payment_rejection_reason IS NULL
        OR (
          length(payment_rejection_reason) <= 1000
          AND payment_rejection_reason !~ '[<>]'
        )
      ) NOT VALID;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.admin_verify_subscription_payment_voucher(
  p_subscription_id uuid,
  p_approved boolean,
  p_rejection_reason text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_admin_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_subscription public.subscriptions%ROWTYPE;
  v_updated public.subscriptions%ROWTYPE;
  v_admin_user_id uuid;
  v_previous_status text;
  v_new_status text;
  v_reason text;
  v_notes text;
  v_action_type text;
  v_audit_notes text;
BEGIN
  PERFORM public.assert_admin_access();

  IF COALESCE(auth.role(), '') = 'service_role' THEN
    v_admin_user_id := COALESCE(p_admin_user_id, auth.uid());
  ELSE
    v_admin_user_id := auth.uid();
  END IF;

  IF v_admin_user_id IS NULL THEN
    RAISE EXCEPTION 'ADMIN_USER_ID_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF p_subscription_id IS NULL THEN
    RAISE EXCEPTION 'SUBSCRIPTION_ID_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF p_approved IS NULL THEN
    RAISE EXCEPTION 'APPROVAL_DECISION_REQUIRED' USING ERRCODE = '22023';
  END IF;

  v_notes := public.admin_validate_order_text(p_notes, 'notes', 1000, false);

  SELECT *
    INTO v_subscription
    FROM public.subscriptions
   WHERE id = p_subscription_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUBSCRIPTION_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  v_previous_status := v_subscription.status::text;

  IF v_previous_status IN ('cancelled', 'expired') THEN
    RAISE EXCEPTION 'INVALID_SUBSCRIPTION_STATUS:%', v_previous_status USING ERRCODE = '22023';
  END IF;

  IF p_approved THEN
    v_new_status := 'active';
    v_action_type := 'approve_payment_voucher';
    v_audit_notes := COALESCE(v_notes, 'Approved subscription payment voucher');

    UPDATE public.subscriptions
       SET status = 'active',
           payment_status = 'paid',
           payment_rejection_reason = NULL,
           started_at = COALESCE(started_at, now()),
           updated_at = now()
     WHERE id = p_subscription_id
     RETURNING * INTO v_updated;
  ELSE
    v_reason := public.admin_validate_order_text(p_rejection_reason, 'rejection reason', 500);
    v_new_status := v_previous_status;
    v_action_type := 'reject_payment_voucher';
    v_audit_notes := concat('Rejected: ', v_reason, COALESCE(' | ' || v_notes, ''));

    UPDATE public.subscriptions
       SET payment_voucher_url = NULL,
           payment_rejection_reason = v_reason,
           payment_status = 'rejected',
           updated_at = now()
     WHERE id = p_subscription_id
     RETURNING * INTO v_updated;
  END IF;

  INSERT INTO public.payment_verification_audit_logs (
    order_id,
    order_type,
    admin_user_id,
    action_type,
    previous_status,
    new_status,
    notes,
    created_at
  )
  VALUES (
    p_subscription_id,
    'subscription',
    v_admin_user_id,
    v_action_type,
    v_previous_status,
    v_new_status,
    v_audit_notes,
    now()
  );

  RETURN jsonb_build_object(
    'subscription', to_jsonb(v_updated),
    'previousStatus', v_previous_status,
    'newStatus', v_new_status,
    'approved', p_approved
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_verify_subscription_payment_voucher(uuid, boolean, text, text, uuid)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_verify_subscription_payment_voucher(uuid, boolean, text, text, uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_verify_subscription_payment_voucher(uuid, boolean, text, text, uuid) IS
  'Admin-only subscription payment voucher approval/rejection with validation and audit logging.';

NOTIFY pgrst, 'reload schema';
