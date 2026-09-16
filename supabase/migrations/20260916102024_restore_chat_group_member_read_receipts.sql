-- Restore the minimum browser capability required by the existing group UI.
-- Membership mutations remain server-authoritative: authenticated users receive
-- SELECT plus UPDATE only on the non-authoritative last_viewed_at telemetry column.

REVOKE ALL ON TABLE public.chat_group_members FROM anon, authenticated;
GRANT SELECT ON TABLE public.chat_group_members TO authenticated;
GRANT UPDATE (last_viewed_at) ON TABLE public.chat_group_members TO authenticated;

DROP POLICY IF EXISTS chat_group_members_select_access ON public.chat_group_members;
CREATE POLICY chat_group_members_select_access
  ON public.chat_group_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.has_role((SELECT auth.uid()), 'admin'::text)
  );

DROP POLICY IF EXISTS chat_group_members_update_own ON public.chat_group_members;
CREATE POLICY chat_group_members_update_own
  ON public.chat_group_members
  FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.has_role((SELECT auth.uid()), 'admin'::text)
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR public.has_role((SELECT auth.uid()), 'admin'::text)
  );

-- Keep defense-in-depth policies for any future server-side grant changes,
-- while avoiding per-row auth.uid() re-evaluation.
DROP POLICY IF EXISTS chat_group_members_insert_admin ON public.chat_group_members;
CREATE POLICY chat_group_members_insert_admin
  ON public.chat_group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::text));

DROP POLICY IF EXISTS chat_group_members_delete_admin ON public.chat_group_members;
CREATE POLICY chat_group_members_delete_admin
  ON public.chat_group_members
  FOR DELETE
  TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::text));
