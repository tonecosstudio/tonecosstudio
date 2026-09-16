-- Monthly sales state is commercial authority and must be server-authored.
-- Browser admins call the authenticated admin-rpc Edge Function, which validates
-- the canonical profile role and invokes these RPCs with service_role.

REVOKE EXECUTE ON FUNCTION public.close_monthly_sales(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.close_monthly_sales(text)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.reopen_monthly_sales()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_monthly_sales()
  TO service_role;

REVOKE EXECUTE ON FUNCTION private_api.close_monthly_sales(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private_api.close_monthly_sales(text)
  TO service_role;

REVOKE EXECUTE ON FUNCTION private_api.reopen_monthly_sales()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private_api.reopen_monthly_sales()
  TO service_role;

NOTIFY pgrst, 'reload schema';
