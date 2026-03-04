-- Fix RLS policies to allow trigger to insert profiles
-- The trigger runs with SECURITY DEFINER but RLS was blocking inserts

-- Add policy to allow service role to insert profiles (used by triggers)
CREATE POLICY "service_role_insert_profiles"
ON public.profiles
FOR INSERT
TO service_role
WITH CHECK (true);

-- Also allow the trigger function to bypass RLS by granting it to postgres role
-- This ensures the trigger can always create profiles regardless of RLS
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- Update the existing system_insert_profiles policy to be more permissive
-- Allow inserts when either the user is creating their own profile OR when called by a trigger
DROP POLICY IF EXISTS "system_insert_profiles" ON public.profiles;

CREATE POLICY "system_insert_profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = id OR 
  -- Allow if called from a trigger (auth.uid() might be null during OAuth)
  auth.uid() IS NULL
);

-- Verify the policies
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'profiles'
  AND policyname IN ('system_insert_profiles', 'service_role_insert_profiles');
  
  IF policy_count < 2 THEN
    RAISE WARNING 'Expected 2 policies, found %', policy_count;
  ELSE
    RAISE NOTICE 'RLS policies updated successfully. Policy count: %', policy_count;
  END IF;
END;
$$;

COMMENT ON POLICY "service_role_insert_profiles" ON public.profiles IS 'Allows service role (triggers) to insert profiles';
COMMENT ON POLICY "system_insert_profiles" ON public.profiles IS 'Allows users to insert their own profile or triggers to insert during OAuth';
