-- Admin order history and manual payment notification RPCs.

CREATE TABLE IF NOT EXISTS public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  order_type text NOT NULL,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_by_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_status_history
  ADD COLUMN IF NOT EXISTS order_id uuid,
  ADD COLUMN IF NOT EXISTS order_type text,
  ADD COLUMN IF NOT EXISTS old_status text,
  ADD COLUMN IF NOT EXISTS new_status text,
  ADD COLUMN IF NOT EXISTS changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS changed_by_name text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_order_status_history_order
  ON public.order_status_history(order_id, order_type);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created_at
  ON public.order_status_history(created_at DESC);

CREATE TABLE IF NOT EXISTS public.payment_info_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.manual_payments(id) ON DELETE CASCADE,
  requested_by_admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  requested_by_admin_name text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_info_requests
  ADD COLUMN IF NOT EXISTS payment_id uuid REFERENCES public.manual_payments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS requested_by_admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS requested_by_admin_name text,
  ADD COLUMN IF NOT EXISTS message text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_payment_info_requests_payment_id
  ON public.payment_info_requests(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_info_requests_status
  ON public.payment_info_requests(status);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_info_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.order_status_history FROM anon;
REVOKE ALL ON TABLE public.payment_info_requests FROM anon;
GRANT SELECT, INSERT ON TABLE public.order_status_history TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.payment_info_requests TO authenticated;

DROP POLICY IF EXISTS "order_status_history_select_admin" ON public.order_status_history;
CREATE POLICY "order_status_history_select_admin"
  ON public.order_status_history
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "order_status_history_insert_admin" ON public.order_status_history;
CREATE POLICY "order_status_history_insert_admin"
  ON public.order_status_history
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "payment_info_requests_select_admin_or_owner" ON public.payment_info_requests;
CREATE POLICY "payment_info_requests_select_admin_or_owner"
  ON public.payment_info_requests
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.manual_payments mp
      WHERE mp.id = payment_info_requests.payment_id
        AND mp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "payment_info_requests_admin_manage" ON public.payment_info_requests;
CREATE POLICY "payment_info_requests_admin_manage"
  ON public.payment_info_requests
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.admin_validate_order_text(
  p_value text,
  p_label text,
  p_max_length integer,
  p_required boolean DEFAULT true
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_value text := NULLIF(btrim(COALESCE(p_value, '')), '');
  v_control_check text;
BEGIN
  IF v_value IS NULL THEN
    IF p_required THEN
      RAISE EXCEPTION '% is required', p_label USING ERRCODE = '22023';
    END IF;

    RETURN NULL;
  END IF;

  v_control_check := translate(v_value, E'\n\r\t', '');

  IF length(v_value) > p_max_length OR v_control_check ~ '[[:cntrl:]]' OR v_value ~ '[<>]' THEN
    RAISE EXCEPTION 'Invalid %', p_label USING ERRCODE = '22023';
  END IF;

  RETURN v_value;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_insert_user_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_related_id uuid DEFAULT NULL,
  p_related_type text DEFAULT NULL,
  p_priority text DEFAULT 'medium'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_type text := public.admin_validate_order_text(p_type, 'notification type', 80);
  v_title text := public.admin_validate_order_text(p_title, 'notification title', 160);
  v_message text := public.admin_validate_order_text(p_message, 'notification message', 1000);
  v_related_type text := public.admin_validate_order_text(p_related_type, 'related type', 80, false);
  v_priority text := COALESCE(NULLIF(btrim(p_priority), ''), 'medium');
  v_notification_id uuid;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User is required' USING ERRCODE = '22023';
  END IF;

  IF v_priority NOT IN ('low', 'medium', 'high', 'urgent') THEN
    RAISE EXCEPTION 'Invalid notification priority' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.user_notifications (
    user_id,
    type,
    title,
    message,
    related_id,
    related_type,
    priority,
    is_read,
    created_at
  )
  VALUES (
    p_user_id,
    v_type,
    v_title,
    v_message,
    p_related_id,
    v_related_type,
    v_priority,
    false,
    now()
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

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

CREATE OR REPLACE FUNCTION public.admin_request_manual_payment_info(
  p_payment_id uuid,
  p_message text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payment public.manual_payments%ROWTYPE;
  v_message text := public.admin_validate_order_text(p_message, 'request message', 1000);
  v_admin_name text;
BEGIN
  PERFORM public.assert_admin_access();

  SELECT *
  INTO v_payment
  FROM public.manual_payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Manual payment not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(full_name, email, 'Admin')
  INTO v_admin_name
  FROM public.profiles
  WHERE id = auth.uid();

  INSERT INTO public.payment_info_requests (
    payment_id,
    requested_by_admin_id,
    requested_by_admin_name,
    message,
    status,
    updated_at
  )
  VALUES (
    p_payment_id,
    auth.uid(),
    COALESCE(v_admin_name, 'Admin'),
    v_message,
    'pending',
    now()
  );

  PERFORM public.admin_insert_user_notification(
    v_payment.user_id,
    'payment_info_request',
    'Informacoes adicionais necessarias',
    format(
      'Precisamos de mais informacoes sobre seu pagamento (Ref: %s). %s',
      COALESCE(v_payment.reference_number, p_payment_id::text),
      v_message
    ),
    p_payment_id,
    'manual_payment',
    'high'
  );

  UPDATE public.manual_payments
  SET status = 'requires_info',
      updated_at = now()
  WHERE id = p_payment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_approve_manual_payment_with_notification(p_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payment public.manual_payments%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  SELECT *
  INTO v_payment
  FROM public.manual_payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Manual payment not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_payment.status = 'approved' THEN
    RAISE EXCEPTION 'Manual payment is already approved' USING ERRCODE = '22023';
  END IF;

  IF v_payment.status = 'rejected' THEN
    RAISE EXCEPTION 'Rejected manual payment cannot be approved' USING ERRCODE = '22023';
  END IF;

  UPDATE public.manual_payments
  SET status = 'approved',
      approved_at = now(),
      approved_by = auth.uid(),
      rejection_reason = NULL,
      updated_at = now()
  WHERE id = p_payment_id;

  PERFORM public.admin_insert_user_notification(
    v_payment.user_id,
    'payment_approved',
    'Pagamento aprovado',
    format(
      'Seu pagamento (Ref: %s) foi aprovado com sucesso!',
      COALESCE(v_payment.reference_number, p_payment_id::text)
    ),
    p_payment_id,
    'manual_payment',
    'medium'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_manual_payment_with_notification(
  p_payment_id uuid,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payment public.manual_payments%ROWTYPE;
  v_reason text := public.admin_validate_order_text(p_reason, 'rejection reason', 1000);
BEGIN
  PERFORM public.assert_admin_access();

  SELECT *
  INTO v_payment
  FROM public.manual_payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Manual payment not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_payment.status = 'approved' THEN
    RAISE EXCEPTION 'Approved manual payment cannot be rejected' USING ERRCODE = '22023';
  END IF;

  IF v_payment.status = 'rejected' THEN
    RAISE EXCEPTION 'Manual payment is already rejected' USING ERRCODE = '22023';
  END IF;

  UPDATE public.manual_payments
  SET status = 'rejected',
      rejection_reason = v_reason,
      updated_at = now()
  WHERE id = p_payment_id;

  PERFORM public.admin_insert_user_notification(
    v_payment.user_id,
    'payment_rejected',
    'Pagamento rejeitado',
    format(
      'Seu pagamento (Ref: %s) foi rejeitado. Motivo: %s',
      COALESCE(v_payment.reference_number, p_payment_id::text),
      v_reason
    ),
    p_payment_id,
    'manual_payment',
    'high'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_validate_order_text(text, text, integer, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_insert_user_notification(uuid, text, text, text, uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_record_order_status_history(uuid, text, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_request_manual_payment_info(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_approve_manual_payment_with_notification(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_reject_manual_payment_with_notification(uuid, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_record_order_status_history(uuid, text, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_insert_user_notification(uuid, text, text, text, uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_request_manual_payment_info(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_approve_manual_payment_with_notification(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_reject_manual_payment_with_notification(uuid, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_record_order_status_history(uuid, text, text, text, text) IS
  'Admin-only order status history insert.';
COMMENT ON FUNCTION public.admin_insert_user_notification(uuid, text, text, text, uuid, text, text) IS
  'Admin-only user notification insert with text validation.';
COMMENT ON FUNCTION public.admin_request_manual_payment_info(uuid, text) IS
  'Admin-only manual payment info request with user notification and status transition.';
COMMENT ON FUNCTION public.admin_approve_manual_payment_with_notification(uuid) IS
  'Admin-only manual payment approval with user notification.';
COMMENT ON FUNCTION public.admin_reject_manual_payment_with_notification(uuid, text) IS
  'Admin-only manual payment rejection with user notification.';

NOTIFY pgrst, 'reload schema';
