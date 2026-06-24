BEGIN;

-- Replaced by the current admin user services and direct profile completion
-- maintenance. Keeping these RPCs would preserve duplicate authorization and
-- stale result contracts in the exposed API.
DROP FUNCTION public.admin_list_users();
DROP FUNCTION public.calculate_profile_completion(uuid);

-- The AI processing pipeline has no browser, Edge Function, script, trigger,
-- policy, or database-function consumers. Preserve it only for trusted
-- service-side orchestration.
REVOKE EXECUTE
  ON FUNCTION public.upsert_ai_name_cache(
    text, text, text, text, text[], text
  )
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE
  ON FUNCTION public.upsert_ai_name_cache(
    text, text, text, text, text[], text
  )
  TO service_role;

REVOKE EXECUTE
  ON FUNCTION public.upsert_ai_vision_cache(
    text, text, text, text, text, text[], numeric, text, numeric
  )
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE
  ON FUNCTION public.upsert_ai_vision_cache(
    text, text, text, text, text, text[], numeric, text, numeric
  )
  TO service_role;

REVOKE EXECUTE
  ON FUNCTION public.update_image_queue_ai_result(
    uuid, text, numeric, text
  )
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE
  ON FUNCTION public.update_image_queue_ai_result(
    uuid, text, numeric, text
  )
  TO service_role;

REVOKE EXECUTE
  ON FUNCTION public.create_ai_processing_job(integer, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE
  ON FUNCTION public.create_ai_processing_job(integer, text)
  TO service_role;

REVOKE EXECUTE
  ON FUNCTION public.update_ai_processing_job_progress(
    uuid, integer, integer, numeric
  )
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE
  ON FUNCTION public.update_ai_processing_job_progress(
    uuid, integer, integer, numeric
  )
  TO service_role;

REVOKE EXECUTE
  ON FUNCTION public.complete_ai_processing_job(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE
  ON FUNCTION public.complete_ai_processing_job(uuid, text)
  TO service_role;

REVOKE EXECUTE
  ON FUNCTION public.confirm_image_queue_model(
    uuid, uuid, text, text, text, text, text[], text, text, text
  )
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE
  ON FUNCTION public.confirm_image_queue_model(
    uuid, uuid, text, text, text, text, text[], text, text, text
  )
  TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
