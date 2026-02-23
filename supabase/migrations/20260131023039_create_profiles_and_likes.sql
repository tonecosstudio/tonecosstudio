-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  address text,
  preferences_text text,
  preference_tags text[]
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "users_select_own_profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "users_update_own_profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "admins_select_profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create model_likes table
CREATE TABLE IF NOT EXISTS public.model_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id uuid NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  
  UNIQUE(user_id, model_id)
);

-- Enable RLS
ALTER TABLE public.model_likes ENABLE ROW LEVEL SECURITY;

-- Users can read their own likes
CREATE POLICY "users_select_own_likes"
ON public.model_likes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own likes
CREATE POLICY "users_insert_own_likes"
ON public.model_likes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own likes
CREATE POLICY "users_delete_own_likes"
ON public.model_likes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_model_likes_user_id ON public.model_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_model_likes_model_id ON public.model_likes(model_id);

-- Function to create profile automatically when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, address, preferences_text, preference_tags)
  VALUES (NEW.id, NULL, NULL, NULL)
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create profile for existing users
INSERT INTO public.profiles (id, address, preferences_text, preference_tags)
SELECT id, NULL, NULL, NULL
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
