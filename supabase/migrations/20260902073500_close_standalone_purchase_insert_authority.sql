REVOKE INSERT ON TABLE public.standalone_purchases FROM authenticated;
DROP POLICY IF EXISTS standalone_purchases_insert_own ON public.standalone_purchases;
