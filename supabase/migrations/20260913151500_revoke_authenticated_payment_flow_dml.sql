BEGIN;

-- Payment links and quote payments are commercial truth. Browser sessions,
-- including admin sessions, must mutate them through the validated admin RPC
-- boundary rather than PostgREST table DML.
--
-- SELECT remains governed by the existing RLS policies. This migration only
-- removes direct write authority from authenticated sessions.

REVOKE INSERT, UPDATE, DELETE
  ON TABLE public.payment_links
  FROM authenticated;

REVOKE INSERT, UPDATE, DELETE
  ON TABLE public.quote_payments
  FROM authenticated;

COMMIT;
