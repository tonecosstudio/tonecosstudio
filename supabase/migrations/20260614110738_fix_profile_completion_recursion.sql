-- Prevent recursive profile updates when recalculating profile completion.

CREATE OR REPLACE FUNCTION public.calculate_profile_completion(profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
  completion INTEGER := 0;
  profile_record RECORD;
BEGIN
  IF profile_id IS DISTINCT FROM auth.uid()
    AND COALESCE(auth.role(), '') <> 'service_role'
    AND public.current_user_role() NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Cannot calculate another user profile completion';
  END IF;

  SELECT *
  INTO profile_record
  FROM public.profiles
  WHERE id = profile_id;

  IF profile_record IS NULL THEN
    RETURN 0;
  END IF;

  completion := completion + 20;

  IF profile_record.full_name IS NOT NULL AND btrim(profile_record.full_name) <> '' THEN
    completion := completion + 20;
  END IF;

  IF profile_record.display_name IS NOT NULL AND btrim(profile_record.display_name) <> '' THEN
    completion := completion + 20;
  END IF;

  IF COALESCE(profile_record.pieces_owned, 0) > 0 THEN
    completion := completion + 20;
  END IF;

  IF COALESCE(profile_record.total_spent, 0) > 0 THEN
    completion := completion + 20;
  END IF;

  RETURN completion;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.trigger_update_profile_completion()
RETURNS TRIGGER AS $$
DECLARE
  completion INTEGER := 20;
BEGIN
  IF NEW.full_name IS NOT NULL AND btrim(NEW.full_name) <> '' THEN
    completion := completion + 20;
  END IF;

  IF NEW.display_name IS NOT NULL AND btrim(NEW.display_name) <> '' THEN
    completion := completion + 20;
  END IF;

  IF COALESCE(NEW.pieces_owned, 0) > 0 THEN
    completion := completion + 20;
  END IF;

  IF COALESCE(NEW.total_spent, 0) > 0 THEN
    completion := completion + 20;
  END IF;

  NEW.profile_completion := completion;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

UPDATE public.profiles
SET profile_completion = (
  20
  + CASE WHEN NULLIF(btrim(COALESCE(full_name, '')), '') IS NOT NULL THEN 20 ELSE 0 END
  + CASE WHEN NULLIF(btrim(COALESCE(display_name, '')), '') IS NOT NULL THEN 20 ELSE 0 END
  + CASE WHEN COALESCE(pieces_owned, 0) > 0 THEN 20 ELSE 0 END
  + CASE WHEN COALESCE(total_spent, 0) > 0 THEN 20 ELSE 0 END
)
WHERE true;
