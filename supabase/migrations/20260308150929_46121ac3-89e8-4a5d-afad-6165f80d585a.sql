
-- =====================================================
-- 1. validate_collection_limit
-- =====================================================
CREATE OR REPLACE FUNCTION public.validate_collection_limit(
  p_user_id uuid,
  p_new_collection_id uuid DEFAULT NULL
)
RETURNS TABLE (
  can_add boolean,
  current_count integer,
  max_count integer,
  message text,
  is_unlimited boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_type text;
  v_max_collections integer;
  v_current_count integer;
BEGIN
  -- Get user's subscription plan type
  SELECT s.plan_type INTO v_plan_type
  FROM subscriptions s
  WHERE s.user_id = p_user_id AND s.status = 'active'
  LIMIT 1;

  -- Determine max collections based on plan
  IF v_plan_type = 'semestral' OR v_plan_type = 'anual' THEN
    v_max_collections := -1; -- unlimited
  ELSIF v_plan_type = 'trimestral' THEN
    v_max_collections := 5;
  ELSIF v_plan_type = 'mensal' THEN
    v_max_collections := 3;
  ELSE
    v_max_collections := 1;
  END IF;

  -- Count current collections
  SELECT COUNT(*)::integer INTO v_current_count
  FROM subscription_collections sc
  JOIN subscriptions s ON s.id = sc.subscription_id
  WHERE s.user_id = p_user_id AND s.status = 'active';

  -- Check if can add
  IF v_max_collections = -1 THEN
    RETURN QUERY SELECT true, v_current_count, v_max_collections, 'Plano ilimitado'::text, true;
  ELSIF v_current_count < v_max_collections THEN
    RETURN QUERY SELECT true, v_current_count, v_max_collections, 
      format('Você pode adicionar mais %s coleções', v_max_collections - v_current_count)::text, false;
  ELSE
    RETURN QUERY SELECT false, v_current_count, v_max_collections, 
      'Limite de coleções atingido para seu plano'::text, false;
  END IF;
END;
$$;

-- =====================================================
-- 2. get_collection_price
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_collection_price(
  p_collection_id uuid,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_price integer;
  v_multiplier numeric;
  v_discount_pct integer;
  v_final_price integer;
  v_is_chosen boolean := false;
  v_user_context text := 'non_subscriber';
  v_collection_type text;
BEGIN
  -- Get base price from collection_base_pricing or default
  SELECT cbp.base_price_coins INTO v_base_price
  FROM collection_base_pricing cbp
  JOIN collection_types ct ON ct.id = cbp.collection_type_id
  WHERE cbp.is_active = true
  LIMIT 1;

  IF v_base_price IS NULL THEN
    v_base_price := 1000;
  END IF;

  -- Determine user context
  IF p_user_id IS NOT NULL THEN
    -- Check if subscriber
    IF EXISTS (SELECT 1 FROM subscriptions WHERE user_id = p_user_id AND status = 'active') THEN
      v_user_context := 'subscriber';
      -- Check if collection is chosen
      IF EXISTS (
        SELECT 1 FROM subscription_collections sc
        JOIN subscriptions s ON s.id = sc.subscription_id
        WHERE s.user_id = p_user_id AND sc.collection_id = p_collection_id AND s.status = 'active'
      ) THEN
        v_is_chosen := true;
        v_user_context := 'subscriber_chosen';
      END IF;
    END IF;
  END IF;

  -- Get multiplier
  SELECT pcm.multiplier INTO v_multiplier
  FROM pricing_context_multipliers pcm
  WHERE pcm.user_context = v_user_context AND pcm.is_active = true
  LIMIT 1;

  IF v_multiplier IS NULL THEN
    v_multiplier := 1.0;
  END IF;

  -- Get discount for chosen collections
  v_discount_pct := 0;
  IF v_is_chosen THEN
    SELECT COALESCE(pcm.chosen_collection_discount_percentage, 0) INTO v_discount_pct
    FROM pricing_context_multipliers pcm
    WHERE pcm.user_context = 'subscriber_chosen' AND pcm.is_active = true
    LIMIT 1;
  END IF;

  -- Calculate final price
  v_final_price := ROUND(v_base_price * v_multiplier * (1 - v_discount_pct::numeric / 100))::integer;

  RETURN jsonb_build_object(
    'base_price', v_base_price,
    'multiplier', v_multiplier,
    'discount_percentage', v_discount_pct,
    'final_price', v_final_price,
    'user_context', v_user_context,
    'is_chosen', v_is_chosen
  );
END;
$$;

-- =====================================================
-- 3. get_collection_pricing (tier-based pricing)
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_collection_pricing(
  p_collection_id uuid
)
RETURNS TABLE (
  price_full numeric,
  price_pix numeric,
  deposit_amount numeric,
  remaining_full numeric,
  remaining_pix numeric,
  is_custom boolean,
  tier_id uuid,
  tier_name text,
  pricing_source text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_collection record;
  v_tier record;
  v_default_tier record;
BEGIN
  -- Get collection info
  SELECT c.id, c.is_price_custom INTO v_collection
  FROM collections c WHERE c.id = p_collection_id;

  -- Check if collection has a tier assignment
  SELECT pt.id, pt.name, pt.price_full, pt.price_pix, pt.deposit_amount
  INTO v_tier
  FROM collection_tier_assignments cta
  JOIN pricing_tiers pt ON pt.id = cta.tier_id
  WHERE cta.collection_id = p_collection_id
  LIMIT 1;

  IF v_tier.id IS NOT NULL THEN
    RETURN QUERY SELECT
      v_tier.price_full,
      v_tier.price_pix,
      v_tier.deposit_amount,
      (v_tier.price_full - v_tier.deposit_amount),
      (v_tier.price_pix - v_tier.deposit_amount),
      COALESCE(v_collection.is_price_custom, false),
      v_tier.id,
      v_tier.name,
      'tier'::text;
    RETURN;
  END IF;

  -- Fallback to default tier
  SELECT pt.id, pt.name, pt.price_full, pt.price_pix, pt.deposit_amount
  INTO v_default_tier
  FROM pricing_tiers pt
  WHERE pt.is_default = true AND pt.is_active = true
  LIMIT 1;

  IF v_default_tier.id IS NOT NULL THEN
    RETURN QUERY SELECT
      v_default_tier.price_full,
      v_default_tier.price_pix,
      v_default_tier.deposit_amount,
      (v_default_tier.price_full - v_default_tier.deposit_amount),
      (v_default_tier.price_pix - v_default_tier.deposit_amount),
      false,
      v_default_tier.id,
      v_default_tier.name,
      'default'::text;
    RETURN;
  END IF;

  -- Ultimate fallback
  RETURN QUERY SELECT
    0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric,
    false, NULL::uuid, NULL::text, 'none'::text;
END;
$$;

-- =====================================================
-- 4. create_pricing_tier
-- =====================================================
CREATE OR REPLACE FUNCTION public.create_pricing_tier(
  p_name text,
  p_description text DEFAULT NULL,
  p_price_full numeric DEFAULT 0,
  p_deposit_amount numeric DEFAULT 0,
  p_pix_discount_percentage numeric DEFAULT 5,
  p_is_default boolean DEFAULT false,
  p_created_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier_id uuid;
  v_price_pix numeric;
  v_max_order integer;
BEGIN
  -- Calculate PIX price
  v_price_pix := ROUND(p_price_full * (1 - p_pix_discount_percentage / 100), 2);

  -- Get max display order
  SELECT COALESCE(MAX(display_order), 0) + 1 INTO v_max_order FROM pricing_tiers;

  -- If setting as default, unset others
  IF p_is_default THEN
    UPDATE pricing_tiers SET is_default = false WHERE is_default = true;
  END IF;

  INSERT INTO pricing_tiers (name, description, price_full, price_pix, deposit_amount, base_price, is_default, display_order)
  VALUES (p_name, p_description, p_price_full, v_price_pix, p_deposit_amount, p_price_full, p_is_default, v_max_order)
  RETURNING id INTO v_tier_id;

  -- Log in pricing_history
  INSERT INTO pricing_history (change_type, entity_id, new_value, changed_by)
  VALUES ('tier_created', v_tier_id, jsonb_build_object('name', p_name, 'price_full', p_price_full), p_created_by);

  RETURN v_tier_id;
END;
$$;

-- =====================================================
-- 5. update_pricing_tier
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_pricing_tier(
  p_tier_id uuid,
  p_name text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_price_full numeric DEFAULT NULL,
  p_deposit_amount numeric DEFAULT NULL,
  p_pix_discount_percentage numeric DEFAULT NULL,
  p_is_active boolean DEFAULT NULL,
  p_is_default boolean DEFAULT NULL,
  p_display_order integer DEFAULT NULL,
  p_updated_by uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old record;
BEGIN
  SELECT * INTO v_old FROM pricing_tiers WHERE id = p_tier_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tier not found'; END IF;

  -- If setting as default, unset others
  IF p_is_default = true THEN
    UPDATE pricing_tiers SET is_default = false WHERE is_default = true AND id != p_tier_id;
  END IF;

  UPDATE pricing_tiers SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    price_full = COALESCE(p_price_full, price_full),
    price_pix = CASE WHEN p_price_full IS NOT NULL OR p_pix_discount_percentage IS NOT NULL
      THEN ROUND(COALESCE(p_price_full, price_full) * (1 - COALESCE(p_pix_discount_percentage, 5) / 100), 2)
      ELSE price_pix END,
    deposit_amount = COALESCE(p_deposit_amount, deposit_amount),
    is_active = COALESCE(p_is_active, is_active),
    is_default = COALESCE(p_is_default, is_default),
    display_order = COALESCE(p_display_order, display_order),
    updated_at = now()
  WHERE id = p_tier_id;

  -- Log history
  INSERT INTO pricing_history (change_type, entity_id, old_value, new_value, changed_by)
  VALUES ('tier_updated', p_tier_id,
    jsonb_build_object('name', v_old.name, 'price_full', v_old.price_full),
    jsonb_build_object('name', COALESCE(p_name, v_old.name), 'price_full', COALESCE(p_price_full, v_old.price_full)),
    p_updated_by);
END;
$$;

-- =====================================================
-- 6. update_tier_and_recalculate_plans
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_tier_and_recalculate_plans(
  p_tier_id uuid,
  p_price_full numeric DEFAULT NULL,
  p_deposit_amount numeric DEFAULT NULL,
  p_pix_discount_percentage numeric DEFAULT NULL,
  p_updated_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plans_updated integer := 0;
  v_collections_updated integer := 0;
BEGIN
  -- Update tier prices
  PERFORM update_pricing_tier(
    p_tier_id := p_tier_id,
    p_price_full := p_price_full,
    p_deposit_amount := p_deposit_amount,
    p_pix_discount_percentage := p_pix_discount_percentage,
    p_updated_by := p_updated_by
  );

  -- Count affected collections
  SELECT COUNT(*) INTO v_collections_updated
  FROM collection_tier_assignments WHERE tier_id = p_tier_id;

  RETURN jsonb_build_object(
    'success', true,
    'plans_updated', v_plans_updated,
    'collections_updated', v_collections_updated
  );
END;
$$;

-- =====================================================
-- 7. update_multiplier_with_history
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_multiplier_with_history(
  p_user_context text,
  p_new_multiplier numeric,
  p_changed_by uuid,
  p_reason text DEFAULT NULL
)
RETURNS TABLE (success boolean, message text, old_multiplier numeric, new_multiplier numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_multiplier numeric;
BEGIN
  SELECT multiplier INTO v_old_multiplier
  FROM pricing_context_multipliers
  WHERE user_context = p_user_context AND is_active = true;

  UPDATE pricing_context_multipliers
  SET multiplier = p_new_multiplier, updated_at = now()
  WHERE user_context = p_user_context AND is_active = true;

  INSERT INTO pricing_history (change_type, user_context, old_value, new_value, changed_by, reason)
  VALUES ('multiplier_updated', p_user_context,
    jsonb_build_object('multiplier', v_old_multiplier),
    jsonb_build_object('multiplier', p_new_multiplier),
    p_changed_by, p_reason);

  RETURN QUERY SELECT true, 'Multiplicador atualizado com sucesso'::text, v_old_multiplier, p_new_multiplier;
END;
$$;

-- =====================================================
-- 8. update_chosen_discount_with_history
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_chosen_discount_with_history(
  p_new_discount_percentage integer,
  p_changed_by uuid,
  p_reason text DEFAULT NULL
)
RETURNS TABLE (success boolean, message text, old_discount integer, new_discount integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_discount integer;
BEGIN
  SELECT chosen_collection_discount_percentage INTO v_old_discount
  FROM pricing_context_multipliers
  WHERE user_context = 'subscriber_chosen' AND is_active = true;

  UPDATE pricing_context_multipliers
  SET chosen_collection_discount_percentage = p_new_discount_percentage, updated_at = now()
  WHERE user_context = 'subscriber_chosen' AND is_active = true;

  INSERT INTO pricing_history (change_type, user_context, old_value, new_value, changed_by, reason)
  VALUES ('discount_updated', 'subscriber_chosen',
    jsonb_build_object('discount_percentage', v_old_discount),
    jsonb_build_object('discount_percentage', p_new_discount_percentage),
    p_changed_by, p_reason);

  RETURN QUERY SELECT true, 'Desconto atualizado com sucesso'::text, v_old_discount, p_new_discount_percentage;
END;
$$;

-- =====================================================
-- 9. Notification functions
-- =====================================================
CREATE OR REPLACE FUNCTION public.mark_notification_as_read(notification_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE notifications SET is_read = true, read_at = now() WHERE id = notification_id AND user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE notifications SET is_read = true, read_at = now() WHERE id = p_notification_id AND user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_as_read()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE notifications SET is_read = true, read_at = now() WHERE user_id = auth.uid() AND is_read = false;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE notifications SET is_read = true, read_at = now() WHERE user_id = auth.uid() AND is_read = false;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_user_notification_read(p_notification_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE notifications SET is_read = true, read_at = now() WHERE id = p_notification_id AND user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_all_user_notifications_read()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  UPDATE notifications SET is_read = true, read_at = now() WHERE user_id = auth.uid() AND is_read = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_user_notification(p_notification_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM notifications WHERE id = p_notification_id AND user_id = auth.uid();
END;
$$;

-- =====================================================
-- 10. add_coins_to_user
-- =====================================================
CREATE OR REPLACE FUNCTION public.add_coins_to_user(
  p_user_id uuid,
  p_amount integer,
  p_description text DEFAULT 'Crédito de coins',
  p_reference_id text DEFAULT NULL,
  p_reference_type text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO coin_transactions (user_id, amount, transaction_type, description, reference_id, reference_type)
  VALUES (p_user_id, p_amount, 'credit', p_description, p_reference_id, p_reference_type);
END;
$$;

-- =====================================================
-- 11. purchase_character_with_coins
-- =====================================================
CREATE OR REPLACE FUNCTION public.purchase_character_with_coins(
  p_user_id uuid,
  p_character_id uuid
)
RETURNS TABLE (success boolean, message text, new_balance integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price integer;
  v_balance integer;
BEGIN
  -- Get character price
  SELECT COALESCE(pc.price_coins, 1000) INTO v_price
  FROM collection_characters cc
  LEFT JOIN price_categories pc ON pc.id = cc.price_category_id
  WHERE cc.id = p_character_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Personagem não encontrado'::text, 0;
    RETURN;
  END IF;

  -- Calculate balance
  SELECT COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE -amount END), 0)
  INTO v_balance
  FROM coin_transactions WHERE user_id = p_user_id;

  IF v_balance < v_price THEN
    RETURN QUERY SELECT false, 'Saldo insuficiente'::text, v_balance;
    RETURN;
  END IF;

  -- Debit coins
  INSERT INTO coin_transactions (user_id, amount, transaction_type, description, reference_id, reference_type)
  VALUES (p_user_id, v_price, 'debit', 'Compra de personagem', p_character_id::text, 'character_purchase');

  v_balance := v_balance - v_price;
  RETURN QUERY SELECT true, 'Compra realizada com sucesso'::text, v_balance;
END;
$$;

-- =====================================================
-- 12. generate_payment_reference
-- =====================================================
CREATE OR REPLACE FUNCTION public.generate_payment_reference()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref text;
  v_date text;
  v_seq integer;
BEGIN
  v_date := to_char(now(), 'YYYYMMDD');
  SELECT COUNT(*) + 1 INTO v_seq FROM manual_payments WHERE created_at::date = CURRENT_DATE;
  v_ref := 'PAG-' || v_date || '-' || lpad(v_seq::text, 4, '0');
  RETURN v_ref;
END;
$$;

-- =====================================================
-- 13. get_system_settings
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_system_settings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb := '{}'::jsonb;
  v_row record;
BEGIN
  -- Try system_settings table if exists
  BEGIN
    FOR v_row IN SELECT key, value FROM system_settings LOOP
      v_result := v_result || jsonb_build_object(v_row.key, v_row.value);
    END LOOP;
  EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, return defaults
    v_result := jsonb_build_object(
      'default_price_full', '350',
      'default_price_pix', '332.50',
      'default_deposit_amount', '50',
      'pix_discount_percentage', '5'
    );
  END;
  RETURN v_result;
END;
$$;

-- =====================================================
-- 14. get_collection_financial_analysis
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_collection_financial_analysis(
  p_collection_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_characters integer;
  v_total_subscribers integer;
  v_collection_name text;
BEGIN
  SELECT name, total_characters INTO v_collection_name, v_total_characters
  FROM collections WHERE id = p_collection_id;

  SELECT COUNT(DISTINCT s.user_id) INTO v_total_subscribers
  FROM subscription_collections sc
  JOIN subscriptions s ON s.id = sc.subscription_id
  WHERE sc.collection_id = p_collection_id AND s.status = 'active';

  RETURN jsonb_build_object(
    'collection_name', v_collection_name,
    'total_characters', v_total_characters,
    'total_subscribers', v_total_subscribers,
    'collection_id', p_collection_id
  );
END;
$$;

-- =====================================================
-- 15. Production limit functions
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_current_production_limit()
RETURNS TABLE (
  prod_month integer,
  prod_year integer,
  prod_global_limit integer,
  prod_units_sold integer,
  prod_available integer,
  prod_is_closed boolean,
  prod_percentage_sold numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month integer := EXTRACT(MONTH FROM now())::integer;
  v_year integer := EXTRACT(YEAR FROM now())::integer;
  v_capacity integer;
  v_used integer;
BEGIN
  SELECT COALESCE(c.capacity, 100), COALESCE(c.used_capacity, 0)
  INTO v_capacity, v_used
  FROM cycles c
  WHERE c.month = v_month AND c.year = v_year
  LIMIT 1;

  IF v_capacity IS NULL THEN
    v_capacity := 100;
    v_used := 0;
  END IF;

  RETURN QUERY SELECT
    v_month, v_year, v_capacity, v_used,
    GREATEST(v_capacity - v_used, 0),
    v_used >= v_capacity,
    CASE WHEN v_capacity > 0 THEN ROUND((v_used::numeric / v_capacity) * 100, 1) ELSE 0::numeric END;
END;
$$;

CREATE OR REPLACE FUNCTION public.are_sales_open()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month integer := EXTRACT(MONTH FROM now())::integer;
  v_year integer := EXTRACT(YEAR FROM now())::integer;
  v_status text;
BEGIN
  SELECT c.status INTO v_status
  FROM cycles c WHERE c.month = v_month AND c.year = v_year LIMIT 1;
  RETURN COALESCE(v_status, 'active') != 'closed';
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_monthly_sales(quantity integer DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month integer := EXTRACT(MONTH FROM now())::integer;
  v_year integer := EXTRACT(YEAR FROM now())::integer;
BEGIN
  UPDATE cycles SET used_capacity = COALESCE(used_capacity, 0) + quantity
  WHERE month = v_month AND year = v_year;
  IF NOT FOUND THEN
    INSERT INTO cycles (month, year, name, used_capacity, capacity, status)
    VALUES (v_month, v_year, format('Ciclo %s/%s', v_month, v_year), quantity, 100, 'active');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.close_monthly_sales(reason text DEFAULT 'manual')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE cycles SET status = 'closed'
  WHERE month = EXTRACT(MONTH FROM now())::integer AND year = EXTRACT(YEAR FROM now())::integer;
END;
$$;

CREATE OR REPLACE FUNCTION public.reopen_monthly_sales()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE cycles SET status = 'active'
  WHERE month = EXTRACT(MONTH FROM now())::integer AND year = EXTRACT(YEAR FROM now())::integer;
END;
$$;

-- =====================================================
-- 16. admin_list_users
-- =====================================================
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  confirmed_at timestamptz,
  email_confirmed_at timestamptz,
  phone text,
  full_name text,
  profile_phone text,
  whatsapp text,
  cpf text,
  profile_completion integer,
  roles text[]
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  calling_user_id uuid;
BEGIN
  calling_user_id := auth.uid();
  IF calling_user_id IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT has_role(calling_user_id, 'admin') THEN RAISE EXCEPTION 'Acesso negado'; END IF;

  RETURN QUERY
  SELECT
    au.id, au.email::text, au.created_at, au.last_sign_in_at,
    au.confirmed_at, au.email_confirmed_at, au.phone::text,
    p.full_name, p.phone as profile_phone, NULL::text as whatsapp, NULL::text as cpf,
    0::integer as profile_completion,
    COALESCE(ARRAY_AGG(ur.role::text) FILTER (WHERE ur.role IS NOT NULL), ARRAY[]::text[]) as roles
  FROM auth.users au
  LEFT JOIN profiles p ON p.id = au.id
  LEFT JOIN user_roles ur ON ur.user_id = au.id
  GROUP BY au.id, au.email, au.created_at, au.last_sign_in_at,
    au.confirmed_at, au.email_confirmed_at, au.phone, p.full_name, p.phone
  ORDER BY au.created_at DESC;
END;
$$;

-- =====================================================
-- 17. search_unified_orders
-- =====================================================
CREATE OR REPLACE FUNCTION public.search_unified_orders(
  search_query text,
  order_type_filter text DEFAULT 'all'
)
RETURNS TABLE (order_id text, order_type text, rank integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT q.id::text, 'quote'::text, 1
  FROM quotes q
  WHERE (order_type_filter = 'all' OR order_type_filter = 'quote')
    AND q.id::text ILIKE '%' || search_query || '%'
  UNION ALL
  SELECT sp.id::text, 'standalone'::text, 1
  FROM standalone_purchases sp
  WHERE (order_type_filter = 'all' OR order_type_filter = 'standalone')
    AND sp.id::text ILIKE '%' || search_query || '%'
  LIMIT 50;
END;
$$;
