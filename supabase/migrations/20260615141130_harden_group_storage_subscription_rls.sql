-- Harden exposed subscription join table and group attachment storage access.

ALTER TABLE public.subscription_collections ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.subscription_collections FROM anon, authenticated;
GRANT SELECT ON public.subscription_collections TO authenticated;
GRANT ALL ON public.subscription_collections TO service_role;

DROP POLICY IF EXISTS "subscription_collections_select_own_or_admin"
  ON public.subscription_collections;

CREATE POLICY "subscription_collections_select_own_or_admin"
  ON public.subscription_collections
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.subscriptions subscription
      WHERE subscription.id = subscription_collections.subscription_id
        AND subscription.user_id = auth.uid()
    )
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'group-attachments',
  'group-attachments',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "group_attachments_select_member_or_admin"
  ON storage.objects;
DROP POLICY IF EXISTS "group_attachments_insert_admin"
  ON storage.objects;
DROP POLICY IF EXISTS "group_attachments_delete_admin"
  ON storage.objects;

CREATE POLICY "group_attachments_select_member_or_admin"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'group-attachments'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1
        FROM public.chat_group_members member
        WHERE member.group_id::text = split_part(storage.objects.name, '/', 1)
          AND member.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "group_attachments_insert_admin"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'group-attachments'
    AND public.has_role(auth.uid(), 'admin')
    AND storage.objects.name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/].*'
    AND EXISTS (
      SELECT 1
      FROM public.chat_groups chat_group
      WHERE chat_group.id::text = split_part(storage.objects.name, '/', 1)
        AND chat_group.deleted_at IS NULL
    )
  );

CREATE POLICY "group_attachments_delete_admin"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'group-attachments'
    AND public.has_role(auth.uid(), 'admin')
  );
