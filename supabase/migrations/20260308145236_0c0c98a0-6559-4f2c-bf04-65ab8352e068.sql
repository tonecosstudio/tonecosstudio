
-- ============================================
-- PAYMENT_LINKS table
-- ============================================
CREATE TABLE IF NOT EXISTS public.payment_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES public.quotes(id) ON DELETE CASCADE,
  payment_type text NOT NULL DEFAULT 'full',
  amount numeric(10,2) NOT NULL DEFAULT 0,
  payment_link text,
  pix_key text,
  instructions text,
  sent_by uuid,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage payment links" ON public.payment_links FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own payment links" ON public.payment_links FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = payment_links.quote_id AND q.user_id = auth.uid())
);

-- ============================================
-- PRICE_CATEGORIES table
-- ============================================
CREATE TABLE IF NOT EXISTS public.price_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  display_name text NOT NULL,
  price_coins integer NOT NULL DEFAULT 0,
  price_standalone numeric(10,2) NOT NULL DEFAULT 0,
  coin_value_in_cents numeric(10,2) NOT NULL DEFAULT 0,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.price_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view price categories" ON public.price_categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage price categories" ON public.price_categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- SUBSCRIPTION_CREDIT_PLANS table
-- ============================================
CREATE TABLE IF NOT EXISTS public.subscription_credit_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type text NOT NULL UNIQUE,
  name text NOT NULL,
  duration_months integer NOT NULL DEFAULT 3,
  price numeric(10,2) NOT NULL DEFAULT 0,
  base_credits integer NOT NULL DEFAULT 0,
  bonus_credits integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscription_credit_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active credit plans" ON public.subscription_credit_plans FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage credit plans" ON public.subscription_credit_plans FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- SUBSCRIPTION_CREDIT_SUBSCRIPTIONS table
-- ============================================
CREATE TABLE IF NOT EXISTS public.subscription_credit_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_type text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz,
  next_billing_date timestamptz,
  auto_renew boolean NOT NULL DEFAULT true,
  pending_plan_change text,
  cancelled_at timestamptz,
  cancellation_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscription_credit_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own credit subscriptions" ON public.subscription_credit_subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can manage credit subscriptions" ON public.subscription_credit_subscriptions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- SUBSCRIPTION_CREDIT_USER_CREDITS table
-- ============================================
CREATE TABLE IF NOT EXISTS public.subscription_credit_user_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subscription_id uuid REFERENCES public.subscription_credit_subscriptions(id) ON DELETE CASCADE,
  total_credits integer NOT NULL DEFAULT 0,
  used_credits integer NOT NULL DEFAULT 0,
  available_credits integer NOT NULL DEFAULT 0,
  expired_credits integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscription_credit_user_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own credits" ON public.subscription_credit_user_credits FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can manage user credits" ON public.subscription_credit_user_credits FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- SUBSCRIPTION_CREDIT_CHARACTERS table
-- ============================================
CREATE TABLE IF NOT EXISTS public.subscription_credit_characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price_cash numeric(10,2) NOT NULL DEFAULT 0,
  price_credits integer NOT NULL DEFAULT 0,
  is_exclusive_semestral boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  is_standard_collection boolean NOT NULL DEFAULT false,
  image_url text,
  franchise text,
  category text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscription_credit_characters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active credit characters" ON public.subscription_credit_characters FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage credit characters" ON public.subscription_credit_characters FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- SUBSCRIPTION_CREDIT_PRODUCTION_CYCLES table
-- ============================================
CREATE TABLE IF NOT EXISTS public.subscription_credit_production_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  capacity_limit integer NOT NULL DEFAULT 100,
  current_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  close_date timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscription_credit_production_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view credit cycles" ON public.subscription_credit_production_cycles FOR SELECT USING (true);
CREATE POLICY "Admins can manage credit cycles" ON public.subscription_credit_production_cycles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- SUBSCRIPTION_CREDIT_ORDERS table
-- ============================================
CREATE TABLE IF NOT EXISTS public.subscription_credit_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subscription_id uuid REFERENCES public.subscription_credit_subscriptions(id),
  production_cycle_id uuid REFERENCES public.subscription_credit_production_cycles(id),
  order_type text NOT NULL DEFAULT 'individual',
  status text NOT NULL DEFAULT 'pending',
  is_priority boolean NOT NULL DEFAULT false,
  is_locked boolean NOT NULL DEFAULT false,
  total_credits integer NOT NULL DEFAULT 0,
  credits_debited boolean NOT NULL DEFAULT false,
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscription_credit_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own credit orders" ON public.subscription_credit_orders FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own credit orders" ON public.subscription_credit_orders FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can manage credit orders" ON public.subscription_credit_orders FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- SUBSCRIPTION_CREDIT_ORDER_ITEMS table
-- ============================================
CREATE TABLE IF NOT EXISTS public.subscription_credit_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.subscription_credit_orders(id) ON DELETE CASCADE,
  character_id uuid NOT NULL REFERENCES public.subscription_credit_characters(id),
  credits_cost integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscription_credit_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own order items" ON public.subscription_credit_order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.subscription_credit_orders o WHERE o.id = subscription_credit_order_items.order_id AND o.user_id = auth.uid())
);
CREATE POLICY "Admins can manage order items" ON public.subscription_credit_order_items FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- SUBSCRIPTION_CREDIT_TRANSACTIONS table
-- ============================================
CREATE TABLE IF NOT EXISTS public.subscription_credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subscription_id uuid REFERENCES public.subscription_credit_subscriptions(id),
  transaction_type text NOT NULL,
  credits_amount integer NOT NULL DEFAULT 0,
  character_id uuid REFERENCES public.subscription_credit_characters(id),
  order_id uuid REFERENCES public.subscription_credit_orders(id),
  production_cycle_id uuid REFERENCES public.subscription_credit_production_cycles(id),
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscription_credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own credit transactions" ON public.subscription_credit_transactions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can manage credit transactions" ON public.subscription_credit_transactions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- SUPPORT_QUICK_REPLIES table
-- ============================================
CREATE TABLE IF NOT EXISTS public.support_quick_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  category text NOT NULL DEFAULT 'geral',
  shortcut text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.support_quick_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage support quick replies" ON public.support_quick_replies FOR ALL USING (public.has_role(auth.uid(), 'admin'));
