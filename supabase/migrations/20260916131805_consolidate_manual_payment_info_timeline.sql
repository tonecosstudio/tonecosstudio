CREATE OR REPLACE FUNCTION public.audit_manual_payment_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
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
  ELSIF NEW.status::text = 'requires_info' THEN
    SELECT pir.message
      INTO v_notes
      FROM public.payment_info_requests pir
     WHERE pir.payment_id = NEW.id
     ORDER BY pir.created_at DESC, pir.id DESC
     LIMIT 1;
  END IF;

  INSERT INTO public.order_status_history(
    order_id,
    order_type,
    old_status,
    new_status,
    changed_by,
    changed_by_name,
    notes,
    created_at
  )
  VALUES(
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_request_manual_payment_info(
  p_payment_id uuid,
  p_message text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
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

  IF v_payment.status::text = 'requires_info' THEN
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
      p_payment_id,
      'manual_payment',
      'requires_info',
      'requires_info',
      auth.uid(),
      COALESCE(v_admin_name, 'Admin'),
      v_message,
      now()
    );
  END IF;

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
$function$;

NOTIFY pgrst, 'reload schema';
