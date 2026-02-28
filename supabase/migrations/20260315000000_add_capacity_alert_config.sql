-- Migration: Add capacity alert configuration
-- Task: 22.4 Add capacity alert configuration
-- Requirements: 16.5

-- Add alert configuration fields to cycles table
ALTER TABLE cycles
  ADD COLUMN IF NOT EXISTS alert_threshold INTEGER DEFAULT 80 CHECK (alert_threshold BETWEEN 1 AND 100),
  ADD COLUMN IF NOT EXISTS alert_email TEXT,
  ADD COLUMN IF NOT EXISTS alert_sms TEXT,
  ADD COLUMN IF NOT EXISTS alert_triggered BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS alert_triggered_at TIMESTAMPTZ;

-- Create index for alert monitoring
CREATE INDEX IF NOT EXISTS idx_cycles_alert_threshold ON cycles(capacity_current, capacity_max, alert_triggered)
  WHERE alert_triggered = false;

-- Comment on new columns
COMMENT ON COLUMN cycles.alert_threshold IS 'Percentage threshold (1-100) when to trigger capacity alerts';
COMMENT ON COLUMN cycles.alert_email IS 'Email address to send capacity alerts';
COMMENT ON COLUMN cycles.alert_sms IS 'Phone number to send SMS alerts';
COMMENT ON COLUMN cycles.alert_triggered IS 'Whether alert has been triggered for this cycle';
COMMENT ON COLUMN cycles.alert_triggered_at IS 'Timestamp when alert was triggered';

-- Function to check and trigger capacity alerts
CREATE OR REPLACE FUNCTION check_capacity_alert(p_cycle_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_cycle RECORD;
  v_current_percentage INTEGER;
BEGIN
  -- Get cycle information
  SELECT 
    capacity_current,
    capacity_max,
    alert_threshold,
    alert_triggered,
    alert_email,
    alert_sms
  INTO v_cycle
  FROM cycles
  WHERE id = p_cycle_id;
  
  -- Return false if cycle not found
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Return false if alert already triggered
  IF v_cycle.alert_triggered THEN
    RETURN false;
  END IF;
  
  -- Calculate current percentage
  IF v_cycle.capacity_max > 0 THEN
    v_current_percentage := ROUND((v_cycle.capacity_current::NUMERIC / v_cycle.capacity_max::NUMERIC) * 100);
  ELSE
    v_current_percentage := 0;
  END IF;
  
  -- Check if threshold reached
  IF v_current_percentage >= v_cycle.alert_threshold THEN
    -- Mark alert as triggered
    UPDATE cycles
    SET 
      alert_triggered = true,
      alert_triggered_at = now()
    WHERE id = p_cycle_id;
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Comment on function
COMMENT ON FUNCTION check_capacity_alert IS 'Check if capacity alert threshold is reached and mark as triggered';

-- Trigger to automatically check alerts when capacity changes
CREATE OR REPLACE FUNCTION trigger_check_capacity_alert()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check if capacity increased
  IF NEW.capacity_current > OLD.capacity_current THEN
    PERFORM check_capacity_alert(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on cycles table
DROP TRIGGER IF EXISTS check_capacity_alert_trigger ON cycles;
CREATE TRIGGER check_capacity_alert_trigger
  AFTER UPDATE OF capacity_current ON cycles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_capacity_alert();

-- Function to reset alert (for testing or when capacity is reduced)
CREATE OR REPLACE FUNCTION reset_capacity_alert(p_cycle_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE cycles
  SET 
    alert_triggered = false,
    alert_triggered_at = NULL
  WHERE id = p_cycle_id;
END;
$$ LANGUAGE plpgsql;

-- Comment on function
COMMENT ON FUNCTION reset_capacity_alert IS 'Reset capacity alert flag for a cycle (for testing or when capacity is reduced)';
