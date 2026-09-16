-- Restrict authenticated chat group metadata reads to actual members or admins.
-- Previously chat_groups_select_all used USING (true), allowing any authenticated
-- user to enumerate metadata for groups they did not belong to.

DROP POLICY IF EXISTS chat_groups_select_all ON public.chat_groups;

CREATE POLICY chat_groups_select_member_or_admin
ON public.chat_groups
FOR SELECT
TO authenticated
USING (
  public.has_role((SELECT auth.uid()), 'admin')
  OR EXISTS (
    SELECT 1
    FROM public.chat_group_members member
    WHERE member.group_id = chat_groups.id
      AND member.user_id = (SELECT auth.uid())
  )
);

NOTIFY pgrst, 'reload schema';
