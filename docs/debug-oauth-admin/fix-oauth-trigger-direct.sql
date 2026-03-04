-- Execute this SQL directly in Supabase SQL Editor
-- https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_profile_sync ON auth.users;
DROP FUNCTION IF EXISTS public.handle_user_profile() CASCADE;

-- Create function with RLS bypass
CREATE OR REPLACE FUNCTION public.handle_user_profile()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  -- Bypass RLS
  PERFORM set_config('role', 'service_role', true);
  
  -- Insert or update profile
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET email = NEW.email, updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
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

-- Verify
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_profile_sync';
