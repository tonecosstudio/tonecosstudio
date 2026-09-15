-- Harden the canonical manual-payment proof bucket.
-- New proof objects are uploaded by an authenticated Edge Function with the service role.
-- There is intentionally NO INSERT/UPDATE policy for authenticated browser clients.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "payment_proofs_select_owner_or_admin" ON storage.objects;
DROP POLICY IF EXISTS "payment_proofs_delete_admin" ON storage.objects;
DROP POLICY IF EXISTS "payment_proofs_insert_owner" ON storage.objects;
DROP POLICY IF EXISTS "payment_proofs_update_owner" ON storage.objects;

CREATE POLICY "payment_proofs_select_owner_or_admin"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND split_part(storage.objects.name, '/', 1) ~
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'super_admin')
      OR EXISTS (
        SELECT 1
          FROM public.manual_payments mp
         WHERE mp.id::text = split_part(storage.objects.name, '/', 1)
           AND mp.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "payment_proofs_delete_admin"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'super_admin')
    )
  );

COMMENT ON POLICY "payment_proofs_select_owner_or_admin" ON storage.objects IS
  'Payment proofs are private; only the payment owner or an administrator may read them.';
COMMENT ON POLICY "payment_proofs_delete_admin" ON storage.objects IS
  'Payment proof deletion is administrative. Browser clients cannot insert or update proof objects.';
