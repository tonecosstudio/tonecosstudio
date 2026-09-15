-- Keep payment evidence private and bind every voucher path to the authenticated owner.
-- The browser stores only the object path. Access to the object itself remains governed by
-- storage.objects RLS; no public or long-lived signed URL is persisted for new checkouts.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-vouchers',
  'payment-vouchers',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Remove policy names previously documented by the component. They were too broad
-- (including public read) and must never coexist with the hardened policies below.
DROP POLICY IF EXISTS "Allow authenticated users to upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own files" ON storage.objects;

DROP POLICY IF EXISTS "payment_vouchers_select_owner_or_admin" ON storage.objects;
DROP POLICY IF EXISTS "payment_vouchers_insert_owner" ON storage.objects;
DROP POLICY IF EXISTS "payment_vouchers_delete_owner_or_admin" ON storage.objects;

CREATE POLICY "payment_vouchers_select_owner_or_admin"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'payment-vouchers'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR (
        split_part(storage.objects.name, '/', 1) = 'subscriptions'
        AND split_part(storage.objects.name, '/', 2) = auth.uid()::text
      )
    )
  );

CREATE POLICY "payment_vouchers_insert_owner"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'payment-vouchers'
    AND split_part(storage.objects.name, '/', 1) = 'subscriptions'
    AND split_part(storage.objects.name, '/', 2) = auth.uid()::text
    AND split_part(storage.objects.name, '/', 3) ~
      '^[0-9]{10,16}-[0-9a-f]{16}\.(jpg|jpeg|png|pdf)$'
    AND split_part(storage.objects.name, '/', 4) = ''
  );

CREATE POLICY "payment_vouchers_delete_owner_or_admin"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'payment-vouchers'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR (
        split_part(storage.objects.name, '/', 1) = 'subscriptions'
        AND split_part(storage.objects.name, '/', 2) = auth.uid()::text
      )
    )
  );

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS payment_voucher_path text;

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_payment_voucher_path_safe;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_payment_voucher_path_safe
  CHECK (
    payment_voucher_path IS NULL
    OR (
      length(payment_voucher_path) <= 512
      AND payment_voucher_path ~
        '^subscriptions/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9]{10,16}-[0-9a-f]{16}\.(jpg|jpeg|png|pdf)$'
    )
  ) NOT VALID;

-- Preserve the hardened architecture introduced in 20260622071444:
-- the privileged body lives in private_api and public remains SECURITY INVOKER.
CREATE OR REPLACE FUNCTION private_api.create_subscription_checkout_for_current_user(
  p_plan_id uuid,
  p_collection_id uuid,
  p_payment_method text,
  p_payment_voucher_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_payment_method text := lower(NULLIF(btrim(COALESCE(p_payment_method, '')), ''));
  -- Kept under the legacy parameter name to preserve the RPC signature. The value is now
  -- a private storage object path, not a URL.
  v_voucher_path text := NULLIF(btrim(COALESCE(p_payment_voucher_url, '')), '');
  v_plan record;
  v_collection record;
  v_amount numeric;
  v_payment_status text;
  v_notes text;
  v_reference text;
  v_subscription public.subscriptions%ROWTYPE;
  v_payment public.manual_payments%ROWTYPE;
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

  IF v_voucher_path IS NOT NULL AND (
    length(v_voucher_path) > 512
    OR v_voucher_path !~
      '^subscriptions/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9]{10,16}-[0-9a-f]{16}\.(jpg|jpeg|png|pdf)$'
    OR split_part(v_voucher_path, '/', 2) <> v_user_id::text
  ) THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_VOUCHER_PATH' USING ERRCODE = '22023';
  END IF;

  SELECT id, name, description, plan_type, price_pix, price_full, deliveries_total, is_active
    INTO v_plan
    FROM public.subscription_plans
   WHERE id = p_plan_id
     AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUBSCRIPTION_PLAN_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  SELECT id
    INTO v_collection
    FROM public.collections
   WHERE id = p_collection_id
     AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUBSCRIPTION_COLLECTION_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.subscriptions
     WHERE user_id = v_user_id
       AND collection_id = p_collection_id
       AND status::text IN ('active', 'pending_payment')
  ) THEN
    RAISE EXCEPTION 'SUBSCRIPTION_CHECKOUT_EXISTS' USING ERRCODE = '22023';
  END IF;

  v_amount := CASE v_payment_method
    WHEN 'pix' THEN COALESCE(v_plan.price_pix, 0)::numeric
    ELSE COALESCE(v_plan.price_full, 0)::numeric
  END;

  IF v_amount <= 0 THEN
    RAISE EXCEPTION 'SUBSCRIPTION_PRICE_NOT_CONFIGURED' USING ERRCODE = '22023';
  END IF;

  v_payment_status := CASE WHEN v_voucher_path IS NULL THEN 'pending' ELSE 'under_review' END;
  v_notes := CASE
    WHEN v_voucher_path IS NULL THEN NULL
    ELSE 'Comprovante armazenado em Storage privado'
  END;
  v_reference := public.generate_payment_reference();

  INSERT INTO public.subscriptions (
    user_id,
    plan_id,
    plan_type,
    status,
    payment_status,
    collection_id,
    payment_method,
    total_paid,
    deliveries_total,
    notes,
    payment_voucher_path,
    payment_voucher_url
  )
  VALUES (
    v_user_id,
    v_plan.id,
    v_plan.plan_type,
    'pending_payment',
    'pending',
    v_collection.id,
    v_payment_method,
    v_amount,
    COALESCE(v_plan.deliveries_total, 0),
    v_notes,
    v_voucher_path,
    NULL
  )
  RETURNING * INTO v_subscription;

  INSERT INTO public.manual_payments (
    reference_number,
    user_id,
    amount,
    currency,
    reference_type,
    reference_id,
    subscription_id,
    payment_type,
    status,
    payment_method,
    notes
  )
  VALUES (
    v_reference,
    v_user_id,
    v_amount,
    'BRL',
    'subscription',
    v_subscription.id::text,
    v_subscription.id,
    'recurring',
    v_payment_status,
    v_payment_method,
    v_notes
  )
  RETURNING * INTO v_payment;

  UPDATE public.subscriptions
     SET payment_id = v_payment.id::text,
         updated_at = now()
   WHERE id = v_subscription.id
   RETURNING * INTO v_subscription;

  RETURN jsonb_build_object(
    'subscription', to_jsonb(v_subscription),
    'payment', to_jsonb(v_payment)
  );
END;
$$;

REVOKE ALL ON FUNCTION private_api.create_subscription_checkout_for_current_user(uuid, uuid, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private_api.create_subscription_checkout_for_current_user(uuid, uuid, text, text)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.create_subscription_checkout_for_current_user(
  p_plan_id uuid,
  p_collection_id uuid,
  p_payment_method text,
  p_payment_voucher_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $function$
  SELECT private_api.create_subscription_checkout_for_current_user(
    p_plan_id,
    p_collection_id,
    p_payment_method,
    p_payment_voucher_url
  );
$function$;

REVOKE ALL ON FUNCTION public.create_subscription_checkout_for_current_user(uuid, uuid, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_subscription_checkout_for_current_user(uuid, uuid, text, text)
  TO authenticated, service_role;

-- The admin verifier remains admin-gated as in the existing migration. It accepts the new
-- private path, while legacy records with a pre-existing URL remain reviewable instead of
-- becoming orphaned during rollout.
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

  IF v_subscription.payment_voucher_path IS NULL
     AND v_subscription.payment_voucher_url IS NULL THEN
    RAISE EXCEPTION 'SUBSCRIPTION_VOUCHER_REQUIRED' USING ERRCODE = '22023';
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
       SET payment_voucher_path = NULL,
           payment_voucher_url = NULL,
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

COMMENT ON COLUMN public.subscriptions.payment_voucher_path IS
  'Private payment-vouchers object path owned by the subscription user. Never a public URL.';
COMMENT ON FUNCTION public.create_subscription_checkout_for_current_user(uuid, uuid, text, text) IS
  'Invoker wrapper for private checkout; new vouchers must be owned private storage paths.';

NOTIFY pgrst, 'reload schema';
