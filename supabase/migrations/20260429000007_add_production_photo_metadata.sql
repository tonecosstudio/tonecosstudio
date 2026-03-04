-- =====================================================
-- MIGRATION: Add production photo metadata table
-- Date: 2026-04-29
-- Description: Creates a table to store metadata for production photos including customer visibility
-- Task: 4.4.3 Implement photo permissions
-- =====================================================

-- =====================================================
-- 1. CREATE PRODUCTION_PHOTO_METADATA TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS production_photo_metadata (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Photo reference
  photo_url TEXT NOT NULL UNIQUE,
  production_stage_id UUID NOT NULL REFERENCES production_stages(id) ON DELETE CASCADE,
  
  -- Visibility control
  customer_visible BOOLEAN NOT NULL DEFAULT false,
  
  -- Metadata
  caption TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_by_name TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Audit timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for photo URL lookups (most common query)
CREATE INDEX IF NOT EXISTS idx_production_photo_metadata_url ON production_photo_metadata(photo_url);

-- Index for stage lookups
CREATE INDEX IF NOT EXISTS idx_production_photo_metadata_stage ON production_photo_metadata(production_stage_id);

-- Index for customer-visible photos
CREATE INDEX IF NOT EXISTS idx_production_photo_metadata_customer_visible ON production_photo_metadata(customer_visible) 
  WHERE customer_visible = true;

-- =====================================================
-- 3. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE production_photo_metadata IS 'Stores metadata for production stage photos including visibility permissions';

COMMENT ON COLUMN production_photo_metadata.photo_url IS 'URL of the photo in Supabase Storage';
COMMENT ON COLUMN production_photo_metadata.production_stage_id IS 'ID of the production stage this photo belongs to';
COMMENT ON COLUMN production_photo_metadata.customer_visible IS 'Whether customers can see this photo (typically only final product photos)';
COMMENT ON COLUMN production_photo_metadata.caption IS 'Optional caption for the photo';
COMMENT ON COLUMN production_photo_metadata.uploaded_by IS 'ID of user who uploaded the photo';
COMMENT ON COLUMN production_photo_metadata.uploaded_by_name IS 'Name of user who uploaded the photo (denormalized)';
COMMENT ON COLUMN production_photo_metadata.uploaded_at IS 'Timestamp when photo was uploaded';

-- =====================================================
-- 4. CREATE TRIGGER FOR UPDATED_AT TIMESTAMP
-- =====================================================

CREATE OR REPLACE FUNCTION update_production_photo_metadata_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_production_photo_metadata_updated_at
  BEFORE UPDATE ON production_photo_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_production_photo_metadata_updated_at();

-- =====================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE production_photo_metadata ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all photo metadata
CREATE POLICY "Admins can view all photo metadata"
  ON production_photo_metadata FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Admins can insert photo metadata
CREATE POLICY "Admins can insert photo metadata"
  ON production_photo_metadata FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Admins can update photo metadata
CREATE POLICY "Admins can update photo metadata"
  ON production_photo_metadata FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Admins can delete photo metadata
CREATE POLICY "Admins can delete photo metadata"
  ON production_photo_metadata FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Customers can view customer-visible photos for their own orders
CREATE POLICY "Customers can view customer-visible photos"
  ON production_photo_metadata FOR SELECT
  USING (
    customer_visible = true
    AND EXISTS (
      SELECT 1 FROM production_stages ps
      JOIN production_queue pq ON ps.production_queue_id = pq.id
      WHERE ps.id = production_photo_metadata.production_stage_id
      AND pq.customer_id = auth.uid()
    )
  );

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================

-- Grant SELECT to authenticated users (via RLS)
GRANT SELECT ON production_photo_metadata TO authenticated;

-- Grant INSERT, UPDATE, DELETE to authenticated users (via RLS)
GRANT INSERT, UPDATE, DELETE ON production_photo_metadata TO authenticated;

-- Grant all to service role
GRANT ALL ON production_photo_metadata TO service_role;

-- =====================================================
-- 7. CREATE HELPER FUNCTION TO GET PHOTOS WITH METADATA
-- =====================================================

CREATE OR REPLACE FUNCTION get_stage_photos_with_metadata(
  p_stage_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
  photo_url TEXT,
  customer_visible BOOLEAN,
  caption TEXT,
  uploaded_by_name TEXT,
  uploaded_at TIMESTAMPTZ
) AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_is_customer BOOLEAN;
BEGIN
  -- Check if user is admin
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = p_user_id
    AND user_roles.role = 'admin'
  ) INTO v_is_admin;
  
  -- Check if user is the customer for this order
  SELECT EXISTS (
    SELECT 1 FROM production_stages ps
    JOIN production_queue pq ON ps.production_queue_id = pq.id
    WHERE ps.id = p_stage_id
    AND pq.customer_id = p_user_id
  ) INTO v_is_customer;
  
  -- Return photos based on permissions
  IF v_is_admin THEN
    -- Admins see all photos
    RETURN QUERY
    SELECT 
      ppm.photo_url,
      ppm.customer_visible,
      ppm.caption,
      ppm.uploaded_by_name,
      ppm.uploaded_at
    FROM production_photo_metadata ppm
    WHERE ppm.production_stage_id = p_stage_id
    ORDER BY ppm.uploaded_at DESC;
  ELSIF v_is_customer THEN
    -- Customers see only customer-visible photos
    RETURN QUERY
    SELECT 
      ppm.photo_url,
      ppm.customer_visible,
      ppm.caption,
      ppm.uploaded_by_name,
      ppm.uploaded_at
    FROM production_photo_metadata ppm
    WHERE ppm.production_stage_id = p_stage_id
    AND ppm.customer_visible = true
    ORDER BY ppm.uploaded_at DESC;
  ELSE
    -- No access
    RETURN;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. VALIDATE MIGRATION
-- =====================================================

DO $$
BEGIN
  -- Check if table was created
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'production_photo_metadata'
  ) THEN
    RAISE EXCEPTION 'Table production_photo_metadata was not created';
  END IF;
  
  -- Check if indexes were created
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'production_photo_metadata' 
    AND indexname = 'idx_production_photo_metadata_url'
  ) THEN
    RAISE EXCEPTION 'Index idx_production_photo_metadata_url was not created';
  END IF;
  
  -- Check if RLS is enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'production_photo_metadata' 
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS is not enabled on production_photo_metadata table';
  END IF;
  
  RAISE NOTICE 'Migration 20260429000007_add_production_photo_metadata.sql completed successfully';
END $$;

-- =====================================================
-- 9. MIGRATION SUMMARY
-- =====================================================

SELECT 
  '20260429000007_add_production_photo_metadata.sql' AS migration_file,
  'Add production photo metadata table with customer visibility control' AS description,
  'SUCCESS' AS status,
  NOW() AS executed_at,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'production_photo_metadata') AS table_created,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'production_photo_metadata') AS indexes_created,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'production_photo_metadata') AS policies_created;
