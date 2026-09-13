BEGIN;

-- Commercial state must not be authored directly through PostgREST browser DML.
-- Customer/admin mutations already have validated RPC/Edge boundaries; retain
-- SELECT according to existing RLS and remove the stale write grants left by
-- historical broad authenticated grants.

REVOKE INSERT, UPDATE, DELETE
  ON TABLE public.quotes
  FROM authenticated;

REVOKE INSERT, UPDATE, DELETE
  ON TABLE public.standalone_purchases
  FROM authenticated;

REVOKE INSERT, UPDATE, DELETE
  ON TABLE public.subscriptions
  FROM authenticated;

COMMIT;
