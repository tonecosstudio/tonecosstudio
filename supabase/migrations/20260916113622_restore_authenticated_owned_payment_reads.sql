-- Browser services legitimately read payment metadata under owner/admin RLS.
-- Restore SELECT only; all mutations remain server-authoritative.
GRANT SELECT ON public.payment_files TO authenticated;
GRANT SELECT ON public.subscription_payments TO authenticated;
