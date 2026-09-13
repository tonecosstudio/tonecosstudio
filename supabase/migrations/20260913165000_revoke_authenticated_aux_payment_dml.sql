BEGIN;

-- Admin order history and payment information requests are written only through
-- validated admin RPCs. Browser sessions keep read access under RLS but must not
-- bypass those server-authoritative mutation contracts through PostgREST.

REVOKE INSERT, UPDATE, DELETE
  ON TABLE public.order_status_history
  FROM authenticated;

REVOKE INSERT, UPDATE, DELETE
  ON TABLE public.payment_info_requests
  FROM authenticated;

DROP POLICY IF EXISTS "order_status_history_insert_admin"
  ON public.order_status_history;

DROP POLICY IF EXISTS "payment_info_requests_admin_manage"
  ON public.payment_info_requests;

-- Preserve the existing read surfaces explicitly.
GRANT SELECT ON TABLE public.order_status_history TO authenticated;
GRANT SELECT ON TABLE public.payment_info_requests TO authenticated;

COMMIT;
