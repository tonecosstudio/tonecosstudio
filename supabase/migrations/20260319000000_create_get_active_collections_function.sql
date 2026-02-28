-- =====================================================
-- MIGRATION: Create get_active_collections database function
-- Date: 2026-03-19
-- Description: Creates database function to retrieve active collections based on month/year and rotation type
-- Requirements: 5.4
-- =====================================================

-- =====================================================
-- 1. CREATE GET_ACTIVE_COLLECTIONS FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_active_collections(
  p_month INTEGER,
  p_year INTEGER
) RETURNS SETOF collections AS $$
BEGIN
  -- Validate input parameters
  IF p_month < 1 OR p_month > 12 THEN
    RAISE EXCEPTION 'Month must be between 1 and 12, got %', p_month;
  END IF;
  
  IF p_year < 2024 OR p_year > 2030 THEN
    RAISE EXCEPTION 'Year must be between 2024 and 2030, got %', p_year;
  END IF;
  
  -- Return active collections based on rotation pattern
  RETURN QUERY
  SELECT * FROM collections
  WHERE is_active = true
  AND (
    -- Fixed collections: always included
    rotation_type = 'fixed'
    -- Odd months collections: only in odd months (1, 3, 5, 7, 9, 11)
    OR (rotation_type = 'odd_months' AND p_month % 2 = 1)
    -- Even months collections: only in even months (2, 4, 6, 8, 10, 12)
    OR (rotation_type = 'even_months' AND p_month % 2 = 0)
  )
  ORDER BY name;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 2. ADD FUNCTION COMMENT FOR DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION get_active_collections IS 
'Returns all collections that are active for the given month and year.
Active collections are those with is_active = true AND matching rotation pattern:
- Fixed collections: always included
- Odd months collections: only in odd months (1, 3, 5, 7, 9, 11)
- Even months collections: only in even months (2, 4, 6, 8, 10, 12)
Parameters:
  p_month: Month number (1-12)
  p_year: Year (2024-2030)
Returns: SETOF collections (all columns) ordered by name';

-- =====================================================
-- 3. MIGRATION SUMMARY
-- =====================================================

SELECT 
  '20260319000000_create_get_active_collections_function.sql' AS migration_file,
  'Create get_active_collections database function' AS description,
  'SUCCESS' AS status,
  NOW() AS executed_at,
  (SELECT COUNT(*) FROM pg_proc WHERE proname = 'get_active_collections') AS function_created;
