-- ============================================================
-- SQL MIGRATIONS PENDENTES - ORDAX
-- ============================================================
-- Este arquivo contém todos os SQLs necessários para criar as
-- tabelas referenciadas no código mas que ainda NÃO existem
-- no banco de dados.
--
-- Tabelas que JÁ existem: profiles, user_roles, chat_groups,
-- chat_group_members, chat_group_messages, chat_group_attachments
--
-- Gerado em: 2026-03-08
-- ============================================================

-- ============================================================
-- 1. COLLECTIONS (Coleções de personagens)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  cover_image_url text,
  rotation_type text NOT NULL DEFAULT 'sequential', -- 'sequential' | 'random'
  is_active boolean NOT NULL DEFAULT true,
  is_price_custom boolean NOT NULL DEFAULT false,
  total_characters integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active collections"
  ON public.collections FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage collections"
  ON public.collections FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 2. COLLECTION_CHARACTERS (Personagens de cada coleção)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.collection_characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  image_url text,
  image_urls text[] DEFAULT '{}',
  stock_quantity integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'available', -- 'available' | 'out_of_stock' | 'retired'
  display_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.collection_characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view characters"
  ON public.collection_characters FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage characters"
  ON public.collection_characters FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 3. PRICING_TIERS (Níveis de preço)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pricing_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  base_price numeric(10,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  features jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pricing_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active tiers"
  ON public.pricing_tiers FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage tiers"
  ON public.pricing_tiers FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 4. SUBSCRIPTION_PLANS (Planos de assinatura)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id uuid REFERENCES public.pricing_tiers(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text UNIQUE,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  billing_interval text NOT NULL DEFAULT 'monthly', -- 'monthly' | 'quarterly' | 'annual'
  deliveries_per_cycle integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  features jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans"
  ON public.subscription_plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage plans"
  ON public.subscription_plans FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 5. SUBSCRIPTIONS (Assinaturas dos clientes)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  collection_id uuid REFERENCES public.collections(id) ON DELETE SET NULL,
  plan_id uuid REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  plan_type text,
  status text NOT NULL DEFAULT 'active', -- 'active' | 'paused' | 'cancelled' | 'completed'
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

CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage subscriptions"
  ON public.subscriptions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own subscriptions"
  ON public.subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 6. CYCLES (Ciclos de produção)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  month integer NOT NULL,
  year integer NOT NULL,
  status text NOT NULL DEFAULT 'planning', -- 'planning' | 'active' | 'production' | 'shipping' | 'completed'
  cutoff_date timestamptz,
  reveal_date timestamptz,
  shipping_start_date timestamptz,
  capacity integer DEFAULT 0,
  used_capacity integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view cycles"
  ON public.cycles FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage cycles"
  ON public.cycles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 7. SUBSCRIPTION_DELIVERIES (Entregas de assinatura)
-- ============================================================
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

CREATE POLICY "Users can view own deliveries"
  ON public.subscription_deliveries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.id = subscription_deliveries.subscription_id
    AND s.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage deliveries"
  ON public.subscription_deliveries FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 8. QUOTES / ORÇAMENTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'draft', -- 'draft' | 'pending' | 'approved' | 'rejected' | 'completed'
  total_amount numeric(10,2) DEFAULT 0,
  deposit_amount numeric(10,2) DEFAULT 0,
  remaining_amount numeric(10,2) DEFAULT 0,
  payment_status text DEFAULT 'pending', -- 'pending' | 'partial' | 'paid'
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

CREATE POLICY "Users can view own quotes"
  ON public.quotes FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own quotes"
  ON public.quotes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own quotes"
  ON public.quotes FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage quotes"
  ON public.quotes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 9. QUOTE_ITEMS (Itens do orçamento)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  character_id uuid REFERENCES public.collection_characters(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  total_price numeric(10,2) NOT NULL DEFAULT 0,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quote items"
  ON public.quote_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = quote_items.quote_id
    AND q.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage quote items"
  ON public.quote_items FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 10. NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info', -- 'info' | 'payment' | 'delivery' | 'system'
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage notifications"
  ON public.notifications FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- 11. USER_NOTIFICATIONS / USER_NOTIFICATION_SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text,
  type text DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own user_notifications"
  ON public.user_notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own user_notifications"
  ON public.user_notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.user_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT true,
  marketing_emails boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification settings"
  ON public.user_notification_settings FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own notification settings"
  ON public.user_notification_settings FOR ALL
  USING (user_id = auth.uid());

-- ============================================================
-- 12. SUPPORT_CONVERSATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.support_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open', -- 'open' | 'in_progress' | 'resolved' | 'closed'
  priority text DEFAULT 'normal', -- 'low' | 'normal' | 'high' | 'urgent'
  assigned_to uuid,
  last_message_at timestamptz,
  first_response_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
  ON public.support_conversations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create conversations"
  ON public.support_conversations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage conversations"
  ON public.support_conversations FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 13. SUPPORT_MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in own conversations"
  ON public.support_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.support_conversations sc
    WHERE sc.id = support_messages.conversation_id
    AND (sc.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ) AND (is_internal = false OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Users can send messages"
  ON public.support_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Admins can manage messages"
  ON public.support_messages FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 14. SUPPORT_ATTACHMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.support_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.support_messages(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer DEFAULT 0,
  file_type text DEFAULT 'application/octet-stream',
  thumbnail_path text,
  uploaded_by uuid NOT NULL,
  public_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments in own conversations"
  ON public.support_attachments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.support_messages sm
    JOIN public.support_conversations sc ON sc.id = sm.conversation_id
    WHERE sm.id = support_attachments.message_id
    AND (sc.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Admins can manage attachments"
  ON public.support_attachments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 15. STANDALONE_PURCHASES (Compras avulsas)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.standalone_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  character_id uuid REFERENCES public.collection_characters(id) ON DELETE SET NULL,
  collection_id uuid REFERENCES public.collections(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending' | 'paid' | 'in_production' | 'shipped' | 'delivered' | 'cancelled'
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

CREATE POLICY "Users can view own purchases"
  ON public.standalone_purchases FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage purchases"
  ON public.standalone_purchases FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 16. MANUAL_PAYMENTS (Pagamentos manuais)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.manual_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reference_type text NOT NULL, -- 'quote' | 'subscription' | 'standalone_purchase'
  reference_id uuid NOT NULL,
  amount numeric(10,2) NOT NULL,
  payment_method text,
  payment_date timestamptz DEFAULT now(),
  notes text,
  confirmed_by uuid,
  confirmed_at timestamptz,
  status text DEFAULT 'pending', -- 'pending' | 'confirmed' | 'rejected'
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.manual_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments"
  ON public.manual_payments FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage payments"
  ON public.manual_payments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 17. CHARACTER_CHOICES (Escolhas de personagens)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.character_choices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL,
  user_id uuid NOT NULL,
  character_id uuid REFERENCES public.collection_characters(id) ON DELETE SET NULL,
  collection_id uuid REFERENCES public.collections(id) ON DELETE SET NULL,
  order_type text, -- 'subscription' | 'standalone' | 'quote'
  status text NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected' | 'changed'
  chosen_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  alternative_character_id uuid REFERENCES public.collection_characters(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.character_choices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own choices"
  ON public.character_choices FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own choices"
  ON public.character_choices FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own choices"
  ON public.character_choices FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage choices"
  ON public.character_choices FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 18. PRODUCTION_QUEUE (Fila de produção)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.production_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL,
  order_type text NOT NULL, -- 'subscription' | 'standalone' | 'quote'
  user_id uuid NOT NULL,
  collection_id uuid REFERENCES public.collections(id) ON DELETE SET NULL,
  character_id uuid REFERENCES public.collection_characters(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending' | 'in_production' | 'completed' | 'shipped'
  priority integer DEFAULT 0,
  choice_deadline timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.production_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own production items"
  ON public.production_queue FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage production queue"
  ON public.production_queue FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 19. SYSTEM_SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view settings"
  ON public.system_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage settings"
  ON public.system_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 20. HOLIDAYS (Feriados para cálculo de datas úteis)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view holidays"
  ON public.holidays FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage holidays"
  ON public.holidays FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 21. COUPONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text,
  discount_type text NOT NULL DEFAULT 'percentage', -- 'percentage' | 'fixed'
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

CREATE POLICY "Anyone can view active coupons"
  ON public.coupons FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage coupons"
  ON public.coupons FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 22. USER_COINS (Moedas/Créditos do usuário)
-- ============================================================
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

CREATE POLICY "Users can view own coins"
  ON public.user_coins FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage coins"
  ON public.user_coins FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 23. EMAIL_NOTIFICATIONS (Log de emails enviados)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid,
  message_id uuid,
  recipient_user_id uuid,
  status text DEFAULT 'pending', -- 'pending' | 'sent' | 'failed'
  sent_at timestamptz,
  error_message text,
  retry_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view email logs"
  ON public.email_notifications FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert email logs"
  ON public.email_notifications FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- 24. CRON_LOGS (Logs de execução de cron jobs)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cron_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  status text NOT NULL DEFAULT 'running', -- 'running' | 'success' | 'error'
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  duration_ms integer,
  details jsonb DEFAULT '{}',
  error_message text,
  error_details jsonb
);

ALTER TABLE public.cron_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view cron logs"
  ON public.cron_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert cron logs"
  ON public.cron_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update cron logs"
  ON public.cron_logs FOR UPDATE
  USING (true);

-- ============================================================
-- 25. ADMIN_ACTION_LOGS (Log de ações administrativas)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid,
  admin_user_id uuid NOT NULL,
  action_type text NOT NULL,
  previous_status text,
  new_status text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view action logs"
  ON public.admin_action_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert action logs"
  ON public.admin_action_logs FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 26. PRICING_TIER_STATS (View - estatísticas de pricing)
-- ============================================================
CREATE OR REPLACE VIEW public.pricing_tier_stats AS
SELECT 
  pt.id as tier_id,
  pt.name as tier_name,
  pt.description as tier_description,
  pt.base_price,
  pt.is_active,
  pt.is_default,
  pt.display_order,
  pt.features,
  COALESCE(plan_counts.plan_count, 0) as plan_count,
  COALESCE(sub_counts.subscriber_count, 0) as subscriber_count
FROM public.pricing_tiers pt
LEFT JOIN (
  SELECT tier_id, COUNT(*) as plan_count
  FROM public.subscription_plans
  WHERE is_active = true
  GROUP BY tier_id
) plan_counts ON plan_counts.tier_id = pt.id
LEFT JOIN (
  SELECT sp.tier_id, COUNT(DISTINCT s.user_id) as subscriber_count
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON sp.id = s.plan_id
  WHERE s.status = 'active'
  GROUP BY sp.tier_id
) sub_counts ON sub_counts.tier_id = pt.id;

-- ============================================================
-- 27. PRICING_TIERS_WITH_PLANS (View)
-- ============================================================
CREATE OR REPLACE VIEW public.pricing_tiers_with_plans AS
SELECT 
  pt.id as tier_id,
  pt.name as tier_name,
  pt.description as tier_description,
  pt.base_price as tier_base_price,
  pt.is_active as tier_is_active,
  pt.is_default as tier_is_default,
  pt.display_order as tier_display_order,
  pt.features as tier_features,
  sp.id as plan_id,
  sp.name as plan_name,
  sp.slug as plan_slug,
  sp.description as plan_description,
  sp.price as plan_price,
  sp.billing_interval,
  sp.deliveries_per_cycle,
  sp.is_active as plan_is_active,
  sp.features as plan_features
FROM public.pricing_tiers pt
LEFT JOIN public.subscription_plans sp ON sp.tier_id = pt.id;

-- ============================================================
-- 28. TRIGGERS para updated_at
-- ============================================================
CREATE OR REPLACE TRIGGER update_collections_updated_at
  BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_collection_characters_updated_at
  BEFORE UPDATE ON public.collection_characters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_subscription_deliveries_updated_at
  BEFORE UPDATE ON public.subscription_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_cycles_updated_at
  BEFORE UPDATE ON public.cycles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_standalone_purchases_updated_at
  BEFORE UPDATE ON public.standalone_purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_support_conversations_updated_at
  BEFORE UPDATE ON public.support_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_character_choices_updated_at
  BEFORE UPDATE ON public.character_choices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_production_queue_updated_at
  BEFORE UPDATE ON public.production_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_pricing_tiers_updated_at
  BEFORE UPDATE ON public.pricing_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_user_notification_settings_updated_at
  BEFORE UPDATE ON public.user_notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 29. STORAGE BUCKET (para upload de imagens)
-- ============================================================
-- Nota: Criar o bucket via dashboard ou API:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('models', 'models', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('support-attachments', 'support-attachments', false);

-- ============================================================
-- 30. REALTIME (habilitar para tabelas que precisam)
-- ============================================================
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;

-- ============================================================
-- FIM DAS MIGRATIONS
-- ============================================================
-- 
-- INSTRUÇÕES:
-- 1. Execute este SQL no editor SQL do seu banco Supabase
-- 2. Após executar, regenere os tipos TypeScript:
--    supabase gen types typescript --project-id SEU_PROJECT_ID > src/integrations/supabase/types.ts
-- 3. Os erros de build do frontend serão automaticamente resolvidos
--    quando os tipos forem regenerados
-- ============================================================
