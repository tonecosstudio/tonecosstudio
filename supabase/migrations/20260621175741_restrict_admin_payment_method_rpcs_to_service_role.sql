-- Admin payment-method mutations now flow through the admin-payment-methods
-- Edge Function. Keep the underlying privileged RPCs callable only by
-- service_role so they are no longer browser-callable through PostgREST.

REVOKE ALL ON FUNCTION public.admin_create_payment_method(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_update_payment_method(uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_set_default_payment_method(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_toggle_payment_method_active(uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_delete_payment_method(uuid) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION private_api.admin_create_payment_method(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private_api.admin_update_payment_method(uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private_api.admin_set_default_payment_method(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private_api.admin_toggle_payment_method_active(uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private_api.admin_delete_payment_method(uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_create_payment_method(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_payment_method(uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_default_payment_method(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_toggle_payment_method_active(uuid, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_payment_method(uuid) TO service_role;

GRANT EXECUTE ON FUNCTION private_api.admin_create_payment_method(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION private_api.admin_update_payment_method(uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION private_api.admin_set_default_payment_method(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION private_api.admin_toggle_payment_method_active(uuid, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION private_api.admin_delete_payment_method(uuid) TO service_role;

COMMENT ON FUNCTION public.admin_create_payment_method(jsonb) IS
  'Service-role RPC used by the admin-payment-methods Edge Function.';
COMMENT ON FUNCTION public.admin_update_payment_method(uuid, jsonb) IS
  'Service-role RPC used by the admin-payment-methods Edge Function.';
COMMENT ON FUNCTION public.admin_set_default_payment_method(uuid) IS
  'Service-role RPC used by the admin-payment-methods Edge Function.';
COMMENT ON FUNCTION public.admin_toggle_payment_method_active(uuid, boolean) IS
  'Service-role RPC used by the admin-payment-methods Edge Function.';
COMMENT ON FUNCTION public.admin_delete_payment_method(uuid) IS
  'Service-role RPC used by the admin-payment-methods Edge Function.';
