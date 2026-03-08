
-- 1. COLLECTIONS
CREATE TABLE IF NOT EXISTS public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  cover_image_url text,
  rotation_type text NOT NULL DEFAULT 'sequential',
  is_active boolean NOT NULL DEFAULT true,
  is_price_custom boolean NOT NULL DEFAULT false,
  total_characters integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active collections" ON public.collections FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage collections" ON public.collections FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 2. COLLECTION_CHARACTERS
CREATE TABLE IF NOT EXISTS public.collection_characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  image_url text,
  image_urls text[] DEFAULT '{}',
  stock_quantity integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'available',
  display_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.collection_characters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view characters" ON public.collection_characters FOR SELECT USING (true);
CREATE POLICY "Admins can manage characters" ON public.collection_characters FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 3. PRICING_TIERS
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
CREATE POLICY "Anyone can view active tiers" ON public.pricing_tiers FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage tiers" ON public.pricing_tiers FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 4. SUBSCRIPTION_PLANS
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id uuid REFERENCES public.pricing_tiers(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text UNIQUE,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  billing_interval text NOT NULL DEFAULT 'monthly',
  deliveries_per_cycle integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  features jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active plans" ON public.subscription_plans FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage plans" ON public.subscription_plans FOR ALL USING (public.has_role(auth.uid(), 'admin'));
