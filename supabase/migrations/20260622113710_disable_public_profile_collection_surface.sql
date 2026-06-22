-- Public profile pages are not part of the launch surface.
-- Keep collector data available only to authenticated users through owner/admin RLS paths.

REVOKE SELECT ON public.public_collection FROM anon;

DROP POLICY IF EXISTS public_collection_select_public
  ON public.public_collection;

CREATE POLICY public_collection_select_owner_admin
  ON public.public_collection
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR current_user_role() = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
  );
