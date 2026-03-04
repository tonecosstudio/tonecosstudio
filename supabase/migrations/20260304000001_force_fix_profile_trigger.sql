-- Force fix profile creation trigger
-- This ensures the trigger is correctly created even if previous attempt had syntax errors

-- Drop everything related to profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_or_updated ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_profile_sync ON auth.users;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.sync_user_email() CASCADE;
DROP FUNCTION IF EXISTS public.handle_user_profile() CASCADE;

-- Create the unified function with correct syntax
CREATE OR REPLACE FUNCTION public.handle_user_profile()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert or update profile with email sync
  INSERT INTO public.profiles (
    id, 
    email, 
    address, 
    preferences_text, 
    preference_tags,
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    NULL, 
    NULL, 
    NULL,
    NOW(), 
    NOW()
  )
  ON CONFLICT (id) 
  DO UPDATE SET 
    email = NEW.email,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

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
ON CONFLICT (id) DO NOTHING;

-- Verify the trigger was created
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
    RAISE EXCEPTION 'Trigger on_auth_user_profile_sync was not created successfully';
  ELSE
    RAISE NOTICE 'Trigger on_auth_user_profile_sync created successfully';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.handle_user_profile() IS 'Unified trigger function to create/update user profiles and sync email from auth.users - FIXED VERSION';
