-- Test script for get_active_collections function
-- This demonstrates the function logic and expected behavior

-- Example 1: Test with sample data (assuming we have collections)
-- Note: In a real environment, you would have actual collections data

-- First, let's see what the function signature looks like
SELECT 
  proname as function_name,
  pg_get_function_identity_arguments(oid) as parameters,
  pg_get_function_result(oid) as return_type
FROM pg_proc 
WHERE proname = 'get_active_collections';

-- Example usage scenarios:

-- 1. Get active collections for January 2024 (odd month)
-- Should include: fixed collections + odd_months collections
SELECT 'January 2024 (odd month)' as test_case, 
       COUNT(*) as collection_count
FROM get_active_collections(1, 2024);

-- 2. Get active collections for February 2024 (even month)  
-- Should include: fixed collections + even_months collections
SELECT 'February 2024 (even month)' as test_case,
       COUNT(*) as collection_count
FROM get_active_collections(2, 2024);

-- 3. Get active collections for March 2024 (odd month)
SELECT 'March 2024 (odd month)' as test_case,
       COUNT(*) as collection_count
FROM get_active_collections(3, 2024);

-- 4. Show detailed results for a specific month
-- This shows which collections are active and their rotation type
SELECT 
  name,
  rotation_type,
  is_active,
  CASE 
    WHEN rotation_type = 'fixed' THEN 'Available every month'
    WHEN rotation_type = 'odd_months' THEN 'Available in odd months (Jan, Mar, May, Jul, Sep, Nov)'
    WHEN rotation_type = 'even_months' THEN 'Available in even months (Feb, Apr, Jun, Aug, Oct, Dec)'
    ELSE 'Unknown rotation'
  END as availability
FROM get_active_collections(3, 2024)  -- March 2024 (odd month)
ORDER BY name;

-- 5. Test error handling - invalid month
-- This should raise an exception
-- SELECT 'Testing invalid month' as test_case,
--        COUNT(*) as collection_count
-- FROM get_active_collections(13, 2024);  -- Month 13 doesn't exist

-- 6. Test error handling - invalid year
-- This should raise an exception  
-- SELECT 'Testing invalid year' as test_case,
--        COUNT(*) as collection_count
-- FROM get_active_collections(1, 2023);  -- Year before 2024

-- Business logic verification:
-- The function implements the following business rules:
-- 1. Fixed collections (rotation_type = 'fixed'): Always included when is_active = true
-- 2. Odd month collections (rotation_type = 'odd_months'): Only included in months 1, 3, 5, 7, 9, 11
-- 3. Even month collections (rotation_type = 'even_months'): Only included in months 2, 4, 6, 8, 10, 12
-- 4. All collections must have is_active = true

-- Example of how this function would be used in application code:
-- 
-- -- Get active collections for current month
-- SELECT * FROM get_active_collections(
--   EXTRACT(MONTH FROM CURRENT_DATE AT TIME ZONE 'America/Bahia')::INTEGER,
--   EXTRACT(YEAR FROM CURRENT_DATE AT TIME ZONE 'America/Bahia')::INTEGER
-- );
-- 
-- -- Check if a specific collection is active in a given month
-- SELECT EXISTS(
--   SELECT 1 FROM get_active_collections(3, 2024) 
--   WHERE id = 'specific-collection-uuid'
-- ) as is_collection_active;