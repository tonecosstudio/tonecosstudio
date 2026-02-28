-- Migration: Create payment-vouchers storage bucket
-- Task: 25.1 - Create payment voucher upload component
-- Requirements: 25.1, 25.2
-- Description: Creates the Supabase Storage bucket for payment vouchers with appropriate RLS policies

-- Create payment-vouchers bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-vouchers',
  'payment-vouchers',
  true, -- Public bucket for easy access
  5242880, -- 5MB limit (5 * 1024 * 1024 bytes)
  ARRAY['image/jpeg', 'image/png', 'application/pdf'] -- Allowed MIME types
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Allow authenticated users to upload files
CREATE POLICY IF NOT EXISTS "Allow authenticated users to upload payment vouchers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-vouchers' AND
  -- Ensure file size is within limit (5MB)
  (octet_length(decode(encode(storage.foldername(name), 'escape'), 'base64')) <= 5242880)
);

-- RLS Policy: Allow public read access to payment vouchers
CREATE POLICY IF NOT EXISTS "Allow public read access to payment vouchers"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'payment-vouchers');

-- RLS Policy: Allow users to update their own files
CREATE POLICY IF NOT EXISTS "Allow users to update their own payment vouchers"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'payment-vouchers' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policy: Allow users to delete their own files
CREATE POLICY IF NOT EXISTS "Allow users to delete their own payment vouchers"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-vouchers' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policy: Allow admins to manage all files
CREATE POLICY IF NOT EXISTS "Allow admins to manage all payment vouchers"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'payment-vouchers' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Add comment to bucket
COMMENT ON TABLE storage.buckets IS 'Storage buckets for file uploads';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_storage_objects_payment_vouchers
ON storage.objects (bucket_id, name)
WHERE bucket_id = 'payment-vouchers';
