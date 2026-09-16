DROP POLICY IF EXISTS order_status_history_select_admin ON public.order_status_history;
DROP POLICY IF EXISTS order_status_history_select_owner_or_admin ON public.order_status_history;

CREATE POLICY order_status_history_select_owner_or_admin
ON public.order_status_history
FOR SELECT
TO authenticated
USING (
  public.has_role((SELECT auth.uid()), 'admin')
  OR (
    order_type = 'manual_payment'
    AND EXISTS (
      SELECT 1
      FROM public.manual_payments mp
      WHERE mp.id = order_status_history.order_id
        AND mp.user_id = (SELECT auth.uid())
    )
  )
);

NOTIFY pgrst, 'reload schema';
