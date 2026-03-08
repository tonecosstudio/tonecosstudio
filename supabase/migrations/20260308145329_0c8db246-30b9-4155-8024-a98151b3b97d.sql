
-- ============================================
-- COLLECTION_TIER_ASSIGNMENTS table
-- ============================================
CREATE TABLE IF NOT EXISTS public.collection_tier_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  tier_id uuid NOT NULL REFERENCES public.pricing_tiers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(collection_id, tier_id)
);
ALTER TABLE public.collection_tier_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view tier assignments" ON public.collection_tier_assignments FOR SELECT USING (true);
CREATE POLICY "Admins can manage tier assignments" ON public.collection_tier_assignments FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- Add missing columns to pricing_history
-- ============================================
ALTER TABLE public.pricing_history ADD COLUMN IF NOT EXISTS collection_type_id uuid REFERENCES public.collection_types(id);
ALTER TABLE public.pricing_history ADD COLUMN IF NOT EXISTS user_context text;
ALTER TABLE public.pricing_history ADD COLUMN IF NOT EXISTS changed_at timestamptz DEFAULT now();

-- ============================================
-- Add missing columns to collection_characters
-- ============================================
ALTER TABLE public.collection_characters ADD COLUMN IF NOT EXISTS is_catalog boolean NOT NULL DEFAULT false;
ALTER TABLE public.collection_characters ADD COLUMN IF NOT EXISTS theme_category text;
ALTER TABLE public.collection_characters ADD COLUMN IF NOT EXISTS product_line text;
ALTER TABLE public.collection_characters ADD COLUMN IF NOT EXISTS price_category_id uuid REFERENCES public.price_categories(id);
ALTER TABLE public.collection_characters ADD COLUMN IF NOT EXISTS franchise text;

-- ============================================
-- Add missing columns to pricing_tiers
-- ============================================
ALTER TABLE public.pricing_tiers ADD COLUMN IF NOT EXISTS price_full numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.pricing_tiers ADD COLUMN IF NOT EXISTS price_pix numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.pricing_tiers ADD COLUMN IF NOT EXISTS deposit_amount numeric(10,2) NOT NULL DEFAULT 0;

-- ============================================
-- Add missing columns to profiles for collector
-- ============================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS collector_level integer NOT NULL DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS collector_xp integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pieces_owned integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_spent numeric(10,2) NOT NULL DEFAULT 0;
