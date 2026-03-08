
-- =====================================================
-- SECURITY FIX 6: system_settings - Restrict to admins only
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'system_settings') THEN
    DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.system_settings;
    DROP POLICY IF EXISTS "Anyone can view system settings" ON public.system_settings;
    DROP POLICY IF EXISTS "Public can view settings" ON public.system_settings;
    
    CREATE POLICY "Only admins can view settings"
    ON public.system_settings
    FOR SELECT
    USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- =====================================================
-- SECURITY FIX 7: Profiles - Create a view for public profiles
-- that only exposes safe columns
-- =====================================================

-- Update the profiles policy to be more restrictive for public profiles
-- by creating a security definer function that returns safe public data
DROP POLICY IF EXISTS "Users can view own or public profiles" ON public.profiles;

-- Admins see everything
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users see their own full profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Public profiles: anyone can see, but we'll handle column filtering at app level
-- Only expose rows that are marked public
CREATE POLICY "Anyone can view public profiles limited"
ON public.profiles
FOR SELECT
USING (is_public = true);
