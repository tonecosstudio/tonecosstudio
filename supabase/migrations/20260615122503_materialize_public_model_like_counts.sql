BEGIN;

CREATE TABLE public.model_like_counts (
  model_id uuid PRIMARY KEY
    REFERENCES public.models(id) ON DELETE CASCADE,
  likes_count integer NOT NULL DEFAULT 0
    CHECK (likes_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.model_like_counts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.model_like_counts
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.model_like_counts TO anon, authenticated;
GRANT ALL ON TABLE public.model_like_counts TO service_role;

CREATE POLICY model_like_counts_select_public
  ON public.model_like_counts
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.sync_model_like_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.model_like_counts (model_id, likes_count)
    VALUES (NEW.model_id, 1)
    ON CONFLICT (model_id) DO UPDATE
      SET likes_count = public.model_like_counts.likes_count + 1,
          updated_at = now();

    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    UPDATE public.model_like_counts
    SET likes_count = GREATEST(likes_count - 1, 0),
        updated_at = now()
    WHERE model_id = OLD.model_id;

    RETURN OLD;
  END IF;

  IF OLD.model_id IS DISTINCT FROM NEW.model_id THEN
    UPDATE public.model_like_counts
    SET likes_count = GREATEST(likes_count - 1, 0),
        updated_at = now()
    WHERE model_id = OLD.model_id;

    INSERT INTO public.model_like_counts (model_id, likes_count)
    VALUES (NEW.model_id, 1)
    ON CONFLICT (model_id) DO UPDATE
      SET likes_count = public.model_like_counts.likes_count + 1,
          updated_at = now();
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.sync_model_like_counts()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_model_like_counts() TO service_role;

DROP TRIGGER IF EXISTS sync_model_like_counts_after_change
  ON public.model_likes;
CREATE TRIGGER sync_model_like_counts_after_change
  AFTER INSERT OR DELETE OR UPDATE OF model_id
  ON public.model_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_model_like_counts();

INSERT INTO public.model_like_counts (model_id, likes_count)
SELECT model_id, count(*)::integer
FROM public.model_likes
GROUP BY model_id
ON CONFLICT (model_id) DO UPDATE
  SET likes_count = EXCLUDED.likes_count,
      updated_at = now();

CREATE OR REPLACE FUNCTION public.get_model_likes_count(model_uuid uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
  SELECT COALESCE(
    (
      SELECT counts.likes_count
      FROM public.model_like_counts AS counts
      WHERE counts.model_id = model_uuid
    ),
    0
  );
$function$;

COMMENT ON TABLE public.model_like_counts IS
  'Public aggregate of model likes without exposing collector identities.';
COMMENT ON FUNCTION public.get_model_likes_count(uuid) IS
  'Returns the public materialized like count for a catalog model.';

NOTIFY pgrst, 'reload schema';

COMMIT;
