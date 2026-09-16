-- Canonical authority boundary: browser sessions may read RLS-governed state and
-- update only notification read-state. Commercial/admin truth is server-authored.

-- User notifications: server authors content; user keeps read-state and existing own-delete semantics.
REVOKE UPDATE ON TABLE public.user_notifications FROM authenticated;
GRANT UPDATE (is_read, read_at) ON TABLE public.user_notifications TO authenticated;
REVOKE INSERT ON TABLE public.user_notifications FROM authenticated;
DROP POLICY IF EXISTS user_notifications_insert_admin ON public.user_notifications;
REVOKE EXECUTE ON FUNCTION public.create_user_notification(uuid,text,text,text,text,text,uuid,text,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_notification(uuid,text,text,text,text,text,uuid,text,jsonb)
  TO service_role;

-- Admin notifications: browser admins may only mark existing alerts read/unread.
REVOKE UPDATE ON TABLE public.admin_notifications FROM authenticated;
GRANT UPDATE (is_read, read_at, updated_at) ON TABLE public.admin_notifications TO authenticated;

CREATE OR REPLACE FUNCTION public.create_admin_notification(
  p_type text DEFAULT 'info',
  p_title text DEFAULT 'Notificacao',
  p_message text DEFAULT '',
  p_priority text DEFAULT 'medium',
  p_icon text DEFAULT NULL,
  p_action_url text DEFAULT NULL,
  p_related_id uuid DEFAULT NULL,
  p_related_type text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_recipient_user_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_notification_id uuid;
  v_admin_user record;
  v_action_url text := NULLIF(btrim(p_action_url), '');
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'TRUSTED_SERVER_REQUIRED' USING ERRCODE = '42501';
  END IF;
  IF NOT public.is_safe_in_app_path(v_action_url) THEN
    RAISE EXCEPTION 'UNSAFE_NOTIFICATION_ACTION_URL' USING ERRCODE = '22023';
  END IF;
  IF char_length(COALESCE(p_title, '')) > 160 OR char_length(COALESCE(p_message, '')) > 2000 THEN
    RAISE EXCEPTION 'NOTIFICATION_CONTENT_TOO_LONG' USING ERRCODE = '22023';
  END IF;
  IF COALESCE(p_priority, '') NOT IN ('low', 'medium', 'high', 'urgent') THEN
    RAISE EXCEPTION 'INVALID_NOTIFICATION_PRIORITY' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(COALESCE(p_metadata, '{}'::jsonb)) <> 'object' THEN
    RAISE EXCEPTION 'NOTIFICATION_METADATA_MUST_BE_OBJECT' USING ERRCODE = '22023';
  END IF;

  IF p_recipient_user_id IS NOT NULL THEN
    INSERT INTO public.admin_notifications (
      type,title,message,priority,icon,action_url,related_id,related_type,metadata,recipient_user_id
    ) VALUES (
      p_type,p_title,p_message,p_priority,p_icon,v_action_url,p_related_id,p_related_type,
      COALESCE(p_metadata, '{}'::jsonb),p_recipient_user_id
    ) RETURNING id INTO v_notification_id;
    RETURN v_notification_id;
  END IF;

  FOR v_admin_user IN
    SELECT id FROM public.profiles WHERE role IN ('admin', 'super_admin')
  LOOP
    INSERT INTO public.admin_notifications (
      type,title,message,priority,icon,action_url,related_id,related_type,metadata,recipient_user_id
    ) VALUES (
      p_type,p_title,p_message,p_priority,p_icon,v_action_url,p_related_id,p_related_type,
      COALESCE(p_metadata, '{}'::jsonb),v_admin_user.id
    ) RETURNING id INTO v_notification_id;
  END LOOP;

  RETURN v_notification_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_admin_notification(text,text,text,text,text,text,uuid,text,jsonb,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_admin_notification(text,text,text,text,text,text,uuid,text,jsonb,uuid)
  TO service_role;

-- public.system_settings is not a secret store. Validate critical commercial/operational values server-side.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.system_settings
    WHERE lower(key) ~ '(secret|token|password|private[ _-]?key|service[ _-]?role|credential|api[ _-]?key)'
  ) THEN
    RAISE EXCEPTION 'SECRET_LIKE_KEY_PRESENT_IN_PUBLIC_SYSTEM_SETTINGS';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION private_api.validate_critical_system_setting(p_key text, p_value text)
RETURNS text
LANGUAGE plpgsql
SET search_path = public, private_api, pg_temp
AS $$
DECLARE
  v_key text := lower(NULLIF(btrim(COALESCE(p_key, '')), ''));
  v_value text := public.admin_validate_setting_value(p_value, 4000);
  v_numeric numeric;
  v_integer integer;
BEGIN
  IF lower(COALESCE(v_key, '')) ~ '(secret|token|password|private[ _-]?key|service[ _-]?role|credential|api[ _-]?key)' THEN
    RAISE EXCEPTION 'SECRET_LIKE_SYSTEM_SETTING_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF v_key IN ('default_price_full','default_price_pix','default_deposit_amount','pix_discount_percentage') THEN
    IF v_value !~ '^[0-9]+([.][0-9]+)?$' THEN
      RAISE EXCEPTION 'INVALID_NUMERIC_SYSTEM_SETTING: %', v_key USING ERRCODE = '22023';
    END IF;
    v_numeric := v_value::numeric;
    IF v_key IN ('default_price_full','default_price_pix') AND v_numeric <= 0 THEN
      RAISE EXCEPTION 'SYSTEM_SETTING_MUST_BE_POSITIVE: %', v_key USING ERRCODE = '22023';
    END IF;
    IF v_key = 'default_deposit_amount' AND v_numeric < 0 THEN
      RAISE EXCEPTION 'SYSTEM_SETTING_CANNOT_BE_NEGATIVE: %', v_key USING ERRCODE = '22023';
    END IF;
    IF v_key = 'pix_discount_percentage' AND (v_numeric < 0 OR v_numeric > 100) THEN
      RAISE EXCEPTION 'PIX_DISCOUNT_OUT_OF_RANGE' USING ERRCODE = '22023';
    END IF;
  ELSIF v_key IN (
    'max_installments_no_interest','max_installments_with_interest','monthly_production_limit',
    'production_days_min','production_days_max','shipping_business_days','sales_duration_days',
    'delivery_interval_days','character_choice_days','balance_payment_days','exchange_deadline_days',
    'days_to_next_delivery'
  ) THEN
    IF v_value !~ '^[0-9]+$' THEN
      RAISE EXCEPTION 'INVALID_INTEGER_SYSTEM_SETTING: %', v_key USING ERRCODE = '22023';
    END IF;
    v_integer := v_value::integer;
    IF v_key = 'exchange_deadline_days' THEN
      IF v_integer < 0 OR v_integer > 365 THEN RAISE EXCEPTION 'EXCHANGE_DEADLINE_OUT_OF_RANGE' USING ERRCODE='22023'; END IF;
    ELSIF v_integer < 1 THEN
      RAISE EXCEPTION 'SYSTEM_SETTING_MUST_BE_POSITIVE: %', v_key USING ERRCODE='22023';
    END IF;
    IF v_key IN ('max_installments_no_interest','max_installments_with_interest') AND v_integer > 100 THEN RAISE EXCEPTION 'INSTALLMENT_COUNT_OUT_OF_RANGE' USING ERRCODE='22023'; END IF;
    IF v_key = 'monthly_production_limit' AND v_integer > 100000 THEN RAISE EXCEPTION 'MONTHLY_PRODUCTION_LIMIT_OUT_OF_RANGE' USING ERRCODE='22023'; END IF;
    IF v_key = 'shipping_business_days' AND v_integer > 31 THEN RAISE EXCEPTION 'SHIPPING_DAYS_OUT_OF_RANGE' USING ERRCODE='22023'; END IF;
    IF v_key IN ('character_choice_days','balance_payment_days') AND v_integer > 365 THEN RAISE EXCEPTION 'OPERATIONAL_DEADLINE_OUT_OF_RANGE: %',v_key USING ERRCODE='22023'; END IF;
    IF v_key IN ('production_days_min','production_days_max','sales_duration_days','delivery_interval_days','days_to_next_delivery') AND v_integer > 3650 THEN RAISE EXCEPTION 'OPERATIONAL_DURATION_OUT_OF_RANGE: %',v_key USING ERRCODE='22023'; END IF;
  END IF;
  RETURN v_value;
END;
$$;
REVOKE ALL ON FUNCTION private_api.validate_critical_system_setting(text,text)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_upsert_system_settings(p_updates jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_api, pg_temp
AS $$
DECLARE
  v_key text; v_value text; v_count integer := 0;
  v_price_full numeric; v_price_pix numeric; v_deposit numeric;
  v_production_min integer; v_production_max integer;
BEGIN
  PERFORM public.assert_admin_access();
  IF p_updates IS NULL OR jsonb_typeof(p_updates) <> 'object' THEN
    RAISE EXCEPTION 'SETTINGS_PAYLOAD_MUST_BE_OBJECT' USING ERRCODE='22023';
  END IF;
  FOR v_key,v_value IN SELECT key,value FROM jsonb_each_text(p_updates) LOOP
    v_key := public.admin_validate_setting_key(v_key);
    v_value := private_api.validate_critical_system_setting(v_key,v_value);
    INSERT INTO public.system_settings(key,value,updated_at) VALUES(v_key,v_value,now())
    ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=now();
    v_count := v_count + 1;
  END LOOP;
  IF v_count = 0 THEN RAISE EXCEPTION 'NO_SETTINGS_SUPPLIED' USING ERRCODE='22023'; END IF;

  SELECT value::numeric INTO v_price_full FROM public.system_settings WHERE key='default_price_full' AND value ~ '^[0-9]+([.][0-9]+)?$';
  SELECT value::numeric INTO v_price_pix FROM public.system_settings WHERE key='default_price_pix' AND value ~ '^[0-9]+([.][0-9]+)?$';
  SELECT value::numeric INTO v_deposit FROM public.system_settings WHERE key='default_deposit_amount' AND value ~ '^[0-9]+([.][0-9]+)?$';
  IF v_price_full IS NOT NULL AND v_price_pix IS NOT NULL AND v_price_pix > v_price_full THEN RAISE EXCEPTION 'PIX_PRICE_EXCEEDS_FULL_PRICE' USING ERRCODE='22023'; END IF;
  IF v_deposit IS NOT NULL AND v_price_full IS NOT NULL AND v_price_pix IS NOT NULL AND v_deposit > LEAST(v_price_full,v_price_pix) THEN RAISE EXCEPTION 'DEPOSIT_EXCEEDS_SALE_PRICE' USING ERRCODE='22023'; END IF;
  SELECT value::integer INTO v_production_min FROM public.system_settings WHERE key='production_days_min' AND value ~ '^[0-9]+$';
  SELECT value::integer INTO v_production_max FROM public.system_settings WHERE key='production_days_max' AND value ~ '^[0-9]+$';
  IF v_production_min IS NOT NULL AND v_production_max IS NOT NULL AND v_production_max < v_production_min THEN RAISE EXCEPTION 'PRODUCTION_DAY_RANGE_INVALID' USING ERRCODE='22023'; END IF;
  RETURN jsonb_build_object('updated',v_count);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_upsert_system_settings(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_system_settings(jsonb) TO service_role;

-- Commercial truth: no browser DML.
REVOKE INSERT,UPDATE,DELETE ON TABLE public.payment_links FROM authenticated;
REVOKE INSERT,UPDATE,DELETE ON TABLE public.quote_payments FROM authenticated;
REVOKE INSERT,UPDATE,DELETE ON TABLE public.quotes FROM authenticated;
REVOKE INSERT,UPDATE,DELETE ON TABLE public.standalone_purchases FROM authenticated;
REVOKE INSERT,UPDATE,DELETE ON TABLE public.subscriptions FROM authenticated;
REVOKE INSERT,UPDATE,DELETE ON TABLE public.manual_payments FROM authenticated;
DROP POLICY IF EXISTS standalone_purchases_insert_own ON public.standalone_purchases;
DROP POLICY IF EXISTS subscriptions_insert_own ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_insert_own_pending_checkout ON public.subscriptions;

REVOKE INSERT,UPDATE,DELETE ON TABLE public.order_status_history FROM authenticated;
REVOKE INSERT,UPDATE,DELETE ON TABLE public.payment_info_requests FROM authenticated;
DROP POLICY IF EXISTS "order_status_history_insert_admin" ON public.order_status_history;
DROP POLICY IF EXISTS "payment_info_requests_admin_manage" ON public.payment_info_requests;
GRANT SELECT ON TABLE public.order_status_history TO authenticated;
GRANT SELECT ON TABLE public.payment_info_requests TO authenticated;

REVOKE INSERT,UPDATE,DELETE ON TABLE public.admin_payment_methods FROM authenticated;
DROP POLICY IF EXISTS "Admins can manage payment methods" ON public.admin_payment_methods;
DROP POLICY IF EXISTS "Admins can view all payment methods" ON public.admin_payment_methods;
CREATE POLICY "Admins can view all payment methods"
  ON public.admin_payment_methods FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin','super_admin'));
GRANT SELECT ON TABLE public.admin_payment_methods TO authenticated;

REVOKE INSERT,UPDATE,DELETE ON TABLE public.production_photo_metadata FROM authenticated;

-- Manual-payment status audit is in the same transaction as the state mutation.
CREATE OR REPLACE FUNCTION public.audit_manual_payment_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_actor_id uuid := auth.uid(); v_actor_name text; v_notes text;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
  IF v_actor_id IS NOT NULL THEN
    SELECT COALESCE(full_name,email) INTO v_actor_name FROM public.profiles WHERE id=v_actor_id;
  END IF;
  IF NEW.status::text='rejected' THEN v_notes:=NULLIF(btrim(COALESCE(NEW.rejection_reason,'')),''); END IF;
  INSERT INTO public.order_status_history(order_id,order_type,old_status,new_status,changed_by,changed_by_name,notes,created_at)
  VALUES(NEW.id,'manual_payment',OLD.status::text,NEW.status::text,v_actor_id,COALESCE(v_actor_name,CASE WHEN v_actor_id IS NULL THEN 'System' ELSE 'Admin' END),v_notes,now());
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.audit_manual_payment_status_transition() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS audit_manual_payment_status_transition ON public.manual_payments;
CREATE TRIGGER audit_manual_payment_status_transition
AFTER UPDATE OF status ON public.manual_payments
FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.audit_manual_payment_status_transition();

CREATE OR REPLACE FUNCTION public.admin_record_order_status_history(
  p_order_id uuid,p_order_type text,p_old_status text,p_new_status text,p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order_type text:=public.admin_validate_order_text(p_order_type,'order type',80);
  v_old_status text:=public.admin_validate_order_text(p_old_status,'old status',80,false);
  v_new_status text:=public.admin_validate_order_text(p_new_status,'new status',80);
  v_notes text:=public.admin_validate_order_text(p_notes,'history notes',1000,false);
  v_admin_name text; v_history_id uuid;
BEGIN
  PERFORM public.assert_admin_access();
  IF v_order_type NOT IN ('standalone_purchase','subscription_delivery','manual_payment','quote') THEN RAISE EXCEPTION 'INVALID_ORDER_TYPE' USING ERRCODE='22023'; END IF;
  IF v_order_type='manual_payment' THEN
    SELECT id INTO v_history_id FROM public.order_status_history
    WHERE order_id=p_order_id AND order_type='manual_payment'
      AND old_status IS NOT DISTINCT FROM v_old_status AND new_status=v_new_status
    ORDER BY created_at DESC LIMIT 1;
    RETURN v_history_id;
  END IF;
  SELECT COALESCE(full_name,email,'Admin') INTO v_admin_name FROM public.profiles WHERE id=auth.uid();
  INSERT INTO public.order_status_history(order_id,order_type,old_status,new_status,changed_by,changed_by_name,notes,created_at)
  VALUES(p_order_id,v_order_type,v_old_status,v_new_status,auth.uid(),COALESCE(v_admin_name,'Admin'),v_notes,now())
  RETURNING id INTO v_history_id;
  RETURN v_history_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_record_order_status_history(uuid,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_record_order_status_history(uuid,text,text,text,text) TO service_role;

NOTIFY pgrst, 'reload schema';
