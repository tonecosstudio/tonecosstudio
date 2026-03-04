-- Force fix profile trigger with correct delimiters
-- This migration ensures the trigger is created correctly

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_profile_sync ON auth.users;
DROP FUNCTION IF EXISTS public.handle_user_profile() CASCADE;

-- Create function with correct syntax and RLS bypass
CREATE OR REPLACE FUNCTION public.handle_user_profile()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  -- Bypass RLS by setting role to service_role
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.handle_user_profile() TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.profiles TO postgres, service_role;

-- Create trigger
CREATE TRIGGER on_auth_user_profile_sync
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_profile();

-- Verify trigger was created
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE trigger_name = 'on_auth_user_profile_sync'
  AND event_object_table = 'users'
  AND event_object_schema = 'auth';
  
  IF trigger_count = 0 THEN
    RAISE EXCEPTION 'Trigger was not created!';
  END IF;
  
  RAISE NOTICE 'Profile trigger fixed successfully';
END;
$$;
