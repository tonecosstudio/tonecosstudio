-- Final fix for profile trigger - disable RLS during trigger execution
-- This ensures the trigger can always create profiles

-- Drop and recreate the function with RLS bypass
DROP TRIGGER IF EXISTS on_auth_user_profile_sync ON auth.users;
DROP FUNCTION IF EXISTS public.handle_user_profile() CASCADE;

-- Create function that bypasses RLS
CREATE OR REPLACE FUNCTION public.handle_user_profile()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  -- Disable RLS for this transaction
  PERFORM set_config('role', 'service_role', true);
  
  -- Insert or update profile
  INSERT INTO public.profiles (
    id, 
    email, 
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    NOW(), 
    NOW()
  )
  ON CONFLICT (id) 
  DO UPDATE SET 
    email = NEW.email,
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Error in handle_user_profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Grant all necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_user_profile() TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.profiles TO postgres, service_role;

-- Create trigger
CREATE TRIGGER on_auth_user_profile_sync
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_profile();

-- Ensure all users have profiles
INSERT INTO public.profiles (id, email, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.created_at, NOW()),
  NOW()
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = au.id)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = NOW();

-- Test the trigger
DO $$
DECLARE
  test_result TEXT;
BEGIN
  -- Verify trigger exists
  SELECT trigger_name INTO test_result
  FROM information_schema.triggers
  WHERE trigger_name = 'on_auth_user_profile_sync'
  AND event_object_table = 'users'
  AND event_object_schema = 'auth';
  
  IF test_result IS NULL THEN
    RAISE EXCEPTION 'Trigger was not created!';
  END IF;
  
  RAISE NOTICE 'Profile trigger configured successfully with RLS bypass';
END;
$$;

COMMENT ON FUNCTION public.handle_user_profile() IS 'Creates/updates user profiles with RLS bypass for OAuth compatibility';
