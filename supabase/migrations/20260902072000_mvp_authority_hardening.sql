BEGIN;

-- MVP authority hardening: browser sessions may read their own state, but they
-- must not author commercial truth or arbitrary notification content.

-- ---------------------------------------------------------------------------
-- Notifications: keep read-state mutation narrow and server-own admin alerts.
-- ---------------------------------------------------------------------------

REVOKE UPDATE ON TABLE public.user_notifications FROM authenticated;
GRANT UPDATE (is_read, read_at, updated_at)
  ON TABLE public.user_notifications
  TO authenticated;

REVOKE UPDATE ON TABLE public.admin_notifications FROM authenticated;
GRANT UPDATE (is_read, read_at, updated_at)
  ON TABLE public.admin_notifications
  TO authenticated;

CREATE OR REPLACE FUNCTION public.create_admin_notification(
  p_type TEXT DEFAULT 'info',
  p_title TEXT DEFAULT 'Notificacao',
  p_message TEXT DEFAULT '',
  p_priority TEXT DEFAULT 'medium',
  p_icon TEXT DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_related_id UUID DEFAULT NULL,
  p_related_type TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_recipient_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_notification_id UUID;
  v_admin_user RECORD;
  v_action_url TEXT := NULLIF(btrim(p_action_url), '');
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Trusted server required to create admin notifications'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_safe_in_app_path(v_action_url) THEN
    RAISE EXCEPTION 'Unsafe notification action URL' USING ERRCODE = '22023';
  END IF;

  IF char_length(COALESCE(p_title, '')) > 160
     OR char_length(COALESCE(p_message, '')) > 2000 THEN
    RAISE EXCEPTION 'Notification content is too long' USING ERRCODE = '22023';
  END IF;

  IF COALESCE(p_priority, '') NOT IN ('low', 'medium', 'high', 'urgent') THEN
    RAISE EXCEPTION 'Invalid notification priority' USING ERRCODE = '22023';
  END IF;

  IF p_recipient_user_id IS NOT NULL THEN
    INSERT INTO public.admin_notifications (
      type,
      title,
      message,
      priority,
      icon,
      action_url,
      related_id,
      related_type,
      metadata,
      recipient_user_id
    ) VALUES (
      p_type,
      p_title,
      p_message,
      p_priority,
      p_icon,
      v_action_url,
      p_related_id,
      p_related_type,
      COALESCE(p_metadata, '{}'::jsonb),
      p_recipient_user_id
    )
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
  END IF;

  FOR v_admin_user IN
    SELECT id
    FROM public.profiles
    WHERE role IN ('admin', 'super_admin')
  LOOP
    INSERT INTO public.admin_notifications (
      type,
      title,
      message,
      priority,
      icon,
      action_url,
      related_id,
      related_type,
      metadata,
      recipient_user_id
    ) VALUES (
      p_type,
      p_title,
      p_message,
      p_priority,
      p_icon,
      v_action_url,
      p_related_id,
      p_related_type,
      COALESCE(p_metadata, '{}'::jsonb),
      v_admin_user.id
    )
    RETURNING id INTO v_notification_id;
  END LOOP;

  RETURN v_notification_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_admin_notification(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, JSONB, UUID
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_admin_notification(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, JSONB, UUID
) TO service_role;

-- ---------------------------------------------------------------------------
-- Public system settings: the table is currently public-readable by design.
-- Refuse secret-like keys both retrospectively (migration gate) and on writes.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.system_settings
    WHERE lower(key) ~ '(secret|token|password|private[ _-]?key|service[ _-]?role|credential|api[ _-]?key)'
  ) THEN
    RAISE EXCEPTION
      'Refusing MVP authority migration: public.system_settings contains a secret-like key';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_system_settings(p_updates jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_api, pg_temp
AS $$
DECLARE
  v_key text;
  v_value text;
  v_count integer := 0;
  v_price_full numeric;
  v_price_pix numeric;
  v_deposit numeric;
  v_production_min integer;
  v_production_max integer;
BEGIN
  PERFORM public.assert_admin_access();

  IF p_updates IS NULL OR jsonb_typeof(p_updates) <> 'object' THEN
    RAISE EXCEPTION 'Settings update payload must be an object' USING ERRCODE = '22023';
  END IF;

  FOR v_key, v_value IN
    SELECT key, value
    FROM jsonb_each_text(p_updates)
  LOOP
    v_key := public.admin_validate_setting_key(v_key);

    IF lower(v_key) ~ '(secret|token|password|private[ _-]?key|service[ _-]?role|credential|api[ _-]?key)' THEN
      RAISE EXCEPTION 'Secret-like system setting keys are forbidden in public.system_settings: %', v_key
        USING ERRCODE = '42501';
    END IF;

    v_value := private_api.validate_critical_system_setting(v_key, v_value);

    INSERT INTO public.system_settings (key, value, updated_at)
    VALUES (v_key, v_value, now())
    ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value,
          updated_at = now();

    v_count := v_count + 1;
  END LOOP;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'No settings supplied' USING ERRCODE = '22023';
  END IF;

  SELECT value::numeric
    INTO v_price_full
    FROM public.system_settings
   WHERE key = 'default_price_full'
     AND value ~ '^[0-9]+([.][0-9]+)?$';

  SELECT value::numeric
    INTO v_price_pix
    FROM public.system_settings
   WHERE key = 'default_price_pix'
     AND value ~ '^[0-9]+([.][0-9]+)?$';

  SELECT value::numeric
    INTO v_deposit
    FROM public.system_settings
   WHERE key = 'default_deposit_amount'
     AND value ~ '^[0-9]+([.][0-9]+)?$';

  IF v_price_full IS NOT NULL AND v_price_pix IS NOT NULL AND v_price_pix > v_price_full THEN
    RAISE EXCEPTION 'PIX price cannot exceed full price' USING ERRCODE = '22023';
  END IF;

  IF v_deposit IS NOT NULL
     AND v_price_full IS NOT NULL
     AND v_price_pix IS NOT NULL
     AND v_deposit > LEAST(v_price_full, v_price_pix) THEN
    RAISE EXCEPTION 'Deposit cannot exceed configured sale prices' USING ERRCODE = '22023';
  END IF;

  SELECT value::integer
    INTO v_production_min
    FROM public.system_settings
   WHERE key = 'production_days_min'
     AND value ~ '^[0-9]+$';

  SELECT value::integer
    INTO v_production_max
    FROM public.system_settings
   WHERE key = 'production_days_max'
     AND value ~ '^[0-9]+$';

  IF v_production_min IS NOT NULL
     AND v_production_max IS NOT NULL
     AND v_production_max < v_production_min THEN
    RAISE EXCEPTION 'production_days_max cannot be lower than production_days_min' USING ERRCODE = '22023';
  END IF;

  RETURN jsonb_build_object('updated', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_upsert_system_settings(jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_system_settings(jsonb)
  TO service_role;

-- ---------------------------------------------------------------------------
-- Commercial authority: all creation must pass through server-authoritative
-- functions that derive price/state from canonical database records.
-- ---------------------------------------------------------------------------

REVOKE INSERT ON TABLE public.standalone_purchases FROM authenticated;
DROP POLICY IF EXISTS standalone_purchases_insert_own ON public.standalone_purchases;

REVOKE INSERT ON TABLE public.subscriptions FROM authenticated;
DROP POLICY IF EXISTS subscriptions_insert_own ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_insert_own_pending_checkout ON public.subscriptions;

REVOKE EXECUTE ON FUNCTION public.create_manual_payment_for_current_user(
  uuid, uuid, uuid, numeric, text, text
) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_quote_payment_for_current_user(uuid, numeric)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.activate_subscription_credit_for_current_user(text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cancel_subscription_credit_with_refund(text)
  FROM PUBLIC, anon, authenticated;

-- Preserve the old private implementations only for trusted server-side
-- compatibility; browser sessions must not execute them directly.
REVOKE EXECUTE ON FUNCTION private_api.create_manual_payment_for_current_user(
  uuid, uuid, uuid, numeric, text, text
) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private_api.notify_quote_payment_for_current_user(uuid, numeric)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private_api.activate_subscription_credit_for_current_user(text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private_api.cancel_subscription_credit_with_refund(text)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_manual_payment_for_current_user(
  uuid, uuid, uuid, numeric, text, text
) TO service_role;
GRANT EXECUTE ON FUNCTION public.notify_quote_payment_for_current_user(uuid, numeric)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.activate_subscription_credit_for_current_user(text, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_subscription_credit_with_refund(text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.admin_close_subscription_credit_production_cycle(
  p_cycle_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cycle_id text := public.subscription_credit_validate_text(
    p_cycle_id,
    'cycle_id',
    80,
    true,
    false
  );
  v_cycle public.subscription_credit_production_cycles%ROWTYPE;
  v_order public.subscription_credit_orders%ROWTYPE;
  v_credits public.subscription_credit_user_credits%ROWTYPE;
  v_total_debited integer := 0;
  v_confirmed integer := 0;
  v_pending integer := 0;
BEGIN
  PERFORM public.assert_admin_access();

  SELECT *
  INTO v_cycle
  FROM public.subscription_credit_production_cycles
  WHERE id::text = v_cycle_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Production cycle not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_cycle.status = 'closed' THEN
    RAISE EXCEPTION 'Production cycle is already closed' USING ERRCODE = '22023';
  END IF;

  FOR v_order IN
    SELECT *
    FROM public.subscription_credit_orders
    WHERE production_cycle_id = v_cycle.id
      AND order_type = 'automatic'
      AND credits_debited = false
    ORDER BY created_at ASC
    FOR UPDATE
  LOOP
    SELECT *
    INTO v_credits
    FROM public.subscription_credit_user_credits
    WHERE user_id = v_order.user_id
      AND subscription_id = v_order.subscription_id
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF FOUND AND v_credits.available_credits >= v_order.total_credits THEN
      UPDATE public.subscription_credit_user_credits
      SET used_credits = used_credits + v_order.total_credits,
          available_credits = available_credits - v_order.total_credits
      WHERE id = v_credits.id;

      UPDATE public.subscription_credit_orders
      SET credits_debited = true,
          status = 'confirmed',
          is_locked = true,
          locked_at = COALESCE(locked_at, now())
      WHERE id = v_order.id;

      INSERT INTO public.subscription_credit_transactions (
        user_id,
        subscription_id,
        transaction_type,
        credits_amount,
        order_id,
        production_cycle_id,
        description
      ) VALUES (
        v_order.user_id,
        v_order.subscription_id,
        'debit_cycle_close',
        -v_order.total_credits,
        v_order.id,
        v_cycle.id,
        concat('Debito no fechamento do ciclo - ', v_order.total_credits, ' creditos')
      );

      v_total_debited := v_total_debited + v_order.total_credits;
      v_confirmed := v_confirmed + 1;
    ELSE
      UPDATE public.subscription_credit_orders
      SET status = 'cancelled',
          is_locked = true,
          locked_at = COALESCE(locked_at, now())
      WHERE id = v_order.id;

      v_pending := v_pending + 1;
    END IF;
  END LOOP;

  UPDATE public.subscription_credit_production_cycles
  SET status = 'closed',
      closed_at = now()
  WHERE id = v_cycle.id;

  RETURN jsonb_build_object(
    'cycleId', v_cycle.id::text,
    'confirmedOrders', v_confirmed,
    'pendingOrders', v_pending,
    'totalCreditsDebited', v_total_debited
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_close_subscription_credit_production_cycle(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_close_subscription_credit_production_cycle(text)
  TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
