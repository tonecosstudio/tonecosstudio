-- Security Advisor 0011: pin search_path on existing public functions.
-- This only changes function execution metadata; function bodies and grants are unchanged.

ALTER FUNCTION public.update_stripe_updated_at()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.trigger_update_profile_completion()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.handle_updated_at()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.update_last_message_at()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.sync_collection_character_from_character()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.sync_character_to_collection_characters()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.user_liked_model(uuid, uuid)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.is_in_wishlist(uuid, uuid)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.get_wishlist_count(uuid)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.get_most_wished_models(integer)
  SET search_path = public, pg_temp;

NOTIFY pgrst, 'reload schema';
