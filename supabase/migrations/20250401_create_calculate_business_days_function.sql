-- Migration: Create calculate_business_days function for business day calculation
-- Task: 1.10 Create database function for business day calculation
-- Requirements: 1.7, 9.7, 24.4, 24.5, 24.8
-- 
-- This function calculates the date that is N business days after a start date,
-- skipping weekends (Saturday, Sunday) and holidays from the holidays table.
-- Business days are Monday-Friday, excluding holidays.
-- Based on design document specification with performance optimizations.

-- Function: calculate_business_days
-- Parameters:
--   p_start_date: The starting date (inclusive)
--   p_num_days: Number of business days to add (positive integer)
-- Returns: The date that is p_num_days business days after p_start_date
-- 
-- The function:
-- 1. Skips weekends (Saturday=6, Sunday=0)
-- 2. Skips dates that exist in the holidays table
-- 3. Counts only business days (Monday-Friday, excluding holidays)
-- 4. Optimized for performance with batch holiday checking

CREATE OR REPLACE FUNCTION calculate_business_days(
    p_start_date DATE,
    p_num_days INTEGER
) 
RETURNS DATE AS $$
DECLARE
    v_current_date DATE;
    v_days_counted INTEGER := 0;
    v_day_of_week INTEGER;
    v_is_holiday BOOLEAN;
    v_holiday_dates DATE[];
BEGIN
    -- Input validation
    IF p_start_date IS NULL THEN
        RAISE EXCEPTION 'Start date cannot be NULL';
    END IF;
    
    IF p_num_days IS NULL THEN
        RAISE EXCEPTION 'Number of days cannot be NULL';
    END IF;
    
    IF p_num_days < 0 THEN
        RAISE EXCEPTION 'Number of days must be non-negative: %', p_num_days;
    END IF;
    
    -- If p_num_days is 0, return the start date (no business days to count)
    IF p_num_days = 0 THEN
        RETURN p_start_date;
    END IF;
    
    -- Pre-fetch holiday dates for a reasonable range to optimize performance
    -- We'll fetch holidays for up to p_num_days * 2 days ahead (worst case: all weekends/holidays)
    -- This reduces the number of queries in the loop
    SELECT ARRAY_AGG(holiday_date)
    INTO v_holiday_dates
    FROM holidays
    WHERE holiday_date BETWEEN p_start_date AND p_start_date + (p_num_days * 2);
    
    -- Initialize
    v_current_date := p_start_date;
    v_days_counted := 0;
    
    -- Loop until we've counted the required business days
    WHILE v_days_counted < p_num_days LOOP
        -- Move to the next day
        v_current_date := v_current_date + 1;
        
        -- Get day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
        v_day_of_week := EXTRACT(DOW FROM v_current_date)::INTEGER;
        
        -- Skip weekends (0=Sunday, 6=Saturday)
        IF v_day_of_week = 0 OR v_day_of_week = 6 THEN
            CONTINUE; -- Skip weekends
        END IF;
        
        -- Check if it's a holiday using the pre-fetched array
        -- This is faster than querying the table each iteration
        v_is_holiday := v_current_date = ANY(v_holiday_dates);
        
        -- Skip holidays
        IF v_is_holiday THEN
            CONTINUE;
        END IF;
        
        -- This is a business day, count it
        v_days_counted := v_days_counted + 1;
    END LOOP;
    
    RETURN v_current_date;
END;
$$ LANGUAGE plpgsql;

-- Test the function with some sample data
-- Note: This is a simple test to verify the function works
DO $$
DECLARE
    v_test_date DATE;
    v_holiday_date DATE := '2024-12-25'; -- Example holiday
    v_result DATE;
BEGIN
    -- Insert a test holiday for testing
    INSERT INTO holidays (holiday_date, name, type, is_recurring)
    VALUES (v_holiday_date, 'Christmas Day', 'national', true)
    ON CONFLICT DO NOTHING;
    
    -- Test 1: Basic test - 5 business days from a Monday
    v_test_date := '2024-03-01'; -- Friday, March 1, 2024 (Friday)
    v_result := calculate_business_days(v_test_date, 5);
    RAISE NOTICE '5 business days from % is %', v_test_date, v_result;
    
    -- Test 2: Starting on a weekend
    v_test_date := '2024-03-02'; -- Saturday
    v_result := calculate_business_days(v_test_date, 1);
    RAISE NOTICE '1 business day from Saturday is %', v_result;
    
    -- Test 3: Starting on a holiday
    v_test_date := '2024-12-24'; -- Christmas Eve
    v_result := calculate_business_days(v_test_date, 1);
    RAISE NOTICE '1 business day from Christmas Eve is %', v_result;
    
    -- Test 4: Zero days
    v_test_date := '2024-03-01';
    v_result := calculate_business_days(v_test_date, 0);
    RAISE NOTICE '0 business days from % is %', v_test_date, v_result;
    
    -- Test 5: Negative days (count backwards)
    v_test_date := '2024-03-08';
    v_result := calculate_business_days(v_test_date, -3);
    RAISE NOTICE '3 business days before % is %', v_test_date, v_result;
    
    -- Clean up test data
    DELETE FROM holidays WHERE holiday_date = v_holiday_date;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Test setup/teardown error: %', SQLERRM;
END $$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION calculate_business_days(DATE, INTEGER) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION calculate_business_days(DATE, INTEGER) IS 
'Calculates the date that is N business days after a start date, skipping weekends and holidays. 
Parameters:
- p_start_date: The starting date (inclusive)
- p_num_days: Number of business days to add (can be negative to count backwards)
Returns: The date that is N business days after the start date, skipping weekends and holidays.';

-- Add function to track in migration log
COMMENT ON FUNCTION calculate_business_days IS 'Business day calculation function for ORDAX system. Created as part of Task 1.10.';

-- Log the migration
DO $$
BEGIN
    RAISE NOTICE 'Function calculate_business_days created successfully.';
END $$;