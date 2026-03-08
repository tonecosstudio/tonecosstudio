
-- Create a security definer function to return only safe public profile data
CREATE OR REPLACE FUNCTION public.get_public_profile(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', p.id,
    'display_name', p.display_name,
    'full_name', p.full_name,
    'username', p.username,
    'bio', p.bio,
    'avatar_url', p.avatar_url,
    'collector_level', p.collector_level,
    'collector_xp', p.collector_xp,
    'pieces_owned', p.pieces_owned,
    'is_public', p.is_public
  ) INTO v_result
  FROM profiles p
  WHERE p.id = p_user_id AND p.is_public = true;

  RETURN v_result;
END;
$$;

-- Remove the anonymous public profiles policy that exposes PII
DROP POLICY IF EXISTS "Anyone can view public profiles limited" ON public.profiles;

-- Create a more restrictive public profiles policy
-- Only authenticated users can see public profiles, and app-level filtering handles columns
CREATE POLICY "Authenticated can view public profiles"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_public = true);
