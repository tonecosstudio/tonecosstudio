-- =====================================================
-- Migration: Create support-attachments storage bucket
-- Date: 2026-02-21
-- Description: Create storage bucket for chat attachments with proper RLS policies
-- =====================================================

-- 1. Create bucket (not public - requires authentication)
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-attachments', 'support-attachments', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- 2. Policy: Authenticated users can upload to their own conversation folders
CREATE POLICY "Users can upload to support-attachments bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'support-attachments' AND
  -- Path format: {conversation_id}/{filename}
  -- Users can only upload to conversations they're part of
  (
    -- Check if user is the conversation owner (customer)
    EXISTS (
      SELECT 1 FROM support_conversations
      WHERE id::text = (string_to_array(name, '/'))[1]
      AND user_id = auth.uid()
    )
    OR
    -- Or user is an admin
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  )
);

-- 3. Policy: Users can read attachments from their conversations
CREATE POLICY "Users can view files in support-attachments bucket"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'support-attachments' AND
  (
    -- Check if user is the conversation owner (customer)
    EXISTS (
      SELECT 1 FROM support_conversations
      WHERE id::text = (string_to_array(name, '/'))[1]
      AND user_id = auth.uid()
    )
    OR
    -- Or user is an admin
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  )
);

-- 4. Policy: Admins can update files
CREATE POLICY "Admins can update files in support-attachments bucket"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'support-attachments' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'support-attachments' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- 5. Policy: Admins can delete files
CREATE POLICY "Admins can delete files in support-attachments bucket"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'support-attachments' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- 6. Verify bucket creation
SELECT 
  'Bucket criado:' as status, 
  id, 
  name, 
  public,
  created_at
FROM storage.buckets 
WHERE id = 'support-attachments';

-- 7. Verify policies
SELECT 
  'PolÃƒÂ­ticas criadas:' as status,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%support-attachments%';
