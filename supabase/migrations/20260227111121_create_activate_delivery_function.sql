-- Migration: Create function to activate delivery and apply automatic maintenance
-- Date: 2026-02-27
-- Description: Function to transition delivery from 'scheduled' to 'pending_choice' 
-- and apply automatic maintenance if applicable

-- Function to activate a delivery (transition from scheduled to pending_choice)
-- and apply automatic maintenance if it's not the first delivery
CREATE OR REPLACE FUNCTION activate_delivery_with_auto_maintenance(
  p_delivery_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_delivery subscription_deliveries%ROWTYPE;
  v_subscription subscriptions%ROWTYPE;
  v_previous_delivery subscription_deliveries%ROWTYPE;
  v_expected_date date;
  v_month integer;
  v_year integer;
  v_collection_active boolean;
BEGIN
  -- Get the delivery
  SELECT * INTO v_delivery
  FROM subscription_deliveries
  WHERE id = p_delivery_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery not found: %', p_delivery_id;
  END IF;
  
  -- Only activate if status is 'scheduled'
  IF v_delivery.status != 'scheduled' THEN
    RAISE NOTICE 'Delivery % is not in scheduled status (current: %), skipping activation', 
      p_delivery_id, v_delivery.status;
    RETURN;
  END IF;
  
  -- Update delivery status to pending_choice
  UPDATE subscription_deliveries
  SET status = 'pending_choice',
      updated_at = now()
  WHERE id = p_delivery_id;
  
  -- Get subscription info
  SELECT * INTO v_subscription
  FROM subscriptions
  WHERE id = v_delivery.subscription_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found: %', v_delivery.subscription_id;
  END IF;
  
  -- Skip automatic maintenance if this is the first delivery
  IF v_delivery.delivery_number = 1 THEN
    RAISE NOTICE 'Delivery % is first delivery, skipping automatic maintenance', p_delivery_id;
    RETURN;
  END IF;
  
  -- Get the previous delivery
  SELECT * INTO v_previous_delivery
  FROM subscription_deliveries
  WHERE subscription_id = v_delivery.subscription_id
    AND delivery_number = v_delivery.delivery_number - 1;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'No previous delivery found for delivery %, skipping automatic maintenance', p_delivery_id;
    RETURN;
  END IF;
  
  -- Skip if previous delivery has no collection choice
  IF v_previous_delivery.collection_id IS NULL THEN
    RAISE NOTICE 'Previous delivery % has no collection choice, skipping automatic maintenance', 
      v_previous_delivery.id;
    RETURN;
  END IF;
  
  -- Determine month and year for current delivery
  v_expected_date := COALESCE(v_delivery.expected_delivery_date, v_delivery.scheduled_date, CURRENT_DATE);
  v_month := EXTRACT(MONTH FROM v_expected_date);
  v_year := EXTRACT(YEAR FROM v_expected_date);
  
  -- Check if previous collection is active in current month
  SELECT EXISTS (
    SELECT 1 FROM collections
    WHERE id = v_previous_delivery.collection_id
      AND is_active = true
      AND (
        rotation_type = 'fixed'
        OR (rotation_type = 'odd_months' AND v_month % 2 = 1)
        OR (rotation_type = 'even_months' AND v_month % 2 = 0)
      )
  ) INTO v_collection_active;
  
  IF v_collection_active THEN
    -- Collection is active - apply automatic maintenance
    UPDATE subscription_deliveries
    SET collection_id = v_previous_delivery.collection_id,
        auto_maintained = true,
        status = 'confirmed',  -- Move to confirmed since choice is made
        updated_at = now()
    WHERE id = p_delivery_id;
    
    -- Create audit trail record
    PERFORM record_collection_change(
      p_delivery_id := p_delivery_id,
      p_user_id := v_subscription.user_id,
      p_previous_collection_id := NULL,  -- No previous choice for this delivery
      p_new_collection_id := v_previous_delivery.collection_id,
      p_change_reason := 'automatic_maintenance',
      p_changed_by_admin := false,
      p_admin_user_id := NULL,
      p_ip_address := NULL,
      p_user_agent := NULL
    );
    
    RAISE NOTICE 'Automatic maintenance applied: copied collection % to delivery %', 
      v_previous_delivery.collection_id, p_delivery_id;
  ELSE
    -- Collection is not active - leave in pending_choice status
    -- Subscriber will need to make a new selection
    RAISE NOTICE 'Collection % is not active in month %/%, delivery % remains in pending_choice', 
      v_previous_delivery.collection_id, v_month, v_year, p_delivery_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION activate_delivery_with_auto_maintenance IS 
  'Activates a scheduled delivery by transitioning it to pending_choice status and applying automatic maintenance if applicable. Requirements: 6.2, 10.4';
