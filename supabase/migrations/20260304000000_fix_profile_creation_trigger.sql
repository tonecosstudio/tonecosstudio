-- Fix profile creation trigger conflict
-- This migration consolidates the two conflicting triggers into one

-- Drop the old triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_or_updated ON auth.users;

-- Drop old functions
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.sync_user_email();

-- Create unified function that handles both profile creation and email sync
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

-- Create single trigger for both insert and update
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

COMMENT ON FUNCTION public.handle_user_profile() IS 'Unified trigger function to create/update user profiles and sync email from auth.users';
