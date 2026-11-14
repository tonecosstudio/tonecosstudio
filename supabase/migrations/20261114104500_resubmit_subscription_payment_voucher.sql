BEGIN;

-- A rejected proof must be replaceable on its original subscription/payment.
-- This avoids duplicate subscriptions or a second charge for the same plan.
CREATE OR REPLACE FUNCTION private_api.resubmit_subscription_payment_voucher_for_current_user(
  p_subscription_id uuid,
  p_payment_voucher_path text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_subscription public.subscriptions%ROWTYPE;
  v_payment public.manual_payments%ROWTYPE;
  v_updated public.subscriptions%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE = '28000';
  END IF;

  IF p_subscription_id IS NULL THEN
    RAISE EXCEPTION 'SUBSCRIPTION_ID_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF p_payment_voucher_path IS NULL
     OR p_payment_voucher_path !~ (
       '^subscriptions/' || v_user_id::text || '/[0-9]{10,16}-[0-9a-f]{16}\.(jpg|jpeg|png|pdf)$'
     ) THEN
    RAISE EXCEPTION 'SUBSCRIPTION_VOUCHER_PATH_INVALID' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_subscription
    FROM public.subscriptions
   WHERE id = p_subscription_id
     AND user_id = v_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUBSCRIPTION_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_subscription.status::text <> 'pending_payment'
     OR v_subscription.payment_status::text <> 'rejected' THEN
    RAISE EXCEPTION 'SUBSCRIPTION_VOUCHER_RESUBMISSION_NOT_ALLOWED' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_payment
    FROM public.manual_payments
   WHERE subscription_id = v_subscription.id
     AND user_id = v_user_id
   ORDER BY created_at DESC
   LIMIT 1
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUBSCRIPTION_PAYMENT_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.subscriptions
     SET payment_voucher_path = p_payment_voucher_path,
         payment_voucher_url = NULL,
         payment_status = 'under_review',
         payment_rejection_reason = NULL,
         notes = 'Comprovante atualizado pelo cliente e aguardando conferência',
         updated_at = now()
   WHERE id = v_subscription.id
   RETURNING * INTO v_updated;

  UPDATE public.manual_payments
     SET status = 'under_review'::public.payment_status,
         rejection_reason = NULL,
         notes = 'Novo comprovante enviado pelo cliente para revisão',
         updated_at = now()
   WHERE id = v_payment.id
   RETURNING * INTO v_payment;

  RETURN jsonb_build_object(
    'subscription', to_jsonb(v_updated),
    'payment', to_jsonb(v_payment)
  );
END;
$function$;

REVOKE ALL ON FUNCTION private_api.resubmit_subscription_payment_voucher_for_current_user(uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private_api.resubmit_subscription_payment_voucher_for_current_user(uuid, text)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.resubmit_subscription_payment_voucher_for_current_user(
  p_subscription_id uuid,
  p_payment_voucher_path text
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private_api, pg_temp
AS $function$
  SELECT private_api.resubmit_subscription_payment_voucher_for_current_user(
    p_subscription_id,
    p_payment_voucher_path
  );
$function$;

REVOKE ALL ON FUNCTION public.resubmit_subscription_payment_voucher_for_current_user(uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resubmit_subscription_payment_voucher_for_current_user(uuid, text)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.resubmit_subscription_payment_voucher_for_current_user(uuid, text) IS
  'Lets a customer replace a rejected private payment voucher on the original subscription and payment.';

NOTIFY pgrst, 'reload schema';

COMMIT;
