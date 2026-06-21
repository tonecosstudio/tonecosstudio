-- Email delivery logs are internal telemetry. Browser code now sends tracking
-- context to the send-email Edge Function, which writes logs with service_role.

REVOKE ALL ON FUNCTION public.create_email_delivery_log(uuid, text, text, text, text, text, jsonb)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_email_delivery_log(uuid, jsonb)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_email_delivery_log(uuid, text, text, text, text, text, jsonb)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.update_email_delivery_log(uuid, jsonb)
  TO service_role;

COMMENT ON FUNCTION public.create_email_delivery_log(uuid, text, text, text, text, text, jsonb) IS
  'Service-role RPC used by Edge Functions to create email delivery logs.';
COMMENT ON FUNCTION public.update_email_delivery_log(uuid, jsonb) IS
  'Service-role RPC used by Edge Functions and webhooks to update email delivery logs.';
