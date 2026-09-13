BEGIN;

-- Manual payments are financial truth. Customer creation is performed inside
-- server-authoritative checkout/payment contracts, while admin review/status
-- transitions use validated admin RPCs. Browser sessions only need RLS-governed
-- SELECT access to these rows.

REVOKE INSERT, UPDATE, DELETE
  ON TABLE public.manual_payments
  FROM authenticated;

COMMIT;
