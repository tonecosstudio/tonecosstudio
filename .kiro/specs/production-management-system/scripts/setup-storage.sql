-- ============================================================================
-- PRODUCTION MANAGEMENT SYSTEM - STORAGE BUCKET SETUP
-- ============================================================================
-- Purpose: Create and configure Supabase Storage bucket for production photos
-- Usage: Run this script to set up the storage bucket and RLS policies
-- ============================================================================

-- ============================================================================
-- STEP 1: Create Storage Bucket
-- ============================================================================

-- Create the production-photos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'production-photos',
  'production-photos',
  false,  -- Private bucket (not publicly accessible)
  5242880,  -- 5MB in bytes (5 * 1024 * 1024)
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Verify bucket was created
SELECT 
  'Storage Bucket Created' as status,
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'production-photos';

-- ============================================================================
-- STEP 2: Create RLS Policies for Storage
-- ============================================================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Admins can upload production photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all production photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update production photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete production photos" ON storage.objects;
DROP POLICY IF EXISTS "Customers can view their order photos" ON storage.objects;

-- Policy 1: Admins can upload production photos
CREATE POLICY "Admins can upload production photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'production-photos'
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Policy 2: Admins can view all production photos
CREATE POLICY "Admins can view all production photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'production-photos'
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Policy 3: Admins can update production photos (metadata)
CREATE POLICY "Admins can update production photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'production-photos'
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Policy 4: Admins can delete production photos
CREATE POLICY "Admins can delete production photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'production-photos'
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Policy 5: Customers can view photos for their own orders
-- Photos are organized by order_id: production-photos/{order_id}/{filename}
CREATE POLICY "Customers can view their order photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'production-photos'
  AND (
    -- Extract order_id from path (first folder in path)
    (storage.foldername(name))[1] IN (
      -- Get all order IDs for this customer from production_queue
      SELECT order_id::text FROM production_queue
      WHERE customer_id = auth.uid()
    )
  )
);

-- Verify policies were created
SELECT 
  'Storage Policies Created' as status,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%production photos%'
ORDER BY policyname;

-- ============================================================================
-- STEP 3: Create Helper Functions for Storage
-- ============================================================================

-- Function to generate storage path for production photos
CREATE OR REPLACE FUNCTION generate_production_photo_path(
  p_order_id UUID,
  p_stage_name TEXT,
  p_filename TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  -- Path format: {order_id}/{stage_name}/{timestamp}_{filename}
  RETURN p_order_id::text || '/' || 
         p_stage_name || '/' || 
         EXTRACT(EPOCH FROM NOW())::bigint || '_' || 
         p_filename;
END;
$$;

-- Function to get signed URL for production photo
CREATE OR REPLACE FUNCTION get_production_photo_url(
  p_storage_path TEXT,
  p_expires_in INTEGER DEFAULT 3600  -- 1 hour default
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url TEXT;
BEGIN
  -- This is a placeholder - actual implementation depends on your Supabase setup
  -- In practice, you'll use the Supabase client library to generate signed URLs
  -- This function is here for documentation purposes
  
  RETURN 'https://your-project.supabase.co/storage/v1/object/sign/production-photos/' || p_storage_path;
END;
$$;

-- Function to delete production photos for an order
CREATE OR REPLACE FUNCTION delete_production_photos(
  p_order_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete from production_photo_metadata table
  DELETE FROM production_photo_metadata
  WHERE production_queue_id IN (
    SELECT id FROM production_queue WHERE order_id = p_order_id
  );
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- Note: Actual file deletion from storage must be done via Supabase client
  -- This function only handles database records
  
  RETURN v_deleted_count;
END;
$$;

-- ============================================================================
-- STEP 4: Create Storage Folder Structure (Documentation)
-- ============================================================================

-- Storage folder structure:
-- production-photos/
--   ├── {order_id_1}/
--   │   ├── design/
--   │   │   ├── 1234567890_sketch.jpg
--   │   │   └── 1234567891_model.png
--   │   ├── production/
--   │   │   ├── 1234567892_progress.jpg
--   │   │   └── 1234567893_detail.jpg
--   │   ├── quality_check/
--   │   │   └── 1234567894_inspection.jpg
--   │   └── packaging/
--   │       └── 1234567895_final.jpg
--   └── {order_id_2}/
--       └── ...

-- ============================================================================
-- STEP 5: Verify Storage Setup
-- ============================================================================

-- Check bucket exists and is configured correctly
SELECT 
  'Bucket Configuration' as check_type,
  CASE 
    WHEN id = 'production-photos' 
      AND public = false 
      AND file_size_limit = 5242880 
      AND 'image/jpeg' = ANY(allowed_mime_types)
    THEN 'CONFIGURED CORRECTLY ✓'
    ELSE 'CHECK CONFIGURATION ✗'
  END as status,
  id,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'production-photos';

-- Check RLS is enabled on storage.objects
SELECT 
  'RLS Status' as check_type,
  tablename,
  CASE 
    WHEN rowsecurity THEN 'ENABLED ✓'
    ELSE 'DISABLED ✗'
  END as rls_status
FROM pg_tables 
WHERE schemaname = 'storage' 
  AND tablename = 'objects';

-- Count policies
SELECT 
  'Policy Count' as check_type,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) >= 5 THEN 'SUFFICIENT ✓'
    ELSE 'MISSING POLICIES ✗'
  END as status
FROM pg_policies 
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%production photos%';

-- List all policies
SELECT 
  'Policy Details' as info_type,
  policyname,
  cmd as operation,
  CASE 
    WHEN roles = '{authenticated}' THEN 'authenticated'
    ELSE roles::text
  END as roles
FROM pg_policies 
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%production photos%'
ORDER BY cmd, policyname;

-- ============================================================================
-- STEP 6: Test Storage Setup (Manual Testing Required)
-- ============================================================================

-- To test storage setup:
-- 1. Upload a test photo via the dashboard
-- 2. Verify it appears in Supabase Storage UI
-- 3. Try to access the photo as an admin (should work)
-- 4. Try to access the photo as a customer (should work for their orders only)
-- 5. Try to access the photo as anonymous user (should fail)

-- ============================================================================
-- STEP 7: Storage Maintenance Functions
-- ============================================================================

-- Function to get storage usage statistics
CREATE OR REPLACE FUNCTION get_storage_usage_stats()
RETURNS TABLE (
  total_files BIGINT,
  total_size_bytes BIGINT,
  total_size_mb NUMERIC,
  avg_file_size_bytes NUMERIC,
  oldest_file TIMESTAMP WITH TIME ZONE,
  newest_file TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_files,
    COALESCE(SUM((metadata->>'size')::bigint), 0)::BIGINT as total_size_bytes,
    ROUND(COALESCE(SUM((metadata->>'size')::bigint), 0) / 1024.0 / 1024.0, 2) as total_size_mb,
    ROUND(AVG((metadata->>'size')::bigint), 2) as avg_file_size_bytes,
    MIN(created_at) as oldest_file,
    MAX(created_at) as newest_file
  FROM storage.objects
  WHERE bucket_id = 'production-photos';
END;
$$;

-- Function to find large files (> 4MB)
CREATE OR REPLACE FUNCTION find_large_production_photos()
RETURNS TABLE (
  file_path TEXT,
  file_size_mb NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    name as file_path,
    ROUND((metadata->>'size')::bigint / 1024.0 / 1024.0, 2) as file_size_mb,
    created_at
  FROM storage.objects
  WHERE bucket_id = 'production-photos'
    AND (metadata->>'size')::bigint > 4194304  -- 4MB
  ORDER BY (metadata->>'size')::bigint DESC;
END;
$$;

-- Function to clean up old photos (older than 1 year)
CREATE OR REPLACE FUNCTION cleanup_old_production_photos(
  p_days_old INTEGER DEFAULT 365
)
RETURNS TABLE (
  deleted_count INTEGER,
  freed_space_mb NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
  v_freed_space BIGINT;
BEGIN
  -- Calculate space to be freed
  SELECT 
    COUNT(*)::INTEGER,
    COALESCE(SUM((metadata->>'size')::bigint), 0)
  INTO v_deleted_count, v_freed_space
  FROM storage.objects
  WHERE bucket_id = 'production-photos'
    AND created_at < NOW() - (p_days_old || ' days')::INTERVAL;
  
  -- Delete old photos from metadata table
  DELETE FROM production_photo_metadata
  WHERE created_at < NOW() - (p_days_old || ' days')::INTERVAL;
  
  -- Note: Actual file deletion from storage must be done via Supabase client
  -- This function only handles database records
  
  RETURN QUERY
  SELECT 
    v_deleted_count,
    ROUND(v_freed_space / 1024.0 / 1024.0, 2);
END;
$$;

-- ============================================================================
-- COMPLETION CHECKLIST
-- ============================================================================
-- [ ] Storage bucket 'production-photos' created
-- [ ] Bucket is private (public = false)
-- [ ] File size limit set to 5MB
-- [ ] Allowed MIME types configured (jpeg, png, webp)
-- [ ] RLS enabled on storage.objects
-- [ ] Admin upload policy created
-- [ ] Admin view policy created
-- [ ] Admin update policy created
-- [ ] Admin delete policy created
-- [ ] Customer view policy created
-- [ ] Helper functions created
-- [ ] Storage usage stats function created
-- [ ] Large files finder function created
-- [ ] Cleanup function created
-- [ ] Manual upload test completed
-- [ ] Manual access test completed (admin)
-- [ ] Manual access test completed (customer)
-- [ ] Manual access test completed (anonymous - should fail)

SELECT 'Storage bucket setup complete! ✓' as status;

-- ============================================================================
-- NEXT STEPS
-- ============================================================================
-- 1. Test photo upload via dashboard
-- 2. Verify RLS policies work correctly
-- 3. Configure email service (see configure-email.md)
-- 4. Run full integration tests
