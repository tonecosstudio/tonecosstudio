
-- 5. SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  collection_id uuid REFERENCES public.collections(id) ON DELETE SET NULL,
  plan_id uuid REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  plan_type text,
  status text NOT NULL DEFAULT 'active',
  total_paid numeric(10,2) DEFAULT 0,
  payment_method text,
  started_at timestamptz DEFAULT now(),
  next_delivery_at timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz,
  deliveries_completed integer NOT NULL DEFAULT 0,
  deliveries_total integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can manage subscriptions" ON public.subscriptions FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own subscriptions" ON public.subscriptions FOR INSERT WITH CHECK (user_id = auth.uid());

-- 6. CYCLES
CREATE TABLE IF NOT EXISTS public.cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  month integer NOT NULL,
  year integer NOT NULL,
  status text NOT NULL DEFAULT 'planning',
  cutoff_date timestamptz,
  reveal_date timestamptz,
  shipping_start_date timestamptz,
  capacity integer DEFAULT 0,
  used_capacity integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view cycles" ON public.cycles FOR SELECT USING (true);
CREATE POLICY "Admins can manage cycles" ON public.cycles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 7. SUBSCRIPTION_DELIVERIES
CREATE TABLE IF NOT EXISTS public.subscription_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  cycle_id uuid REFERENCES public.cycles(id) ON DELETE SET NULL,
  character_id uuid REFERENCES public.collection_characters(id) ON DELETE SET NULL,
  delivery_order integer NOT NULL DEFAULT 1,
  delivery_number integer,
  status text NOT NULL DEFAULT 'scheduled',
  reveal_date timestamptz,
  production_start_date timestamptz,
  shipping_date timestamptz,
  delivered_date timestamptz,
  actual_delivery_date timestamptz,
  tracking_code text,
  shipping_carrier text,
  progress_photos jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscription_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own deliveries" ON public.subscription_deliveries FOR SELECT USING (EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id = subscription_deliveries.subscription_id AND s.user_id = auth.uid()));
CREATE POLICY "Admins can manage deliveries" ON public.subscription_deliveries FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 8. QUOTES
CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  total_amount numeric(10,2) DEFAULT 0,
  deposit_amount numeric(10,2) DEFAULT 0,
  remaining_amount numeric(10,2) DEFAULT 0,
  payment_status text DEFAULT 'pending',
  payment_link text,
  pix_key text,
  payment_instructions text,
  payment_link_sent_at timestamptz,
  customer_paid_notification_at timestamptz,
  is_preorder boolean DEFAULT false,
  notes text,
  admin_notes text,
  tracking_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own quotes" ON public.quotes FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own quotes" ON public.quotes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own quotes" ON public.quotes FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins can manage quotes" ON public.quotes FOR ALL USING (public.has_role(auth.uid(), 'admin'));
