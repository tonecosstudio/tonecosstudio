-- Migration: Create Capacity Management Functions
-- Date: 2026-03-28
-- Description: Database functions for capacity operations
-- Requirements: 3.2, 3.3, 3.5, 3.6

-- Function: Check if capacity is available for a purchase
-- Returns true if the requested quantity can be accommodated within the cycle's capacity limit
CREATE OR REPLACE FUNCTION check_capacity_available(
  p_cycle_id UUID,
  p_quantity INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_capacity_max INTEGER;
  v_capacity_current INTEGER;
  v_capacity_limit INTEGER;
  v_effective_max INTEGER;
BEGIN
  -- Get capacity information from the cycle
  SELECT capacity_max, capacity_current, capacity_limit
  INTO v_capacity_max, v_capacity_current, v_capacity_limit
  FROM cycles
  WHERE id = p_cycle_id;
  
  -- If cycle not found, return false
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Use capacity_limit if available, otherwise fall back to capacity_max
  v_effective_max := COALESCE(v_capacity_limit, v_capacity_max, 100);
  v_capacity_current := COALESCE(v_capacity_current, 0);
  
  -- Check if adding the quantity would exceed the limit
  RETURN (v_capacity_current + p_quantity) <= v_effective_max;
END;
$$;

-- Function: Reserve capacity for a subscription or standalone purchase
-- Increments the cycle's capacity_current by the specified quantity
-- Fails if the capacity limit would be exceeded
CREATE OR REPLACE FUNCTION reserve_capacity(
  p_cycle_id UUID,
  p_quantity INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_capacity_max INTEGER;
  v_capacity_current INTEGER;
  v_capacity_limit INTEGER;
  v_effective_max INTEGER;
BEGIN
  -- Get capacity information from the cycle
  SELECT capacity_max, capacity_current, capacity_limit
  INTO v_capacity_max, v_capacity_current, v_capacity_limit
  FROM cycles
  WHERE id = p_cycle_id;
  
  -- If cycle not found, raise exception
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cycle not found: %', p_cycle_id;
  END IF;
  
  -- Use capacity_limit if available, otherwise fall back to capacity_max
  v_effective_max := COALESCE(v_capacity_limit, v_capacity_max, 100);
  v_capacity_current := COALESCE(v_capacity_current, 0);
  
  -- Check if adding the quantity would exceed the limit
  IF (v_capacity_current + p_quantity) > v_effective_max THEN
    RAISE EXCEPTION 'Capacity limit exceeded for cycle %. Current: %, Requested: %, Max: %', 
      p_cycle_id, v_capacity_current, p_quantity, v_effective_max;
  END IF;
  
  -- Update the cycle's capacity_current
  UPDATE cycles
  SET capacity_current = capacity_current + p_quantity,
      updated_at = now()
  WHERE id = p_cycle_id;
END;
$$;

-- Function: Release capacity when a purchase is cancelled
-- Decrements the cycle's capacity_current by the specified quantity
-- Ensures capacity_current never goes below 0
CREATE OR REPLACE FUNCTION release_capacity(
  p_cycle_id UUID,
  p_quantity INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update the cycle's capacity_current, ensuring it doesn't go below 0
  UPDATE cycles
  SET capacity_current = GREATEST(0, capacity_current - p_quantity),
      updated_at = now()
  WHERE id = p_cycle_id;
  
  -- If cycle not found, raise exception
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cycle not found: %', p_cycle_id;
  END IF;
END;
$$;

-- Comments
COMMENT ON FUNCTION check_capacity_available IS 'Check if capacity is available for a purchase in a cycle';
COMMENT ON FUNCTION reserve_capacity IS 'Reserve capacity for a subscription or standalone purchase';
COMMENT ON FUNCTION release_capacity IS 'Release capacity when a purchase is cancelled before cutoff';
