-- Fix profile trigger with proper permissions and error handling
-- This ensures the trigger works correctly even with RLS enabled

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_profile_sync ON auth.users;
DROP FUNCTION IF EXISTS public.handle_user_profile() CASCADE;

-- Create improved function with better error handling
CREATE OR REPLACE FUNCTION public.handle_user_profile()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  profile_exists BOOLEAN;
BEGIN
  -- Check if profile already exists
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = NEW.id) INTO profile_exists;
  
  IF profile_exists THEN
    -- Update existing profile
    UPDATE public.profiles 
    SET 
      email = NEW.email,
      updated_at = NOW()
    WHERE id = NEW.id;
  ELSE
    -- Insert new profile
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
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error in handle_user_profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_user_profile() TO postgres, anon, authenticated, service_role;

-- Create the trigger
CREATE TRIGGER on_auth_user_profile_sync
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_profile();

-- Ensure all existing users have profiles
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

-- Verify the setup
DO $$
DECLARE
  trigger_count INTEGER;
  function_count INTEGER;
BEGIN
  -- Check trigger
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE trigger_name = 'on_auth_user_profile_sync'
  AND event_object_table = 'users'
  AND event_object_schema = 'auth';
  
  -- Check function
  SELECT COUNT(*) INTO function_count
  FROM pg_proc
  WHERE proname = 'handle_user_profile';
  
  IF trigger_count = 0 THEN
    RAISE EXCEPTION 'Trigger was not created';
  END IF;
  
  IF function_count = 0 THEN
    RAISE EXCEPTION 'Function was not created';
  END IF;
  
  RAISE NOTICE 'Profile trigger setup completed successfully';
  RAISE NOTICE 'Trigger count: %, Function count: %', trigger_count, function_count;
END;
$$;

COMMENT ON FUNCTION public.handle_user_profile() IS 'Trigger function to create/update user profiles with improved error handling and permissions';
