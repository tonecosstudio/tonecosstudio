-- These are self-service profile/preference mutations. They should execute as
-- the caller so table RLS remains the authorization boundary.

GRANT EXECUTE ON FUNCTION public.validate_email_notification_preferences(jsonb)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_customer_notification_preferences(jsonb)
  TO authenticated;

-- Required for SECURITY INVOKER upserts; RLS still constrains rows to the
-- current user or an admin.
GRANT INSERT, UPDATE ON public.notification_preferences TO authenticated;

-- Keep this intentionally narrow. Do not grant UPDATE on role/email/admin
-- profile columns to the browser role.
GRANT UPDATE (notification_preferences, updated_at) ON public.profiles TO authenticated;

ALTER FUNCTION public.upsert_email_notification_preferences(uuid, jsonb) SECURITY INVOKER;
ALTER FUNCTION public.update_customer_notification_preferences(jsonb) SECURITY INVOKER;

COMMENT ON FUNCTION public.upsert_email_notification_preferences(uuid, jsonb) IS
  'Security invoker self-service wrapper; authorization is enforced by notification_preferences RLS.';
COMMENT ON FUNCTION public.update_customer_notification_preferences(jsonb) IS
  'Security invoker self-service wrapper; authorization is enforced by profiles RLS and column grants.';
