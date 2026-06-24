BEGIN;

-- These RPCs only read tables that already expose the same rows through RLS.
-- Execute them with the caller's privileges instead of bypassing RLS.
ALTER FUNCTION public.are_sales_open() SECURITY INVOKER;
ALTER FUNCTION public.get_active_exchange_rate() SECURITY INVOKER;
ALTER FUNCTION public.get_system_settings() SECURITY INVOKER;

-- Authorization is centralized in current_user_role() and has_role(uuid, text).
-- These unused overloads duplicate that contract and broaden the public API.
DROP FUNCTION public.get_user_role();
DROP FUNCTION public.has_role(public.user_role);
DROP FUNCTION public.is_super_admin();

NOTIFY pgrst, 'reload schema';

COMMIT;
