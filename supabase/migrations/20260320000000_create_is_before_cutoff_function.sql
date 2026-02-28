-- =====================================================
-- MIGRATION: Create is_before_cutoff database function
-- Date: 2026-03-20
-- Description: Creates database function to check if current time is before cutoff (day 15 at 23:59:59 America/Bahia time)
-- Requirements: 1.2, 7.1, 7.2
-- =====================================================

-- =====================================================
-- 1. CREATE IS_BEFORE_CUTOFF FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION is_before_cutoff() RETURNS BOOLEAN AS $$
DECLARE
  v_bahia_time TIMESTAMPTZ;
  v_day INTEGER;
  v_hour INTEGER;
  v_minute INTEGER;
  v_second INTEGER;
BEGIN
  -- Convert current UTC time to Bahia time (UTC-3)
  v_bahia_time := now() AT TIME ZONE 'America/Bahia';
  v_day := EXTRACT(DAY FROM v_bahia_time);
  v_hour := EXTRACT(HOUR FROM v_bahia_time);
  v_minute := EXTRACT(MINUTE FROM v_bahia_time);
  v_second := EXTRACT(SECOND FROM v_bahia_time);
  
  -- Before day 15 at 23:59:59
  -- Return true if:
  --   - day < 15
  --   - OR (day = 15 AND hour < 23)
  --   - OR (day = 15 AND hour = 23 AND minute < 59)
  --   - OR (day = 15 AND hour = 23 AND minute = 59 AND second < 59)
  -- Return false otherwise
  
  IF v_day < 15 THEN
    RETURN true;
  ELSIF v_day = 15 THEN
    IF v_hour < 23 THEN
      RETURN true;
    ELSIF v_hour = 23 THEN
      IF v_minute < 59 THEN
        RETURN true;
      ELSIF v_minute = 59 THEN
        IF v_second < 59 THEN
          RETURN true;
        ELSE
          RETURN false;
        END IF;
      ELSE
        RETURN false;
      END IF;
    ELSE
      RETURN false;
    END IF;
  ELSE
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 2. ADD FUNCTION COMMENT FOR DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION is_before_cutoff IS 
'Returns true if current time (in America/Bahia timezone) is before day 15 at 23:59:59, false otherwise.
Cutoff is day 15 at 23:59:59 Bahia time (UTC-3).
Used to enforce collection change restrictions after cutoff.';

-- =====================================================
-- 3. MIGRATION SUMMARY
-- =====================================================

SELECT 
  '20260320000000_create_is_before_cutoff_function.sql' AS migration_file,
  'Create is_before_cutoff database function' AS description,
  'SUCCESS' AS status,
  NOW() AS executed_at,
  (SELECT COUNT(*) FROM pg_proc WHERE proname = 'is_before_cutoff') AS function_created;
