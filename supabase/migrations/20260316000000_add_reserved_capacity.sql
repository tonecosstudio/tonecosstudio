-- Migration: Add reserved_capacity field to cycles table
-- Task: 22.6 Add capacity reservation management
-- Requirements: 16.6

-- Add reserved_capacity field to cycles table
ALTER TABLE cycles
  ADD COLUMN reserved_capacity integer DEFAULT 0 CHECK (reserved_capacity >= 0);

-- Add comment explaining the field
COMMENT ON COLUMN cycles.reserved_capacity IS 'Capacity reserved for special orders, subtracted from available capacity';

-- CREATE INDEX IF NOT EXISTS for queries that filter by reserved capacity
CREATE INDEX IF NOT EXISTS idx_cycles_reserved_capacity ON cycles(reserved_capacity) WHERE reserved_capacity > 0;

-- Update the capacity calculation to account for reserved capacity
-- Available capacity = capacity_max - capacity_current - reserved_capacity
CREATE OR REPLACE FUNCTION get_available_capacity(p_cycle_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_capacity_max integer;
  v_capacity_current integer;
  v_reserved_capacity integer;
BEGIN
  SELECT capacity_max, capacity_current, reserved_capacity
  INTO v_capacity_max, v_capacity_current, v_reserved_capacity
  FROM cycles
  WHERE id = p_cycle_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cycle not found: %', p_cycle_id;
  END IF;
  
  RETURN GREATEST(0, v_capacity_max - v_capacity_current - v_reserved_capacity);
END;
$$;

-- Update check_capacity_available to account for reserved capacity
CREATE OR REPLACE FUNCTION check_capacity_available(
  p_cycle_id uuid,
  p_quantity integer
) RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_capacity_max integer;
  v_capacity_current integer;
  v_reserved_capacity integer;
  v_available integer;
BEGIN
  SELECT capacity_max, capacity_current, reserved_capacity
  INTO v_capacity_max, v_capacity_current, v_reserved_capacity
  FROM cycles
  WHERE id = p_cycle_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  v_available := v_capacity_max - v_capacity_current - v_reserved_capacity;
  
  RETURN (v_available >= p_quantity);
END;
$$;

-- Create function to reserve capacity for special orders
CREATE OR REPLACE FUNCTION reserve_special_capacity(
  p_cycle_id uuid,
  p_quantity integer,
  p_reason text
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_capacity_max integer;
  v_capacity_current integer;
  v_reserved_capacity integer;
  v_available integer;
BEGIN
  -- Get current capacity values
  SELECT capacity_max, capacity_current, reserved_capacity
  INTO v_capacity_max, v_capacity_current, v_reserved_capacity
  FROM cycles
  WHERE id = p_cycle_id
  FOR UPDATE; -- Lock the row
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cycle not found: %', p_cycle_id;
  END IF;
  
  -- Calculate available capacity
  v_available := v_capacity_max - v_capacity_current - v_reserved_capacity;
  
  -- Check if enough capacity available
  IF v_available < p_quantity THEN
    RAISE EXCEPTION 'Insufficient capacity: requested %, available %', p_quantity, v_available;
  END IF;
  
  -- Reserve the capacity
  UPDATE cycles
  SET reserved_capacity = reserved_capacity + p_quantity,
      updated_at = now()
  WHERE id = p_cycle_id;
  
  -- Log the reservation (optional - could be added to a reservations table)
  RAISE NOTICE 'Reserved % capacity for cycle % (reason: %)', p_quantity, p_cycle_id, p_reason;
END;
$$;

-- Create function to release reserved capacity
CREATE OR REPLACE FUNCTION release_special_capacity(
  p_cycle_id uuid,
  p_quantity integer
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE cycles
  SET reserved_capacity = GREATEST(0, reserved_capacity - p_quantity),
      updated_at = now()
  WHERE id = p_cycle_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cycle not found: %', p_cycle_id;
  END IF;
END;
$$;

-- Add comment explaining the functions
COMMENT ON FUNCTION get_available_capacity IS 'Calculate available capacity accounting for reserved capacity';
COMMENT ON FUNCTION reserve_special_capacity IS 'Reserve capacity for special orders';
COMMENT ON FUNCTION release_special_capacity IS 'Release previously reserved capacity';
