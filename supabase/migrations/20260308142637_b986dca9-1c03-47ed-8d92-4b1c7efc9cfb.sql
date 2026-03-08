
-- 15. STANDALONE_PURCHASES
CREATE TABLE IF NOT EXISTS public.standalone_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  character_id uuid REFERENCES public.collection_characters(id) ON DELETE SET NULL,
  collection_id uuid REFERENCES public.collections(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  amount numeric(10,2) NOT NULL DEFAULT 0,
  paid_amount numeric(10,2) DEFAULT 0,
  balance_amount numeric(10,2) DEFAULT 0,
  payment_method text,
  payment_link text,
  tracking_code text,
  shipping_carrier text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.standalone_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own purchases" ON public.standalone_purchases FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can manage purchases" ON public.standalone_purchases FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 16. MANUAL_PAYMENTS
CREATE TABLE IF NOT EXISTS public.manual_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reference_type text NOT NULL,
  reference_id uuid NOT NULL,
  amount numeric(10,2) NOT NULL,
  payment_method text,
  payment_date timestamptz DEFAULT now(),
  notes text,
  confirmed_by uuid,
  confirmed_at timestamptz,
  status text DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.manual_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own payments" ON public.manual_payments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can manage payments" ON public.manual_payments FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 17. CHARACTER_CHOICES
CREATE TABLE IF NOT EXISTS public.character_choices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL,
  user_id uuid NOT NULL,
  character_id uuid REFERENCES public.collection_characters(id) ON DELETE SET NULL,
  collection_id uuid REFERENCES public.collections(id) ON DELETE SET NULL,
  order_type text,
  status text NOT NULL DEFAULT 'pending',
  chosen_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  alternative_character_id uuid REFERENCES public.collection_characters(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.character_choices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own choices" ON public.character_choices FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own choices" ON public.character_choices FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own choices" ON public.character_choices FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins can manage choices" ON public.character_choices FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 18. PRODUCTION_QUEUE
CREATE TABLE IF NOT EXISTS public.production_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL,
  order_type text NOT NULL,
  user_id uuid NOT NULL,
  collection_id uuid REFERENCES public.collections(id) ON DELETE SET NULL,
  character_id uuid REFERENCES public.collection_characters(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  priority integer DEFAULT 0,
  choice_deadline timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.production_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own production items" ON public.production_queue FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can manage production queue" ON public.production_queue FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 19. SYSTEM_SETTINGS
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view settings" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage settings" ON public.system_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 20. HOLIDAYS
CREATE TABLE IF NOT EXISTS public.holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view holidays" ON public.holidays FOR SELECT USING (true);
CREATE POLICY "Admins can manage holidays" ON public.holidays FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 21. COUPONS
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text,
  discount_type text NOT NULL DEFAULT 'percentage',
  discount_value numeric(10,2) NOT NULL,
  max_uses integer,
  current_uses integer DEFAULT 0,
  min_amount numeric(10,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  valid_from timestamptz,
  valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active coupons" ON public.coupons FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage coupons" ON public.coupons FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 22. USER_COINS
CREATE TABLE IF NOT EXISTS public.user_coins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance integer NOT NULL DEFAULT 0,
  total_earned integer NOT NULL DEFAULT 0,
  total_spent integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_coins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own coins" ON public.user_coins FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can manage coins" ON public.user_coins FOR ALL USING (public.has_role(auth.uid(), 'admin'));
