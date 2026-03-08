
-- FIX 1: Remove conflicting permissive SELECT policy on system_settings
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'system_settings') THEN
    DROP POLICY IF EXISTS "Anyone can view settings" ON public.system_settings;
    DROP POLICY IF EXISTS "Anyone can view system settings" ON public.system_settings;
    DROP POLICY IF EXISTS "Public can view settings" ON public.system_settings;
    DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.system_settings;
  END IF;
END $$;

-- FIX 2: Restrict coupons to authenticated users only
DROP POLICY IF EXISTS "Anyone can view active coupons" ON public.coupons;

CREATE POLICY "Authenticated users can view active coupons"
ON public.coupons
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = true);
