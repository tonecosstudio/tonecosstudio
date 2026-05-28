-- Support conversation, reminder, and profile payment mutation RPCs.
-- Keeps customer/admin writes behind validated SECURITY DEFINER boundaries.

ALTER TABLE public.support_conversations
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS promised_date timestamptz,
  ADD COLUMN IF NOT EXISTS risk_flags text[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_support_conversations_assigned_to
  ON public.support_conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_conversations_promised_date
  ON public.support_conversations(promised_date)
  WHERE promised_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_conversations_risk_flags
  ON public.support_conversations USING GIN(risk_flags);

CREATE TABLE IF NOT EXISTS public.conversation_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  reminder_type text NOT NULL CHECK (reminder_type IN ('quote_followup', 'payment_pending', 'promised_date')),
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.conversation_reminders
  ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS reminder_type text,
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_conversation_reminders_due
  ON public.conversation_reminders(scheduled_for)
  WHERE is_active = true AND sent_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_conversation_reminders_conversation_id
  ON public.conversation_reminders(conversation_id);

ALTER TABLE public.conversation_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversation_reminders_select_admin" ON public.conversation_reminders;
CREATE POLICY "conversation_reminders_select_admin"
  ON public.conversation_reminders FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS set_updated_at_conversation_reminders ON public.conversation_reminders;
CREATE TRIGGER set_updated_at_conversation_reminders
  BEFORE UPDATE ON public.conversation_reminders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.support_validate_text(
  p_value text,
  p_field_name text,
  p_max_length integer,
  p_required boolean DEFAULT true,
  p_allow_multiline boolean DEFAULT false
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_value text := NULLIF(btrim(COALESCE(p_value, '')), '');
BEGIN
  IF v_value IS NULL THEN
    IF p_required THEN
      RAISE EXCEPTION '% is required', p_field_name USING ERRCODE = '22023';
    END IF;

    RETURN NULL;
  END IF;

  IF length(v_value) > p_max_length THEN
    RAISE EXCEPTION '% is too long', p_field_name USING ERRCODE = '22023';
  END IF;

  IF p_allow_multiline THEN
    IF translate(v_value, E'\n\r\t', '') ~ '[[:cntrl:]]' THEN
      RAISE EXCEPTION 'Invalid %', p_field_name USING ERRCODE = '22023';
    END IF;
  ELSIF v_value ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'Invalid %', p_field_name USING ERRCODE = '22023';
  END IF;

  RETURN v_value;
END;
$$;

CREATE OR REPLACE FUNCTION public.support_jsonb_text_array(
  p_value jsonb,
  p_field_name text
)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result text[];
BEGIN
  IF p_value IS NULL OR p_value = 'null'::jsonb THEN
    RETURN ARRAY[]::text[];
  END IF;

  IF jsonb_typeof(p_value) <> 'array' THEN
    RAISE EXCEPTION '% must be an array', p_field_name USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(array_agg(NULLIF(btrim(value), '')), ARRAY[]::text[])
  INTO v_result
  FROM jsonb_array_elements_text(p_value) AS value;

  RETURN COALESCE(v_result, ARRAY[]::text[]);
END;
$$;

CREATE OR REPLACE FUNCTION public.support_validate_status(p_status text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status text := lower(NULLIF(btrim(COALESCE(p_status, '')), ''));
BEGIN
  IF v_status IS NULL THEN
    RETURN 'new';
  END IF;

  IF v_status NOT IN ('open', 'new', 'waiting_admin', 'waiting_customer', 'resolved', 'closed') THEN
    RAISE EXCEPTION 'Invalid conversation status' USING ERRCODE = '22023';
  END IF;

  RETURN v_status;
END;
$$;

CREATE OR REPLACE FUNCTION public.support_validate_priority(p_priority text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_priority text := lower(NULLIF(btrim(COALESCE(p_priority, '')), ''));
BEGIN
  IF v_priority IS NULL THEN
    RETURN 'normal';
  END IF;

  IF v_priority NOT IN ('low', 'normal', 'medium', 'high', 'urgent') THEN
    RAISE EXCEPTION 'Invalid conversation priority' USING ERRCODE = '22023';
  END IF;

  RETURN v_priority;
END;
$$;

CREATE OR REPLACE FUNCTION public.support_validate_tags(p_tags text[])
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tags text[];
  v_invalid text;
BEGIN
  SELECT COALESCE(array_agg(DISTINCT lower(tag)), ARRAY[]::text[])
  INTO v_tags
  FROM unnest(COALESCE(p_tags, ARRAY[]::text[])) AS tag
  WHERE tag IS NOT NULL AND btrim(tag) <> '';

  IF cardinality(v_tags) > 10 THEN
    RAISE EXCEPTION 'Too many tags' USING ERRCODE = '22023';
  END IF;

  SELECT tag INTO v_invalid
  FROM unnest(v_tags) AS tag
  WHERE tag NOT IN ('pedido', 'orcamento', 'duvida', 'reclamacao', 'assinatura', 'urgente', 'problema', 'sugestao')
  LIMIT 1;

  IF v_invalid IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid conversation tag' USING ERRCODE = '22023';
  END IF;

  RETURN v_tags;
END;
$$;

CREATE OR REPLACE FUNCTION public.support_validate_risk_flags(p_risk_flags text[])
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_flags text[];
  v_invalid text;
BEGIN
  SELECT COALESCE(array_agg(DISTINCT lower(flag)), ARRAY[]::text[])
  INTO v_flags
  FROM unnest(COALESCE(p_risk_flags, ARRAY[]::text[])) AS flag
  WHERE flag IS NOT NULL AND btrim(flag) <> '';

  IF cardinality(v_flags) > 10 THEN
    RAISE EXCEPTION 'Too many risk flags' USING ERRCODE = '22023';
  END IF;

  SELECT flag INTO v_invalid
  FROM unnest(v_flags) AS flag
  WHERE flag NOT IN ('cliente_conflito', 'atraso_critico', 'pagamento_problema')
  LIMIT 1;

  IF v_invalid IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid risk flag' USING ERRCODE = '22023';
  END IF;

  RETURN v_flags;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_support_conversation(
  p_user_id uuid,
  p_subject text,
  p_status text DEFAULT 'new',
  p_priority text DEFAULT 'normal',
  p_tags text[] DEFAULT ARRAY[]::text[],
  p_order_id uuid DEFAULT NULL,
  p_quote_id uuid DEFAULT NULL,
  p_subscription_id uuid DEFAULT NULL,
  p_payment_id uuid DEFAULT NULL,
  p_first_message text DEFAULT NULL
)
RETURNS public.support_conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_auth_user_id uuid := auth.uid();
  v_is_admin boolean := COALESCE(auth.role(), '') = 'service_role';
  v_subject text := public.support_validate_text(p_subject, 'subject', 180, true, false);
  v_status text := public.support_validate_status(p_status);
  v_priority text := public.support_validate_priority(p_priority);
  v_tags text[] := public.support_validate_tags(p_tags);
  v_first_message text := public.support_validate_text(p_first_message, 'first_message', 2000, false, true);
  v_result public.support_conversations%ROWTYPE;
BEGIN
  IF v_auth_user_id IS NULL AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT v_is_admin AND v_auth_user_id IS NOT NULL THEN
    SELECT public.has_role(v_auth_user_id, 'admin') INTO v_is_admin;
  END IF;

  IF NOT v_is_admin THEN
    IF p_user_id IS DISTINCT FROM v_auth_user_id THEN
      RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
    END IF;

    IF v_status NOT IN ('new', 'waiting_admin') THEN
      RAISE EXCEPTION 'Invalid customer conversation status' USING ERRCODE = '22023';
    END IF;

    IF v_priority NOT IN ('normal', 'medium') THEN
      RAISE EXCEPTION 'Invalid customer conversation priority' USING ERRCODE = '22023';
    END IF;

    IF p_order_id IS NOT NULL
      OR p_quote_id IS NOT NULL
      OR p_subscription_id IS NOT NULL
      OR p_payment_id IS NOT NULL THEN
      RAISE EXCEPTION 'Only admins can attach related records' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF v_first_message IS NOT NULL AND p_user_id IS DISTINCT FROM v_auth_user_id THEN
    RAISE EXCEPTION 'First customer message must be authored by the conversation owner' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.support_conversations (
    user_id,
    subject,
    status,
    priority,
    tags,
    order_id,
    quote_id,
    subscription_id,
    payment_id
  )
  VALUES (
    p_user_id,
    v_subject,
    v_status,
    v_priority,
    v_tags,
    p_order_id,
    p_quote_id,
    p_subscription_id,
    p_payment_id
  )
  RETURNING * INTO v_result;

  IF v_first_message IS NOT NULL THEN
    INSERT INTO public.support_messages (
      conversation_id,
      sender_id,
      sender_type,
      message,
      is_internal,
      read_by_admin,
      read_by_customer
    )
    VALUES (
      v_result.id,
      v_auth_user_id,
      'customer',
      v_first_message,
      false,
      false,
      true
    );
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_support_conversation(
  p_conversation_id uuid,
  p_updates jsonb
)
RETURNS public.support_conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updates jsonb := COALESCE(p_updates, '{}'::jsonb);
  v_unknown_key text;
  v_status text;
  v_priority text;
  v_tags text[];
  v_risk_flags text[];
  v_promised_date timestamptz;
  v_assigned_to uuid;
  v_result public.support_conversations%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  IF jsonb_typeof(v_updates) <> 'object' THEN
    RAISE EXCEPTION 'Updates must be an object' USING ERRCODE = '22023';
  END IF;

  SELECT key INTO v_unknown_key
  FROM jsonb_object_keys(v_updates) AS key
  WHERE key NOT IN ('status', 'priority', 'tags', 'risk_flags', 'promised_date', 'assigned_to')
  LIMIT 1;

  IF v_unknown_key IS NOT NULL THEN
    RAISE EXCEPTION 'Unsupported support conversation field: %', v_unknown_key USING ERRCODE = '22023';
  END IF;

  IF v_updates ? 'status' THEN
    v_status := public.support_validate_status(v_updates->>'status');
  END IF;

  IF v_updates ? 'priority' THEN
    v_priority := public.support_validate_priority(v_updates->>'priority');
  END IF;

  IF v_updates ? 'tags' THEN
    v_tags := public.support_validate_tags(public.support_jsonb_text_array(v_updates->'tags', 'tags'));
  END IF;

  IF v_updates ? 'risk_flags' THEN
    v_risk_flags := public.support_validate_risk_flags(public.support_jsonb_text_array(v_updates->'risk_flags', 'risk_flags'));
  END IF;

  IF v_updates ? 'promised_date' AND v_updates->'promised_date' <> 'null'::jsonb THEN
    v_promised_date := (v_updates->>'promised_date')::timestamptz;
  END IF;

  IF v_updates ? 'assigned_to' AND v_updates->'assigned_to' <> 'null'::jsonb THEN
    v_assigned_to := (v_updates->>'assigned_to')::uuid;

    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_assigned_to) THEN
      RAISE EXCEPTION 'Assignee not found' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  UPDATE public.support_conversations
  SET
    status = CASE WHEN v_updates ? 'status' THEN v_status ELSE status END,
    priority = CASE WHEN v_updates ? 'priority' THEN v_priority ELSE priority END,
    tags = CASE WHEN v_updates ? 'tags' THEN v_tags ELSE tags END,
    risk_flags = CASE WHEN v_updates ? 'risk_flags' THEN v_risk_flags ELSE risk_flags END,
    promised_date = CASE
      WHEN v_updates ? 'promised_date' AND v_updates->'promised_date' = 'null'::jsonb THEN NULL
      WHEN v_updates ? 'promised_date' THEN v_promised_date
      ELSE promised_date
    END,
    assigned_to = CASE
      WHEN v_updates ? 'assigned_to' AND v_updates->'assigned_to' = 'null'::jsonb THEN NULL
      WHEN v_updates ? 'assigned_to' THEN v_assigned_to
      ELSE assigned_to
    END,
    first_response_at = CASE
      WHEN v_updates ? 'status' AND v_status = 'waiting_customer' AND first_response_at IS NULL THEN now()
      ELSE first_response_at
    END,
    resolved_at = CASE
      WHEN v_updates ? 'status' AND v_status IN ('resolved', 'closed') THEN COALESCE(resolved_at, now())
      WHEN v_updates ? 'status' AND v_status NOT IN ('resolved', 'closed') THEN NULL
      ELSE resolved_at
    END,
    updated_at = now()
  WHERE id = p_conversation_id
  RETURNING * INTO v_result;

  IF v_result.id IS NULL THEN
    RAISE EXCEPTION 'Conversation not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_customer_support_conversation_read(
  p_conversation_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.support_conversations
    WHERE id = p_conversation_id
      AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Conversation not found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.support_messages
  SET
    read_by_customer = true,
    read_at = COALESCE(read_at, now()),
    updated_at = now()
  WHERE conversation_id = p_conversation_id
    AND is_internal = false
    AND read_by_customer = false
    AND sender_type IN ('admin', 'system');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_profile_payment_method(
  p_payment_method_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_result_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.payment_methods
  SET
    is_active = false,
    is_default = false,
    updated_at = now()
  WHERE id = p_payment_method_id
    AND user_id = v_user_id
    AND is_active = true
  RETURNING id INTO v_result_id;

  IF v_result_id IS NULL THEN
    RAISE EXCEPTION 'Payment method not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_default_profile_payment_method(
  p_payment_method_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_result_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.payment_methods
    WHERE id = p_payment_method_id
      AND user_id = v_user_id
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Payment method not found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.payment_methods
  SET
    is_default = false,
    updated_at = now()
  WHERE user_id = v_user_id
    AND id <> p_payment_method_id
    AND is_default = true;

  UPDATE public.payment_methods
  SET
    is_default = true,
    updated_at = now()
  WHERE id = p_payment_method_id
    AND user_id = v_user_id
  RETURNING id INTO v_result_id;

  RETURN v_result_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_conversation_reminder(
  p_conversation_id uuid,
  p_reminder_type text,
  p_scheduled_for timestamptz
)
RETURNS public.conversation_reminders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_type text := lower(NULLIF(btrim(COALESCE(p_reminder_type, '')), ''));
  v_result public.conversation_reminders%ROWTYPE;
BEGIN
  PERFORM public.assert_admin_access();

  IF v_type NOT IN ('quote_followup', 'payment_pending', 'promised_date') THEN
    RAISE EXCEPTION 'Invalid reminder type' USING ERRCODE = '22023';
  END IF;

  IF p_scheduled_for IS NULL OR p_scheduled_for < now() - interval '5 minutes' THEN
    RAISE EXCEPTION 'Invalid scheduled reminder date' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.support_conversations WHERE id = p_conversation_id) THEN
    RAISE EXCEPTION 'Conversation not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.conversation_reminders (
    conversation_id,
    reminder_type,
    scheduled_for,
    is_active,
    created_by
  )
  VALUES (
    p_conversation_id,
    v_type,
    p_scheduled_for,
    true,
    auth.uid()
  )
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_cancel_conversation_reminder(
  p_reminder_id uuid
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

  UPDATE public.conversation_reminders
  SET
    is_active = false,
    updated_at = now()
  WHERE id = p_reminder_id
  RETURNING id INTO v_result_id;

  IF v_result_id IS NULL THEN
    RAISE EXCEPTION 'Reminder not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_due_conversation_reminder(
  p_reminder_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_reminder public.conversation_reminders%ROWTYPE;
  v_conversation public.support_conversations%ROWTYPE;
  v_message text;
  v_message_id uuid;
BEGIN
  PERFORM public.assert_admin_access();

  SELECT *
  INTO v_reminder
  FROM public.conversation_reminders
  WHERE id = p_reminder_id
    AND is_active = true
    AND sent_at IS NULL
    AND scheduled_for <= now()
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Due reminder not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT *
  INTO v_conversation
  FROM public.support_conversations
  WHERE id = v_reminder.conversation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation not found' USING ERRCODE = 'P0002';
  END IF;

  v_message := CASE v_reminder.reminder_type
    WHEN 'quote_followup' THEN 'Lembrete: voce tem um orcamento pendente de resposta. Podemos ajudar com alguma duvida?'
    WHEN 'payment_pending' THEN 'Lembrete: seu pagamento esta aguardando confirmacao. Se ja realizou o pagamento, envie o comprovante.'
    WHEN 'promised_date' THEN 'Lembrete: a data prometida para este atendimento esta proxima. Estamos trabalhando para cumprir o prazo.'
    ELSE 'Lembrete de atendimento.'
  END;

  INSERT INTO public.support_messages (
    conversation_id,
    sender_id,
    sender_type,
    message,
    is_internal,
    read_by_customer,
    read_by_admin
  )
  VALUES (
    v_reminder.conversation_id,
    v_conversation.user_id,
    'system',
    v_message,
    false,
    false,
    false
  )
  RETURNING id INTO v_message_id;

  UPDATE public.conversation_reminders
  SET
    sent_at = now(),
    is_active = false,
    updated_at = now()
  WHERE id = p_reminder_id;

  RETURN v_message_id;
END;
$$;

REVOKE ALL ON FUNCTION public.support_validate_text(text, text, integer, boolean, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.support_jsonb_text_array(jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.support_validate_status(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.support_validate_priority(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.support_validate_tags(text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.support_validate_risk_flags(text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_support_conversation(uuid, text, text, text, text[], uuid, uuid, uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_support_conversation(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_customer_support_conversation_read(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_profile_payment_method(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_default_profile_payment_method(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_create_conversation_reminder(uuid, text, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_cancel_conversation_reminder(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.process_due_conversation_reminder(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_support_conversation(uuid, text, text, text, text[], uuid, uuid, uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_support_conversation(uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_customer_support_conversation_read(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_profile_payment_method(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_default_profile_payment_method(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_create_conversation_reminder(uuid, text, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_cancel_conversation_reminder(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_due_conversation_reminder(uuid) TO authenticated, service_role;

REVOKE INSERT, UPDATE, DELETE ON public.support_conversations FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.conversation_reminders FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.payment_methods FROM anon, authenticated;
GRANT SELECT ON public.conversation_reminders TO authenticated, service_role;

COMMENT ON FUNCTION public.create_support_conversation(uuid, text, text, text, text[], uuid, uuid, uuid, uuid, text) IS
  'Validated support conversation creation for customers and admins.';
COMMENT ON FUNCTION public.admin_update_support_conversation(uuid, jsonb) IS
  'Admin-only validated support conversation metadata updates.';
COMMENT ON FUNCTION public.process_due_conversation_reminder(uuid) IS
  'Trusted reminder processor that creates system support messages atomically.';

NOTIFY pgrst, 'reload schema';
