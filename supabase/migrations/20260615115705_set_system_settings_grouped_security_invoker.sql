-- Security Advisor 0010: ensure this API-exposed view respects caller permissions/RLS.

ALTER VIEW public.system_settings_grouped
  SET (security_invoker = true);

NOTIFY pgrst, 'reload schema';
