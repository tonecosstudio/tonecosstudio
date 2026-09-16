-- Group lifecycle and monthly production state are admin-authoritative.
-- Browser admins already route mutations through the authenticated admin-rpc
-- Edge Function, which validates the canonical profile role and executes the
-- server-side RPC with service_role. Keep direct browser access read-only.

REVOKE INSERT, UPDATE, DELETE ON TABLE public.chat_groups FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.monthly_production FROM authenticated;

GRANT SELECT ON TABLE public.chat_groups TO authenticated;
GRANT SELECT ON TABLE public.monthly_production TO authenticated;

NOTIFY pgrst, 'reload schema';
