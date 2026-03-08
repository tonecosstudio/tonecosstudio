
-- ============================================
-- 1. MODELS table (catalog of 3D models)
-- ============================================
CREATE TABLE IF NOT EXISTS public.models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  franchise text,
  category text,
  subcategory text,
  tags text[],
  image_bucket text,
  image_path text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view models" ON public.models FOR SELECT USING (true);
CREATE POLICY "Admins can manage models" ON public.models FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 2. MODEL_LIKES table
-- ============================================
CREATE TABLE IF NOT EXISTS public.model_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  model_id uuid NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, model_id)
);
ALTER TABLE public.model_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own likes" ON public.model_likes FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admins can view all likes" ON public.model_likes FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 3. WISHLIST table
-- ============================================
CREATE TABLE IF NOT EXISTS public.wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  model_id uuid REFERENCES public.models(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, model_id)
);
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own wishlist" ON public.wishlist FOR ALL USING (user_id = auth.uid());

-- ============================================
-- 4. COLLECTION_TYPES table
-- ============================================
CREATE TABLE IF NOT EXISTS public.collection_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.collection_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view collection types" ON public.collection_types FOR SELECT USING (true);
CREATE POLICY "Admins can manage collection types" ON public.collection_types FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Seed initial collection types
INSERT INTO public.collection_types (name, display_name, sort_order) VALUES
  ('subscription', 'Assinatura', 1),
  ('standard_catalog', 'Catálogo Padrão', 2),
  ('premium_catalog', 'Catálogo Premium', 3)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 5. COLLECTION_BASE_PRICING table
-- ============================================
CREATE TABLE IF NOT EXISTS public.collection_base_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_type_id uuid NOT NULL REFERENCES public.collection_types(id) ON DELETE CASCADE,
  base_price_coins integer NOT NULL DEFAULT 1000,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(collection_type_id)
);
ALTER TABLE public.collection_base_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view base pricing" ON public.collection_base_pricing FOR SELECT USING (true);
CREATE POLICY "Admins can manage base pricing" ON public.collection_base_pricing FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 6. PRICING_CONTEXT_MULTIPLIERS table
-- ============================================
CREATE TABLE IF NOT EXISTS public.pricing_context_multipliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_context text NOT NULL UNIQUE,
  multiplier numeric(5,2) NOT NULL DEFAULT 1.0,
  chosen_collection_discount_percentage integer DEFAULT 0,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pricing_context_multipliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view multipliers" ON public.pricing_context_multipliers FOR SELECT USING (true);
CREATE POLICY "Admins can manage multipliers" ON public.pricing_context_multipliers FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Seed initial multipliers
INSERT INTO public.pricing_context_multipliers (user_context, multiplier, chosen_collection_discount_percentage, description) VALUES
  ('subscription_chosen', 1.0, 20, 'Assinante com coleção escolhida'),
  ('subscription_not_chosen', 1.0, 0, 'Assinante sem coleção escolhida'),
  ('non_subscriber', 1.4, 0, 'Não assinante')
ON CONFLICT (user_context) DO NOTHING;

-- ============================================
-- 7. PRICING_HISTORY table (contextual pricing)
-- ============================================
CREATE TABLE IF NOT EXISTS public.pricing_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_type text NOT NULL,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  changed_by uuid,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pricing_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view pricing history" ON public.pricing_history FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert pricing history" ON public.pricing_history FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 8. QUICK_REPLIES table
-- ============================================
CREATE TABLE IF NOT EXISTS public.quick_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'geral',
  title text NOT NULL,
  message text NOT NULL,
  shortcut text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage quick replies" ON public.quick_replies FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 9. COIN_PACKAGES table
-- ============================================
CREATE TABLE IF NOT EXISTS public.coin_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  amount integer NOT NULL,
  bonus integer NOT NULL DEFAULT 0,
  price_brl numeric(10,2) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  is_popular boolean NOT NULL DEFAULT false,
  is_best_value boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.coin_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active coin packages" ON public.coin_packages FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage coin packages" ON public.coin_packages FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 10. COIN_TRANSACTIONS table
-- ============================================
CREATE TABLE IF NOT EXISTS public.coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  transaction_type text NOT NULL,
  reference_id text,
  reference_type text,
  description text NOT NULL DEFAULT '',
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own coin transactions" ON public.coin_transactions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can manage coin transactions" ON public.coin_transactions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 11. COLLECTOR_BADGES table
-- ============================================
CREATE TABLE IF NOT EXISTS public.collector_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text,
  rarity text NOT NULL DEFAULT 'common',
  requirement_type text,
  requirement_value integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.collector_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view badges" ON public.collector_badges FOR SELECT USING (true);
CREATE POLICY "Admins can manage badges" ON public.collector_badges FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 12. USER_BADGES table
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_id uuid NOT NULL REFERENCES public.collector_badges(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own badges" ON public.user_badges FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can manage user badges" ON public.user_badges FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 13. PUBLIC_COLLECTION table
-- ============================================
CREATE TABLE IF NOT EXISTS public.public_collection (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  model_id uuid NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  notes text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.public_collection ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view public collections" ON public.public_collection FOR SELECT USING (true);
CREATE POLICY "Users can manage own public collection" ON public.public_collection FOR ALL USING (user_id = auth.uid());

-- ============================================
-- 14. PAYMENT_FILES table
-- ============================================
CREATE TABLE IF NOT EXISTS public.payment_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.manual_payments(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text DEFAULT 'application/octet-stream',
  file_size integer DEFAULT 0,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage payment files" ON public.payment_files FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own payment files" ON public.payment_files FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.manual_payments mp WHERE mp.id = payment_files.payment_id AND mp.user_id = auth.uid())
);

-- ============================================
-- 15. BULK_OPERATIONS table
-- ============================================
CREATE TABLE IF NOT EXISTS public.bulk_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type text NOT NULL,
  payment_ids uuid[] NOT NULL DEFAULT '{}',
  admin_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  total_count integer DEFAULT 0,
  success_count integer DEFAULT 0,
  failure_count integer DEFAULT 0,
  error_details jsonb,
  result jsonb,
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bulk_operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage bulk operations" ON public.bulk_operations FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 16. IMAGES_QUEUE table
-- ============================================
CREATE TABLE IF NOT EXISTS public.images_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text DEFAULT 'image/jpeg',
  file_size integer DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  storage_bucket text,
  storage_path text,
  ai_suggested_name text,
  ai_confidence numeric(3,2),
  ai_model_used text,
  image_hash text,
  uploaded_by uuid,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.images_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage images queue" ON public.images_queue FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 17. FRANCHISE_RULES table
-- ============================================
CREATE TABLE IF NOT EXISTS public.franchise_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern text NOT NULL,
  franchise_canonical text NOT NULL,
  note text,
  enabled boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 100,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.franchise_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage franchise rules" ON public.franchise_rules FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 18. SUBSCRIPTION_COLLECTIONS table
-- ============================================
CREATE TABLE IF NOT EXISTS public.subscription_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(subscription_id, collection_id)
);
ALTER TABLE public.subscription_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own subscription collections" ON public.subscription_collections FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id = subscription_collections.subscription_id AND s.user_id = auth.uid())
);
CREATE POLICY "Users can insert own subscription collections" ON public.subscription_collections FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id = subscription_collections.subscription_id AND s.user_id = auth.uid())
);
CREATE POLICY "Admins can manage subscription collections" ON public.subscription_collections FOR ALL USING (public.has_role(auth.uid(), 'admin'));
