-- Restore the read path used by pricing-tier admin screens without reopening browser writes.

DROP POLICY IF EXISTS "collection_tier_assignments_modify_admin"
  ON public.collection_tier_assignments;
DROP POLICY IF EXISTS "collection_tier_assignments_select_admin"
  ON public.collection_tier_assignments;

CREATE POLICY "collection_tier_assignments_select_admin"
  ON public.collection_tier_assignments
  FOR SELECT
  TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'));

GRANT SELECT ON TABLE public.collection_tier_assignments TO authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.collection_tier_assignments FROM authenticated;
