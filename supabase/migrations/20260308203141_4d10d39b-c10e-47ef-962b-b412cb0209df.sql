
-- =====================================================
-- SECURITY FIX 1: Profiles - Protect PII, respect is_public
-- =====================================================

-- Drop overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

-- Users can always read their own profile; others only see public profiles
CREATE POLICY "Users can view own or public profiles"
ON public.profiles
FOR SELECT
USING (
  (auth.uid() = id) OR (is_public = true) OR has_role(auth.uid(), 'admin'::app_role)
);

-- =====================================================
-- SECURITY FIX 2: Notifications - Restrict INSERT
-- =====================================================

-- Drop permissive INSERT policy
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Only admins or authenticated server-side can insert notifications
CREATE POLICY "Only admins can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- SECURITY FIX 3: email_notifications - Restrict INSERT
-- =====================================================

DROP POLICY IF EXISTS "System can insert email logs" ON public.email_notifications;

CREATE POLICY "Only admins can insert email logs"
ON public.email_notifications
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- SECURITY FIX 4: cron_logs - Restrict UPDATE to admins
-- =====================================================

DROP POLICY IF EXISTS "System can update cron logs" ON public.cron_logs;

CREATE POLICY "Only admins can update cron logs"
ON public.cron_logs
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Also fix INSERT on cron_logs
DROP POLICY IF EXISTS "System can insert cron logs" ON public.cron_logs;

CREATE POLICY "Only admins can insert cron logs"
ON public.cron_logs
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- SECURITY FIX 5: system_settings - Restrict to authenticated
-- =====================================================

-- Check if system_settings exists and fix it
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'system_settings') THEN
    -- Drop any permissive SELECT policy
    DROP POLICY IF EXISTS "Anyone can view system settings" ON public.system_settings;
    DROP POLICY IF EXISTS "Public can view settings" ON public.system_settings;
    
    -- Only authenticated users can read settings
    CREATE POLICY "Authenticated users can view settings"
    ON public.system_settings
    FOR SELECT
    USING (auth.uid() IS NOT NULL);
  END IF;
END $$;
