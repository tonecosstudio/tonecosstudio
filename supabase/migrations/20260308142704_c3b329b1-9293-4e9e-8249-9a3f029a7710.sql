
-- 23. EMAIL_NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.email_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid,
  message_id uuid,
  recipient_user_id uuid,
  status text DEFAULT 'pending',
  sent_at timestamptz,
  error_message text,
  retry_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view email logs" ON public.email_notifications FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert email logs" ON public.email_notifications FOR INSERT WITH CHECK (true);

-- 24. CRON_LOGS
CREATE TABLE IF NOT EXISTS public.cron_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  duration_ms integer,
  details jsonb DEFAULT '{}',
  error_message text,
  error_details jsonb
);
ALTER TABLE public.cron_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view cron logs" ON public.cron_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert cron logs" ON public.cron_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update cron logs" ON public.cron_logs FOR UPDATE USING (true);

-- 25. ADMIN_ACTION_LOGS
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
CREATE POLICY "Admins can view action logs" ON public.admin_action_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert action logs" ON public.admin_action_logs FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 26. PRICING_TIER_STATS view
CREATE OR REPLACE VIEW public.pricing_tier_stats AS
SELECT 
  pt.id as tier_id, pt.name as tier_name, pt.description as tier_description,
  pt.base_price, pt.is_active, pt.is_default, pt.display_order, pt.features,
  COALESCE(plan_counts.plan_count, 0) as plan_count,
  COALESCE(sub_counts.subscriber_count, 0) as subscriber_count
FROM public.pricing_tiers pt
LEFT JOIN (SELECT tier_id, COUNT(*) as plan_count FROM public.subscription_plans WHERE is_active = true GROUP BY tier_id) plan_counts ON plan_counts.tier_id = pt.id
LEFT JOIN (SELECT sp.tier_id, COUNT(DISTINCT s.user_id) as subscriber_count FROM public.subscriptions s JOIN public.subscription_plans sp ON sp.id = s.plan_id WHERE s.status = 'active' GROUP BY sp.tier_id) sub_counts ON sub_counts.tier_id = pt.id;

-- 27. PRICING_TIERS_WITH_PLANS view
CREATE OR REPLACE VIEW public.pricing_tiers_with_plans AS
SELECT 
  pt.id as tier_id, pt.name as tier_name, pt.description as tier_description,
  pt.base_price as tier_base_price, pt.is_active as tier_is_active, pt.is_default as tier_is_default,
  pt.display_order as tier_display_order, pt.features as tier_features,
  sp.id as plan_id, sp.name as plan_name, sp.slug as plan_slug, sp.description as plan_description,
  sp.price as plan_price, sp.billing_interval, sp.deliveries_per_cycle, sp.is_active as plan_is_active, sp.features as plan_features
FROM public.pricing_tiers pt
LEFT JOIN public.subscription_plans sp ON sp.tier_id = pt.id;

-- 28. TRIGGERS
CREATE OR REPLACE TRIGGER update_collections_updated_at BEFORE UPDATE ON public.collections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_collection_characters_updated_at BEFORE UPDATE ON public.collection_characters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_subscription_deliveries_updated_at BEFORE UPDATE ON public.subscription_deliveries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_cycles_updated_at BEFORE UPDATE ON public.cycles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_standalone_purchases_updated_at BEFORE UPDATE ON public.standalone_purchases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_support_conversations_updated_at BEFORE UPDATE ON public.support_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_character_choices_updated_at BEFORE UPDATE ON public.character_choices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_production_queue_updated_at BEFORE UPDATE ON public.production_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_pricing_tiers_updated_at BEFORE UPDATE ON public.pricing_tiers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON public.subscription_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_user_notification_settings_updated_at BEFORE UPDATE ON public.user_notification_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
