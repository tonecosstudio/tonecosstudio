-- The preceding enum compatibility migration commits any added status labels.

CREATE TABLE IF NOT EXISTS public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text,
  cover_image_url text,
  is_active boolean NOT NULL DEFAULT true,
  status public.collection_status NOT NULL DEFAULT 'draft',
  display_order integer DEFAULT 0,
  total_characters integer DEFAULT 0,
  slug text,
  rotation_type text NOT NULL DEFAULT 'fixed',
  release_cadence text NOT NULL DEFAULT 'monthly',
  is_price_custom boolean NOT NULL DEFAULT false,
  catalog_model_slugs text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tonart_collections_rotation_type_valid
    CHECK (rotation_type IN ('fixed', 'odd_months', 'even_months')),
  CONSTRAINT tonart_collections_release_cadence_valid
    CHECK (release_cadence IN ('monthly', 'bimonthly', 'custom')),
  CONSTRAINT tonart_collections_catalog_slugs_valid CHECK (
    cardinality(catalog_model_slugs) <= 20
    AND array_position(catalog_model_slugs, NULL) IS NULL
  )
);

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  price_full numeric(10,2) CHECK (price_full IS NULL OR price_full >= 0),
  price_pix numeric(10,2) CHECK (price_pix IS NULL OR price_pix >= 0),
  plan_type text,
  billing_interval text,
  slug text,
  characters_per_cycle integer NOT NULL DEFAULT 1,
  deliveries_per_cycle integer,
  deliveries_total integer,
  model_selection_limit integer,
  coins_included integer,
  coin_bonus_per_shipment numeric(12,2) NOT NULL DEFAULT 0,
  coin_bonus_cap numeric(12,2) NOT NULL DEFAULT 0,
  collections_count integer NOT NULL DEFAULT 1,
  total_credits integer,
  display_order integer,
  pricing_tier_id uuid,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tonart_subscription_plans_collections_count_valid
    CHECK (collections_count = -1 OR collections_count > 0)
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  collection_id uuid REFERENCES public.collections(id) ON DELETE SET NULL,
  status public.subscription_status NOT NULL DEFAULT 'active',
  payment_status public.payment_status NOT NULL DEFAULT 'pending',
  start_date date NOT NULL DEFAULT current_date,
  end_date date,
  plan_type text,
  payment_method text,
  payment_id text,
  total_paid numeric(10,2),
  deliveries_total integer,
  deliveries_completed integer DEFAULT 0,
  coins_per_month numeric(12,2) NOT NULL DEFAULT 0,
  total_coins_received numeric(12,2) NOT NULL DEFAULT 0,
  pause_count integer NOT NULL DEFAULT 0,
  next_billing_date date,
  next_delivery_at timestamptz,
  notes text,
  payment_voucher_path text,
  payment_voucher_url text,
  payment_rejection_reason text,
  selected_model_slugs text[] NOT NULL DEFAULT '{}'::text[],
  collection_model_slugs_snapshot text[] NOT NULL DEFAULT '{}'::text[],
  plan_snapshot jsonb,
  checkout_request_id uuid,
  started_at timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tonart_subscriptions_payment_voucher_path_safe CHECK (
    payment_voucher_path IS NULL OR (
      length(payment_voucher_path) <= 512
      AND payment_voucher_path ~
        '^subscriptions/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9]{10,16}-[0-9a-f]{16}\.(jpg|jpeg|png|pdf)$'
    )
  ),
  CONSTRAINT tonart_subscriptions_model_slugs_valid CHECK (
    cardinality(selected_model_slugs) <= 12
    AND array_position(selected_model_slugs, NULL) IS NULL
  )
);

CREATE TABLE IF NOT EXISTS public.cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  cycle_number integer NOT NULL DEFAULT 1 CHECK (cycle_number IN (1, 2)),
  status public.cycle_status NOT NULL DEFAULT 'sales',
  name text,
  sales_start_date date NOT NULL,
  sales_end_date date NOT NULL,
  production_start_date date NOT NULL,
  production_end_date date NOT NULL,
  shipping_start_date date NOT NULL,
  shipping_end_date date NOT NULL,
  open_start timestamptz,
  open_end timestamptz,
  production_start timestamptz,
  production_end timestamptz,
  shipping_date date,
  cutoff_date timestamptz,
  reveal_date timestamptz,
  capacity integer,
  capacity_max integer,
  capacity_limit integer,
  capacity_current integer,
  used_capacity integer,
  reserved_capacity integer NOT NULL DEFAULT 0,
  status_changed_at timestamptz,
  alert_threshold integer,
  alert_triggered boolean,
  alert_triggered_at timestamptz,
  alert_email text,
  alert_sms text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tonart_cycles_year_month_number_unique UNIQUE (year, month, cycle_number)
);

CREATE TABLE IF NOT EXISTS public.subscription_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL REFERENCES public.cycles(id) ON DELETE RESTRICT,
  character_id uuid,
  collection_character_id uuid,
  collection_id uuid REFERENCES public.collections(id) ON DELETE SET NULL,
  catalog_model_slug text,
  status public.purchase_status NOT NULL DEFAULT 'pending',
  delivery_date date,
  shipping_date date,
  expected_delivery_date timestamptz,
  actual_delivery_date date,
  delivered_date date,
  reveal_date date,
  tracking_code text,
  delivery_number integer,
  delivery_order integer,
  auto_maintained boolean NOT NULL DEFAULT false,
  bonus_piece_id uuid,
  production_started_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.manual_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number text NOT NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'BRL',
  status public.payment_status NOT NULL DEFAULT 'pending',
  payment_method text,
  payment_method_id uuid,
  payment_type text NOT NULL,
  reference_type text,
  reference_id text,
  quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  notes text,
  rejection_reason text,
  approved_at timestamptz,
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bonus_pieces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  delivery_id uuid REFERENCES public.subscription_deliveries(id) ON DELETE SET NULL,
  description text,
  image_url text,
  status text NOT NULL DEFAULT 'pending',
  prepared_at timestamptz,
  shipped_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tonart_bonus_pieces_status_valid CHECK (status IN ('pending', 'prepared', 'shipped')),
  CONSTRAINT tonart_bonus_pieces_one_per_subscription UNIQUE (subscription_id)
);

CREATE TABLE IF NOT EXISTS public.collection_choice_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES public.subscription_deliveries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  previous_collection_id uuid REFERENCES public.collections(id) ON DELETE SET NULL,
  new_collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE RESTRICT,
  previous_model_slug text,
  new_model_slug text,
  change_reason text NOT NULL,
  changed_by_admin boolean NOT NULL DEFAULT false,
  admin_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tonart_collection_choice_reason_valid
    CHECK (change_reason IN ('manual', 'automatic_maintenance', 'admin_override'))
);

CREATE TABLE IF NOT EXISTS public.payment_verification_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  order_type text NOT NULL CHECK (order_type IN ('subscription', 'standalone_purchase')),
  admin_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  action_type text NOT NULL CHECK (action_type IN ('approve_payment_voucher', 'reject_payment_voucher')),
  previous_status text NOT NULL,
  new_status text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $constraints$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'subscription_deliveries_bonus_piece_id_fkey'
       AND conrelid = 'public.subscription_deliveries'::regclass
  ) THEN
    ALTER TABLE public.subscription_deliveries
      ADD CONSTRAINT subscription_deliveries_bonus_piece_id_fkey
      FOREIGN KEY (bonus_piece_id) REFERENCES public.bonus_pieces(id) ON DELETE SET NULL;
  END IF;
END;
$constraints$;

CREATE INDEX IF NOT EXISTS tonart_collections_active_order_idx
  ON public.collections(is_active, status, display_order);
CREATE INDEX IF NOT EXISTS tonart_subscription_plans_active_order_idx
  ON public.subscription_plans(is_active, display_order);
CREATE INDEX IF NOT EXISTS tonart_subscriptions_user_recent_idx
  ON public.subscriptions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS tonart_subscriptions_status_idx
  ON public.subscriptions(status, payment_status);
CREATE INDEX IF NOT EXISTS tonart_subscription_deliveries_subscription_order_idx
  ON public.subscription_deliveries(subscription_id, delivery_number, delivery_order);
CREATE INDEX IF NOT EXISTS tonart_subscription_deliveries_cycle_status_idx
  ON public.subscription_deliveries(cycle_id, status);
CREATE INDEX IF NOT EXISTS tonart_manual_payments_user_recent_idx
  ON public.manual_payments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS tonart_manual_payments_subscription_idx
  ON public.manual_payments(subscription_id, created_at DESC);
CREATE INDEX IF NOT EXISTS tonart_manual_payments_reference_idx
  ON public.manual_payments(reference_number);
CREATE INDEX IF NOT EXISTS tonart_bonus_pieces_subscription_idx
  ON public.bonus_pieces(subscription_id);
CREATE INDEX IF NOT EXISTS tonart_collection_choice_history_delivery_idx
  ON public.collection_choice_history(delivery_id, created_at DESC);
CREATE INDEX IF NOT EXISTS tonart_collection_choice_history_user_idx
  ON public.collection_choice_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS tonart_payment_verification_audit_order_idx
  ON public.payment_verification_audit_logs(order_type, order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS tonart_payment_verification_audit_admin_idx
  ON public.payment_verification_audit_logs(admin_user_id, created_at DESC);

-- Replace legacy policies that depended on profiles.role/has_role with the
-- canonical private admin directory. Customer reads remain owner-scoped.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tonecos_profiles_read_admin ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS profiles_select_policy ON public.profiles;
CREATE POLICY tonart_profiles_read_owner_admin ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) OR (SELECT private_api.is_current_admin()));

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS collections_select_public ON public.collections;
DROP POLICY IF EXISTS collections_select_admin ON public.collections;
DROP POLICY IF EXISTS collections_modify_admin ON public.collections;
DROP POLICY IF EXISTS collections_select_public_anon ON public.collections;
DROP POLICY IF EXISTS collections_select_public_or_admin_authenticated ON public.collections;
DROP POLICY IF EXISTS tonart_collections_public_read ON public.collections;
DROP POLICY IF EXISTS tonart_collections_admin_read ON public.collections;
DROP POLICY IF EXISTS tonart_collections_admin_insert ON public.collections;
DROP POLICY IF EXISTS tonart_collections_admin_update ON public.collections;
DROP POLICY IF EXISTS tonart_collections_admin_delete ON public.collections;
CREATE POLICY tonart_collections_public_read ON public.collections
  FOR SELECT TO anon, authenticated
  USING (is_active AND status = 'active');
CREATE POLICY tonart_collections_admin_read ON public.collections
  FOR SELECT TO authenticated
  USING (
    (SELECT private_api.is_current_admin())
    OR EXISTS (
      SELECT 1 FROM public.subscriptions s
       WHERE s.collection_id = collections.id
         AND s.user_id = (SELECT auth.uid())
    )
  );
CREATE POLICY tonart_collections_admin_insert ON public.collections
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT private_api.is_current_admin()));
CREATE POLICY tonart_collections_admin_update ON public.collections
  FOR UPDATE TO authenticated
  USING ((SELECT private_api.is_current_admin()))
  WITH CHECK ((SELECT private_api.is_current_admin()));
CREATE POLICY tonart_collections_admin_delete ON public.collections
  FOR DELETE TO authenticated
  USING ((SELECT private_api.is_current_admin()));

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS subscription_plans_select_all ON public.subscription_plans;
DROP POLICY IF EXISTS subscription_plans_modify_admin ON public.subscription_plans;
DROP POLICY IF EXISTS tonart_subscription_plans_public_read ON public.subscription_plans;
DROP POLICY IF EXISTS tonart_subscription_plans_admin_read ON public.subscription_plans;
CREATE POLICY tonart_subscription_plans_public_read ON public.subscription_plans
  FOR SELECT TO anon, authenticated
  USING (is_active);
CREATE POLICY tonart_subscription_plans_admin_read ON public.subscription_plans
  FOR SELECT TO authenticated
  USING (
    (SELECT private_api.is_current_admin())
    OR EXISTS (
      SELECT 1 FROM public.subscriptions s
       WHERE s.plan_id = subscription_plans.id
         AND s.user_id = (SELECT auth.uid())
    )
  );

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS subscriptions_select_own ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_select_admin ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_select_own_or_admin ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_insert_own ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_insert_own_pending_checkout ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_modify_admin ON public.subscriptions;
DROP POLICY IF EXISTS tonart_subscriptions_read_owner_admin ON public.subscriptions;
CREATE POLICY tonart_subscriptions_read_owner_admin ON public.subscriptions
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT private_api.is_current_admin()));

ALTER TABLE public.cycles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cycles_select_all ON public.cycles;
DROP POLICY IF EXISTS cycles_modify_admin ON public.cycles;
DROP POLICY IF EXISTS tonart_cycles_admin_read ON public.cycles;
DROP POLICY IF EXISTS tonart_cycles_customer_history_read ON public.cycles;
CREATE POLICY tonart_cycles_admin_read ON public.cycles
  FOR SELECT TO authenticated
  USING ((SELECT private_api.is_current_admin()));
CREATE POLICY tonart_cycles_customer_history_read ON public.cycles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM public.subscription_deliveries d
        JOIN public.subscriptions s ON s.id = d.subscription_id
       WHERE d.cycle_id = cycles.id
         AND s.user_id = (SELECT auth.uid())
    )
  );

ALTER TABLE public.subscription_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS subscription_deliveries_select_own ON public.subscription_deliveries;
DROP POLICY IF EXISTS subscription_deliveries_select_admin ON public.subscription_deliveries;
DROP POLICY IF EXISTS subscription_deliveries_select_own_or_admin ON public.subscription_deliveries;
DROP POLICY IF EXISTS subscription_deliveries_modify_admin ON public.subscription_deliveries;
DROP POLICY IF EXISTS tonart_subscription_deliveries_read_owner_admin ON public.subscription_deliveries;
CREATE POLICY tonart_subscription_deliveries_read_owner_admin ON public.subscription_deliveries
  FOR SELECT TO authenticated
  USING (
    (SELECT private_api.is_current_admin())
    OR EXISTS (
      SELECT 1 FROM public.subscriptions s
       WHERE s.id = subscription_deliveries.subscription_id
         AND s.user_id = (SELECT auth.uid())
    )
  );

ALTER TABLE public.manual_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS manual_payments_select_own ON public.manual_payments;
DROP POLICY IF EXISTS manual_payments_select_admin ON public.manual_payments;
DROP POLICY IF EXISTS manual_payments_select_own_or_admin ON public.manual_payments;
DROP POLICY IF EXISTS manual_payments_modify_admin ON public.manual_payments;
DROP POLICY IF EXISTS tonart_manual_payments_read_owner_admin ON public.manual_payments;
CREATE POLICY tonart_manual_payments_read_owner_admin ON public.manual_payments
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT private_api.is_current_admin()));

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS system_settings_select_all ON public.system_settings;
DROP POLICY IF EXISTS system_settings_modify_admin ON public.system_settings;
DROP POLICY IF EXISTS tonart_system_settings_public_allowlist ON public.system_settings;
DROP POLICY IF EXISTS tonart_system_settings_admin_read ON public.system_settings;
CREATE POLICY tonart_system_settings_public_allowlist ON public.system_settings
  FOR SELECT TO anon, authenticated
  USING (key = ANY (ARRAY[
    'company_name', 'company_address', 'company_logo_url', 'cnpj', 'legal_name',
    'contact_email', 'support_email', 'privacy_email', 'dpo_email', 'phone_primary',
    'phone_whatsapp', 'business_hours', 'website_url', 'facebook_url', 'instagram_url',
    'twitter_url', 'youtube_url', 'default_price_full', 'default_price_pix',
    'default_deposit_amount', 'pix_discount_percentage', 'max_installments_no_interest',
    'max_installments_with_interest', 'production_days_min', 'production_days_max',
    'shipping_business_days', 'sales_duration_days', 'delivery_interval_days',
    'character_choice_days', 'balance_payment_days', 'exchange_deadline_days',
    'days_to_next_delivery', 'user_online_threshold_minutes',
    'notification_polling_interval_ms', 'toast_duration_ms', 'default_page_size',
    'search_debounce_ms', 'input_debounce_ms', 'image_compression_quality',
    'max_image_size_mb', 'hero_image_url', 'pix_key_onetime', 'payment_link_onetime',
    'pix_key_voucher', 'payment_link_voucher', 'pix_key_subscription_bimonthly',
    'payment_link_subscription_bimonthly', 'pix_key_subscription_quarterly',
    'payment_link_subscription_quarterly', 'pix_key_subscription_semiannual',
    'payment_link_subscription_semiannual', 'pix_key_subscription_annual',
    'payment_link_subscription_annual'
  ]::text[]));
CREATE POLICY tonart_system_settings_admin_read ON public.system_settings
  FOR SELECT TO authenticated
  USING ((SELECT private_api.is_current_admin()));

ALTER TABLE public.bonus_pieces ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bonus_pieces_select_owner_admin ON public.bonus_pieces;
DROP POLICY IF EXISTS bonus_pieces_mutate_admin_service ON public.bonus_pieces;
DROP POLICY IF EXISTS tonart_bonus_pieces_read_owner_admin ON public.bonus_pieces;
CREATE POLICY tonart_bonus_pieces_read_owner_admin ON public.bonus_pieces
  FOR SELECT TO authenticated
  USING (
    (SELECT private_api.is_current_admin())
    OR EXISTS (
      SELECT 1 FROM public.subscriptions s
       WHERE s.id = bonus_pieces.subscription_id
         AND s.user_id = (SELECT auth.uid())
    )
  );

ALTER TABLE public.collection_choice_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS collection_choice_history_select_owner_admin ON public.collection_choice_history;
DROP POLICY IF EXISTS collection_choice_history_insert_service_admin ON public.collection_choice_history;
DROP POLICY IF EXISTS tonart_collection_choice_history_read_owner_admin ON public.collection_choice_history;
CREATE POLICY tonart_collection_choice_history_read_owner_admin ON public.collection_choice_history
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT private_api.is_current_admin()));

ALTER TABLE public.payment_verification_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payment_verification_audit_logs_select_admin ON public.payment_verification_audit_logs;
DROP POLICY IF EXISTS payment_verification_audit_logs_insert_service ON public.payment_verification_audit_logs;
DROP POLICY IF EXISTS tonart_payment_verification_audit_admin_read ON public.payment_verification_audit_logs;
CREATE POLICY tonart_payment_verification_audit_admin_read ON public.payment_verification_audit_logs
  FOR SELECT TO authenticated
  USING ((SELECT private_api.is_current_admin()));

REVOKE ALL ON public.collections, public.subscription_plans, public.subscriptions,
  public.cycles, public.subscription_deliveries, public.manual_payments,
  public.system_settings, public.bonus_pieces, public.collection_choice_history,
  public.payment_verification_audit_logs
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.collections, public.subscription_plans, public.system_settings
  TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.collections TO authenticated;
GRANT SELECT ON public.subscriptions, public.subscription_deliveries, public.cycles,
  public.manual_payments, public.bonus_pieces, public.collection_choice_history,
  public.payment_verification_audit_logs TO authenticated;
GRANT ALL ON public.collections, public.subscription_plans, public.subscriptions,
  public.cycles, public.subscription_deliveries, public.manual_payments,
  public.system_settings, public.bonus_pieces, public.collection_choice_history,
  public.payment_verification_audit_logs TO service_role;

-- Keep subscription vouchers private and bind the path to the authenticated
-- owner. These are the existing Supabase Storage bucket and object policies.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-vouchers', 'payment-vouchers', false, 5242880,
  ARRAY['image/jpeg', 'image/png', 'application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS payment_vouchers_select_owner_or_admin ON storage.objects;
DROP POLICY IF EXISTS payment_vouchers_insert_owner ON storage.objects;
DROP POLICY IF EXISTS payment_vouchers_delete_owner_or_admin ON storage.objects;
CREATE POLICY payment_vouchers_select_owner_or_admin ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-vouchers'
    AND (
      (SELECT private_api.is_current_admin())
      OR (
        split_part(name, '/', 1) = 'subscriptions'
        AND split_part(name, '/', 2) = (SELECT auth.uid())::text
      )
    )
  );
CREATE POLICY payment_vouchers_insert_owner ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'payment-vouchers'
    AND split_part(name, '/', 1) = 'subscriptions'
    AND split_part(name, '/', 2) = (SELECT auth.uid())::text
    AND split_part(name, '/', 3) ~ '^[0-9]{10,16}-[0-9a-f]{16}\.(jpg|jpeg|png|pdf)$'
    AND split_part(name, '/', 4) = ''
  );
CREATE POLICY payment_vouchers_delete_owner_or_admin ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'payment-vouchers'
    AND (
      (SELECT private_api.is_current_admin())
      OR (
        split_part(name, '/', 1) = 'subscriptions'
        AND split_part(name, '/', 2) = (SELECT auth.uid())::text
      )
    )
  );

CREATE SEQUENCE IF NOT EXISTS public.payment_reference_seq;

CREATE OR REPLACE FUNCTION public.admin_validate_setting_key(p_key text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_key text := lower(NULLIF(btrim(COALESCE(p_key, '')), ''));
BEGIN
  IF v_key IS NULL OR v_key !~ '^[a-z][a-z0-9_]{1,79}$' THEN
    RAISE EXCEPTION 'Invalid setting key' USING ERRCODE = '22023';
  END IF;
  RETURN v_key;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_validate_setting_value(
  p_value text,
  p_max_length integer DEFAULT 4000
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_value text := NULLIF(btrim(COALESCE(p_value, '')), '');
BEGIN
  IF v_value IS NULL OR p_max_length < 1 OR length(v_value) > p_max_length
     OR v_value ~ '[[:cntrl:]<>]' THEN
    RAISE EXCEPTION 'Invalid setting value' USING ERRCODE = '22023';
  END IF;
  RETURN v_value;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_upsert_system_settings(p_updates jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_api, pg_temp
AS $function$
DECLARE
  v_key text;
  v_value text;
  v_count integer := 0;
  v_price_full numeric;
  v_price_pix numeric;
  v_deposit numeric;
  v_production_min integer;
  v_production_max integer;
  v_numeric numeric;
  v_integer integer;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT (SELECT private_api.is_current_admin()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_updates IS NULL OR jsonb_typeof(p_updates) <> 'object' THEN
    RAISE EXCEPTION 'Settings update payload must be an object' USING ERRCODE = '22023';
  END IF;

  FOR v_key, v_value IN SELECT key, value FROM jsonb_each_text(p_updates) LOOP
    v_key := public.admin_validate_setting_key(v_key);
    IF lower(v_key) ~ '(secret|token|password|private[ _-]?key|service[ _-]?role|credential|api[ _-]?key)' THEN
      RAISE EXCEPTION 'Secret-like system setting keys are forbidden' USING ERRCODE = '42501';
    END IF;
    IF v_key IN ('tonart_collection_commerce_enabled', 'tonart_extra_commerce_enabled') THEN
      RAISE EXCEPTION 'Commercial release gates require a separate release authorization' USING ERRCODE = '42501';
    END IF;
    IF v_key ~ '^(pix_key|payment_link)_' THEN
      RAISE EXCEPTION 'Use the payment settings operation for payment instructions' USING ERRCODE = '22023';
    END IF;
    v_value := public.admin_validate_setting_value(v_value, 4000);
    IF v_key IN (
      'default_price_full', 'default_price_pix', 'default_deposit_amount',
      'pix_discount_percentage'
    ) THEN
      IF v_value !~ '^[0-9]+([.][0-9]+)?$' THEN
        RAISE EXCEPTION 'Invalid numeric system setting: %', v_key USING ERRCODE = '22023';
      END IF;
      v_numeric := v_value::numeric;
      IF v_key IN ('default_price_full', 'default_price_pix') AND v_numeric <= 0 THEN
        RAISE EXCEPTION 'System setting must be greater than zero: %', v_key USING ERRCODE = '22023';
      END IF;
      IF v_key = 'default_deposit_amount' AND v_numeric < 0 THEN
        RAISE EXCEPTION 'System setting cannot be negative: %', v_key USING ERRCODE = '22023';
      END IF;
      IF v_key = 'pix_discount_percentage' AND (v_numeric < 0 OR v_numeric > 100) THEN
        RAISE EXCEPTION 'PIX discount must be between 0 and 100' USING ERRCODE = '22023';
      END IF;
    ELSIF v_key IN (
      'max_installments_no_interest', 'max_installments_with_interest',
      'monthly_production_limit', 'production_days_min', 'production_days_max',
      'shipping_business_days', 'sales_duration_days', 'delivery_interval_days',
      'character_choice_days', 'balance_payment_days', 'exchange_deadline_days',
      'days_to_next_delivery'
    ) THEN
      IF v_value !~ '^[0-9]+$' THEN
        RAISE EXCEPTION 'Invalid integer system setting: %', v_key USING ERRCODE = '22023';
      END IF;
      v_integer := v_value::integer;
      IF v_key = 'exchange_deadline_days' THEN
        IF v_integer < 0 OR v_integer > 365 THEN
          RAISE EXCEPTION 'Exchange deadline out of range' USING ERRCODE = '22023';
        END IF;
      ELSIF v_integer < 1 THEN
        RAISE EXCEPTION 'System setting must be a positive integer: %', v_key USING ERRCODE = '22023';
      END IF;
      IF v_key IN ('max_installments_no_interest', 'max_installments_with_interest')
         AND v_integer > 100 THEN
        RAISE EXCEPTION 'Installment count out of range' USING ERRCODE = '22023';
      END IF;
      IF v_key = 'monthly_production_limit' AND v_integer > 100000 THEN
        RAISE EXCEPTION 'Monthly production limit out of range' USING ERRCODE = '22023';
      END IF;
      IF v_key = 'shipping_business_days' AND v_integer > 31 THEN
        RAISE EXCEPTION 'Shipping business day out of range' USING ERRCODE = '22023';
      END IF;
      IF v_key IN ('character_choice_days', 'balance_payment_days') AND v_integer > 365 THEN
        RAISE EXCEPTION 'Operational deadline out of range: %', v_key USING ERRCODE = '22023';
      END IF;
      IF v_key IN (
        'production_days_min', 'production_days_max', 'sales_duration_days',
        'delivery_interval_days', 'days_to_next_delivery'
      ) AND v_integer > 3650 THEN
        RAISE EXCEPTION 'Operational duration out of range: %', v_key USING ERRCODE = '22023';
      END IF;
    END IF;
    INSERT INTO public.system_settings(key, value, updated_at)
    VALUES (v_key, v_value, now())
    ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value, updated_at = now();
    v_count := v_count + 1;
  END LOOP;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'No settings supplied' USING ERRCODE = '22023';
  END IF;

  SELECT value::numeric INTO v_price_full
    FROM public.system_settings
   WHERE key = 'default_price_full' AND value ~ '^[0-9]+([.][0-9]+)?$';
  SELECT value::numeric INTO v_price_pix
    FROM public.system_settings
   WHERE key = 'default_price_pix' AND value ~ '^[0-9]+([.][0-9]+)?$';
  SELECT value::numeric INTO v_deposit
    FROM public.system_settings
   WHERE key = 'default_deposit_amount' AND value ~ '^[0-9]+([.][0-9]+)?$';
  IF v_price_full IS NOT NULL AND v_price_pix IS NOT NULL AND v_price_pix > v_price_full THEN
    RAISE EXCEPTION 'PIX price cannot exceed full price' USING ERRCODE = '22023';
  END IF;
  IF v_deposit IS NOT NULL AND v_price_full IS NOT NULL AND v_price_pix IS NOT NULL
     AND v_deposit > LEAST(v_price_full, v_price_pix) THEN
    RAISE EXCEPTION 'Deposit cannot exceed configured sale prices' USING ERRCODE = '22023';
  END IF;

  SELECT value::integer INTO v_production_min
    FROM public.system_settings
   WHERE key = 'production_days_min' AND value ~ '^[0-9]+$';
  SELECT value::integer INTO v_production_max
    FROM public.system_settings
   WHERE key = 'production_days_max' AND value ~ '^[0-9]+$';
  IF v_production_min IS NOT NULL AND v_production_max IS NOT NULL
     AND v_production_max < v_production_min THEN
    RAISE EXCEPTION 'production_days_max cannot be lower than production_days_min' USING ERRCODE = '22023';
  END IF;
  RETURN jsonb_build_object('updated', v_count);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_payment_setting(p_key text, p_value text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_api, pg_temp
AS $function$
DECLARE
  v_key text := public.admin_validate_setting_key(p_key);
  v_value text := btrim(COALESCE(p_value, ''));
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT (SELECT private_api.is_current_admin()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF v_key !~ '^(pix_key|payment_link)_' THEN
    RAISE EXCEPTION 'Invalid payment setting key' USING ERRCODE = '22023';
  END IF;
  IF length(v_value) > 1000 OR v_value ~ '[[:cntrl:]<>]' THEN
    RAISE EXCEPTION 'Invalid payment setting' USING ERRCODE = '22023';
  END IF;
  IF v_key ~ '^payment_link_'
     AND v_value <> '' AND v_value !~ '^https://[^[:space:]<>]{3,}$' THEN
    RAISE EXCEPTION 'Payment links must use HTTPS' USING ERRCODE = '22023';
  END IF;
  UPDATE public.system_settings
     SET value = v_value, updated_at = now()
   WHERE key = v_key
  RETURNING key INTO v_key;
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'Payment setting not found' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_key;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_payment_reference()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_reference text;
  v_attempts integer := 0;
BEGIN
  LOOP
    v_attempts := v_attempts + 1;
    v_reference := 'PAY-' || to_char(now(), 'YYYYMMDD') || '-' ||
      lpad((nextval('public.payment_reference_seq') % 10000)::text, 4, '0');
    IF NOT EXISTS (
      SELECT 1 FROM public.manual_payments WHERE reference_number = v_reference
    ) THEN
      RETURN v_reference;
    END IF;
    IF v_attempts >= 10000 THEN
      RAISE EXCEPTION 'PAYMENT_REFERENCE_EXHAUSTED' USING ERRCODE = '54000';
    END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delivery_cycle_validate_text(
  p_value text,
  p_label text,
  p_max_length integer DEFAULT 500,
  p_required boolean DEFAULT true
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_value text := NULLIF(btrim(COALESCE(p_value, '')), '');
BEGIN
  IF p_required AND v_value IS NULL THEN
    RAISE EXCEPTION '% is required', p_label USING ERRCODE = '22023';
  END IF;
  IF v_value IS NOT NULL AND (
    length(v_value) > p_max_length OR v_value ~ '[[:cntrl:]]' OR v_value ~ '<[^>]*>'
  ) THEN
    RAISE EXCEPTION 'Invalid %', p_label USING ERRCODE = '22023';
  END IF;
  RETURN v_value;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reserve_capacity(p_cycle_id uuid, p_quantity integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_capacity integer;
  v_used integer;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY' USING ERRCODE = '22023';
  END IF;
  SELECT COALESCE(capacity, capacity_max, capacity_limit),
         GREATEST(
           COALESCE(used_capacity, 0),
           COALESCE(capacity_current, 0),
           COALESCE(reserved_capacity, 0),
           0
         )
    INTO v_capacity, v_used
    FROM public.cycles
   WHERE id = p_cycle_id
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CYCLE_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  IF v_capacity IS NULL OR v_capacity < 1 THEN
    RAISE EXCEPTION 'CYCLE_CAPACITY_NOT_CONFIGURED' USING ERRCODE = '22023';
  END IF;
  IF v_used + p_quantity > v_capacity THEN
    RAISE EXCEPTION 'CAPACITY_EXCEEDED' USING ERRCODE = '23514';
  END IF;
  UPDATE public.cycles
     SET used_capacity = v_used + p_quantity,
         capacity_current = v_used + p_quantity,
         reserved_capacity = v_used + p_quantity,
         updated_at = now()
   WHERE id = p_cycle_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_or_create_delivery_cycle(
  p_cycle_number integer,
  p_month integer,
  p_year integer,
  p_capacity integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_api, pg_temp
AS $function$
DECLARE
  v_cycle public.cycles%ROWTYPE;
  v_capacity integer;
  v_raw_limit text;
  v_open_start date;
  v_open_end date;
  v_production_start date;
  v_production_end date;
  v_shipping_date date;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT (SELECT private_api.is_current_admin()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_cycle_number IS NULL OR p_cycle_number NOT IN (1, 2) THEN
    RAISE EXCEPTION 'INVALID_CYCLE_NUMBER' USING ERRCODE = '22023';
  END IF;
  IF p_month IS NULL OR p_month < 1 OR p_month > 12 THEN
    RAISE EXCEPTION 'INVALID_CYCLE_MONTH' USING ERRCODE = '22023';
  END IF;
  IF p_year IS NULL OR p_year < 2020 OR p_year > 2100 THEN
    RAISE EXCEPTION 'INVALID_CYCLE_YEAR' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_cycle FROM public.cycles
   WHERE year = p_year AND month = p_month AND cycle_number = p_cycle_number
   LIMIT 1;
  IF FOUND THEN
    v_capacity := COALESCE(v_cycle.capacity, v_cycle.capacity_max, v_cycle.capacity_limit);
    IF v_capacity IS NULL OR v_capacity < 1 THEN
      RAISE EXCEPTION 'CYCLE_CAPACITY_NOT_CONFIGURED' USING ERRCODE = '22023';
    END IF;
    RETURN to_jsonb(v_cycle);
  END IF;

  IF p_capacity IS NOT NULL THEN
    v_capacity := p_capacity;
  ELSE
    SELECT value INTO v_raw_limit FROM public.system_settings WHERE key = 'monthly_production_limit';
    IF v_raw_limit IS NULL OR btrim(v_raw_limit) !~ '^[0-9]+$' THEN
      RAISE EXCEPTION 'PRODUCTION_LIMIT_NOT_CONFIGURED' USING ERRCODE = '22023';
    END IF;
    v_capacity := btrim(v_raw_limit)::integer;
  END IF;
  IF v_capacity < 1 OR v_capacity > 100000 THEN
    RAISE EXCEPTION 'PRODUCTION_LIMIT_INVALID' USING ERRCODE = '22023';
  END IF;

  v_open_start := make_date(p_year, p_month, 1);
  v_open_end := (v_open_start + interval '1 month - 1 day')::date;
  v_production_start := (v_open_start + interval '1 month')::date;
  v_production_end := (v_open_start + interval '2 months - 1 day')::date;
  v_shipping_date := (v_open_start + interval '2 months')::date;
  BEGIN
    INSERT INTO public.cycles (
      year, month, cycle_number, name, status, open_start, open_end,
      production_start, production_end, shipping_date, cutoff_date,
      sales_start_date, sales_end_date, production_start_date, production_end_date,
      shipping_start_date, shipping_end_date, capacity, used_capacity,
      capacity_max, capacity_current, capacity_limit, reserved_capacity
    )
    VALUES (
      p_year, p_month, p_cycle_number,
      p_year::text || '-' || lpad(p_month::text, 2, '0') || '-cycle-' || p_cycle_number::text,
      'open', v_open_start::timestamptz, v_open_end::timestamptz,
      v_production_start::timestamptz, v_production_end::timestamptz,
      v_shipping_date, v_open_end::timestamptz, v_open_start, v_open_end,
      v_production_start, v_production_end, v_shipping_date, v_shipping_date,
      v_capacity, 0, v_capacity, 0, v_capacity, 0
    )
    RETURNING * INTO v_cycle;
  EXCEPTION WHEN unique_violation THEN
    SELECT * INTO v_cycle FROM public.cycles
     WHERE year = p_year AND month = p_month AND cycle_number = p_cycle_number
     LIMIT 1;
  END;
  IF v_cycle.id IS NULL THEN
    RAISE EXCEPTION 'CYCLE_CREATION_FAILED' USING ERRCODE = '55000';
  END IF;
  RETURN to_jsonb(v_cycle);
END;
$function$;

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
SET search_path = public, private_api, pg_temp
AS $function$
DECLARE
  v_subscription public.subscriptions%ROWTYPE;
  v_updated public.subscriptions%ROWTYPE;
  v_admin_user_id uuid := (SELECT auth.uid());
  v_previous_status text;
  v_new_status text;
  v_reason text;
  v_notes text;
  v_action_type text;
  v_audit_notes text;
BEGIN
  IF v_admin_user_id IS NULL OR NOT (SELECT private_api.is_current_admin()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_subscription_id IS NULL THEN
    RAISE EXCEPTION 'SUBSCRIPTION_ID_REQUIRED' USING ERRCODE = '22023';
  END IF;
  IF p_approved IS NULL THEN
    RAISE EXCEPTION 'APPROVAL_DECISION_REQUIRED' USING ERRCODE = '22023';
  END IF;
  v_notes := public.delivery_cycle_validate_text(p_notes, 'notes', 1000, false);
  SELECT * INTO v_subscription FROM public.subscriptions
   WHERE id = p_subscription_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SUBSCRIPTION_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  IF v_subscription.payment_voucher_path IS NULL AND v_subscription.payment_voucher_url IS NULL THEN
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
       SET status = 'active', payment_status = 'paid', payment_rejection_reason = NULL,
           started_at = COALESCE(started_at, now()), updated_at = now()
     WHERE id = p_subscription_id RETURNING * INTO v_updated;
  ELSE
    v_reason := public.delivery_cycle_validate_text(p_rejection_reason, 'rejection reason', 500);
    v_new_status := v_previous_status;
    v_action_type := 'reject_payment_voucher';
    v_audit_notes := concat('Rejected: ', v_reason, COALESCE(' | ' || v_notes, ''));
    UPDATE public.subscriptions
       SET payment_voucher_path = NULL, payment_voucher_url = NULL,
           payment_rejection_reason = v_reason, payment_status = 'rejected', updated_at = now()
     WHERE id = p_subscription_id RETURNING * INTO v_updated;
  END IF;

  INSERT INTO public.payment_verification_audit_logs (
    order_id, order_type, admin_user_id, action_type, previous_status, new_status, notes
  ) VALUES (
    p_subscription_id, 'subscription', v_admin_user_id, v_action_type,
    v_previous_status, v_new_status, v_audit_notes
  );
  RETURN jsonb_build_object(
    'subscription', to_jsonb(v_updated), 'previousStatus', v_previous_status,
    'newStatus', v_new_status, 'approved', p_approved
  );
END;
$function$;

CREATE OR REPLACE FUNCTION private_api.resubmit_subscription_payment_voucher_for_current_user(
  p_subscription_id uuid,
  p_payment_voucher_path text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_api, pg_temp
AS $function$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
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
  IF p_payment_voucher_path IS NULL OR p_payment_voucher_path !~ (
    '^subscriptions/' || v_user_id::text || '/[0-9]{10,16}-[0-9a-f]{16}\.(jpg|jpeg|png|pdf)$'
  ) THEN
    RAISE EXCEPTION 'SUBSCRIPTION_VOUCHER_PATH_INVALID' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_subscription FROM public.subscriptions
   WHERE id = p_subscription_id AND user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SUBSCRIPTION_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  IF v_subscription.status::text <> 'pending_payment'
     OR v_subscription.payment_status::text <> 'rejected' THEN
    RAISE EXCEPTION 'SUBSCRIPTION_VOUCHER_RESUBMISSION_NOT_ALLOWED' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_payment FROM public.manual_payments
   WHERE subscription_id = v_subscription.id AND user_id = v_user_id
   ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SUBSCRIPTION_PAYMENT_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;

  UPDATE public.subscriptions
     SET payment_voucher_path = p_payment_voucher_path, payment_voucher_url = NULL,
         payment_status = 'under_review', payment_rejection_reason = NULL,
         notes = 'Comprovante atualizado pelo cliente e aguardando conferência', updated_at = now()
   WHERE id = v_subscription.id RETURNING * INTO v_updated;
  UPDATE public.manual_payments
     SET status = 'under_review', rejection_reason = NULL,
         notes = 'Novo comprovante enviado pelo cliente para revisão', updated_at = now()
   WHERE id = v_payment.id RETURNING * INTO v_payment;
  RETURN jsonb_build_object('subscription', to_jsonb(v_updated), 'payment', to_jsonb(v_payment));
END;
$function$;

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
    p_subscription_id, p_payment_voucher_path
  );
$function$;

REVOKE ALL ON FUNCTION public.admin_validate_setting_key(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_validate_setting_value(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delivery_cycle_validate_text(text, text, integer, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_payment_reference() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reserve_capacity(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private_api.resubmit_subscription_payment_voucher_for_current_user(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.resubmit_subscription_payment_voucher_for_current_user(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_upsert_system_settings(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_payment_setting(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_get_or_create_delivery_cycle(integer, integer, integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_verify_subscription_payment_voucher(uuid, boolean, text, text, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_validate_setting_key(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_validate_setting_value(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.delivery_cycle_validate_text(text, text, integer, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_payment_reference() TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_capacity(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION private_api.resubmit_subscription_payment_voucher_for_current_user(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resubmit_subscription_payment_voucher_for_current_user(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_upsert_system_settings(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_payment_setting(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_or_create_delivery_cycle(integer, integer, integer, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_verify_subscription_payment_voucher(uuid, boolean, text, text, uuid) TO authenticated, service_role;

COMMENT ON TABLE public.collections IS
  'Commercial collection contract containing only references to model slugs in the canonical D1 catalog.';
COMMENT ON TABLE public.subscription_plans IS
  'Configurable one-time collection purchase plans; payment installments do not create recurring charges.';
COMMENT ON TABLE public.subscription_deliveries IS
  'Delivery schedule for purchased subscription pieces, linked to the canonical production cycle.';
COMMENT ON TABLE public.manual_payments IS
  'Existing manual payment history for quotes and collection purchases; evidence remains in private Storage.';
COMMENT ON TABLE public.system_settings IS
  'Existing operational and commercial settings with public reads limited to explicit storefront keys.';
COMMENT ON FUNCTION public.admin_verify_subscription_payment_voucher(uuid, boolean, text, text, uuid) IS
  'Admin-only subscription voucher review; auth.uid is the audit identity recorded with the decision.';
COMMENT ON FUNCTION public.admin_get_or_create_delivery_cycle(integer, integer, integer, integer) IS
  'Admin-only delivery-cycle creation; requires explicit or configured capacity and never invents a limit.';

NOTIFY pgrst, 'reload schema';
