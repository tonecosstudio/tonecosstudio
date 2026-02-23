-- 1) Types
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'queue_status') THEN
    CREATE TYPE public.queue_status AS ENUM ('pending', 'skipped', 'review_later', 'processed', 'error');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
  END IF;
END $$;

-- 2) Tables
CREATE TABLE IF NOT EXISTS public.images_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  created_by uuid NOT NULL,

  original_filename text,
  content_type text,

  storage_bucket text NOT NULL DEFAULT 'product-images',
  storage_path text NOT NULL,

  status public.queue_status NOT NULL DEFAULT 'pending',
  last_error text,

  -- filled on processing
  name text,
  franchise text,
  category text,
  subcategory text,
  tags text[]
);

CREATE INDEX IF NOT EXISTS idx_images_queue_status ON public.images_queue(status);
CREATE INDEX IF NOT EXISTS idx_images_queue_created_at ON public.images_queue(created_at);

CREATE TABLE IF NOT EXISTS public.models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  created_by uuid NOT NULL,

  name text NOT NULL,
  franchise text,
  category text,
  subcategory text,
  tags text[] NOT NULL DEFAULT '{}',

  image_bucket text NOT NULL DEFAULT 'product-images',
  image_path text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_models_category ON public.models(category);
CREATE INDEX IF NOT EXISTS idx_models_subcategory ON public.models(subcategory);
CREATE INDEX IF NOT EXISTS idx_models_franchise ON public.models(franchise);

-- Dynamic “fixed” franchise map (canonical table)
CREATE TABLE IF NOT EXISTS public.franchises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),

  canonical text NOT NULL UNIQUE,
  aliases text[] NOT NULL DEFAULT '{}'
);

-- Cache by name
CREATE TABLE IF NOT EXISTS public.ai_name_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  name text NOT NULL UNIQUE,
  franchise text,
  category text,
  subcategory text,
  tags text[] NOT NULL DEFAULT '{}',

  model text NOT NULL DEFAULT 'openai/gpt-5-mini'
);

-- Roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- 3) Timestamps helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_images_queue_updated_at ON public.images_queue;
CREATE TRIGGER trg_images_queue_updated_at
BEFORE UPDATE ON public.images_queue
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_models_updated_at ON public.models;
CREATE TRIGGER trg_models_updated_at
BEFORE UPDATE ON public.models
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_ai_name_cache_updated_at ON public.ai_name_cache;
CREATE TRIGGER trg_ai_name_cache_updated_at
BEFORE UPDATE ON public.ai_name_cache
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 4) Security definer role check (avoid recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- 5) RLS
ALTER TABLE public.images_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.franchises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_name_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- images_queue
DROP POLICY IF EXISTS "admins_select_queue" ON public.images_queue;
CREATE POLICY "admins_select_queue"
ON public.images_queue
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins_insert_queue" ON public.images_queue;
CREATE POLICY "admins_insert_queue"
ON public.images_queue
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

DROP POLICY IF EXISTS "admins_update_queue" ON public.images_queue;
CREATE POLICY "admins_update_queue"
ON public.images_queue
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- models: public read, admin write
DROP POLICY IF EXISTS "public_select_models" ON public.models;
CREATE POLICY "public_select_models"
ON public.models
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "admins_insert_models" ON public.models;
CREATE POLICY "admins_insert_models"
ON public.models
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

DROP POLICY IF EXISTS "admins_update_models" ON public.models;
CREATE POLICY "admins_update_models"
ON public.models
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins_delete_models" ON public.models;
CREATE POLICY "admins_delete_models"
ON public.models
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- franchises: public read, admin write
DROP POLICY IF EXISTS "public_select_franchises" ON public.franchises;
CREATE POLICY "public_select_franchises"
ON public.franchises
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "admins_write_franchises" ON public.franchises;
CREATE POLICY "admins_write_franchises"
ON public.franchises
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ai cache: admin only
DROP POLICY IF EXISTS "admins_select_cache" ON public.ai_name_cache;
CREATE POLICY "admins_select_cache"
ON public.ai_name_cache
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins_write_cache" ON public.ai_name_cache;
CREATE POLICY "admins_write_cache"
ON public.ai_name_cache
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- user_roles: admin only
DROP POLICY IF EXISTS "admins_manage_roles" ON public.user_roles;
CREATE POLICY "admins_manage_roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6) Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Storage policies: public read for catalog, admin write
-- SELECT public: allow anyone to read from bucket
DROP POLICY IF EXISTS "public_read_product_images" ON storage.objects;
CREATE POLICY "public_read_product_images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-images');

-- INSERT/UPDATE/DELETE: only admin users
DROP POLICY IF EXISTS "admin_write_product_images" ON storage.objects;
CREATE POLICY "admin_write_product_images"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
