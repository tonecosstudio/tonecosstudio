-- Migration: Create subscription business logic functions
-- Purpose: Centralize subscription activation and delivery creation logic
-- Date: 2026-05-04

-- ============================================
-- FUNCTION 1: Create subscription deliveries
-- ============================================

CREATE OR REPLACE FUNCTION create_subscription_deliveries(
  p_subscription_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_subscription RECORD;
  v_deliveries_count INTEGER := 0;
  v_delivery_number INTEGER;
  v_delivery_date TIMESTAMPTZ;
BEGIN
  -- Get subscription data
  SELECT 
    id,
    plan_type,
    deliveries_total,
    next_delivery_date
  INTO v_subscription
  FROM subscriptions
  WHERE id = p_subscription_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription % not found', p_subscription_id;
  END IF;
  
  -- Create deliveries based on plan
  FOR v_delivery_number IN 1..v_subscription.deliveries_total LOOP
    -- Calculate delivery date (every 30 days)
    v_delivery_date := v_subscription.next_delivery_date + ((v_delivery_number - 1) * INTERVAL '30 days');
    
    -- Insert delivery
    INSERT INTO subscription_deliveries (
      subscription_id,
      delivery_number,
      status,
      expected_delivery_date,
      created_at,
      updated_at
    )
    VALUES (
      p_subscription_id,
      v_delivery_number,
      'scheduled',
      v_delivery_date,
      NOW(),
      NOW()
    )
    ON CONFLICT (subscription_id, delivery_number) DO NOTHING;
    
    v_deliveries_count := v_deliveries_count + 1;
  END LOOP;
  
  RETURN v_deliveries_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_subscription_deliveries(UUID) IS 
  'Creates delivery records for a subscription based on its plan type';

-- ============================================
-- FUNCTION 2: Activate subscription from approved payment
-- ============================================

CREATE OR REPLACE FUNCTION activate_subscription_from_payment(
  p_payment_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_payment RECORD;
  v_subscription_id UUID;
  v_deliveries_created INTEGER;
BEGIN
  -- Get payment data
  SELECT 
    id,
    subscription_id,
    amount,
    status,
    approved_at
  INTO v_payment
  FROM manual_payments
  WHERE id = p_payment_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment % not found', p_payment_id;
  END IF;
  
  IF v_payment.status != 'approved' THEN
    RAISE EXCEPTION 'Payment % is not approved (status: %)', p_payment_id, v_payment.status;
  END IF;
  
  IF v_payment.subscription_id IS NULL THEN
    RAISE EXCEPTION 'Payment % is not linked to a subscription', p_payment_id;
  END IF;
  
  v_subscription_id := v_payment.subscription_id;
  
  -- Update subscription to active
  UPDATE subscriptions
  SET 
    status = 'active',
    total_paid = v_payment.amount,
    payment_method = 'pix', -- TODO: Get from payment
    payment_id = v_payment.id::text,
    next_delivery_date = COALESCE(next_delivery_date, NOW() + INTERVAL '30 days'),
    next_production_start = COALESCE(next_production_start, NOW() + INTERVAL '15 days'),
    deliveries_total = CASE 
      WHEN plan_type = 'trimestral' THEN 3
      WHEN plan_type = 'semestral' THEN 6
      WHEN plan_type = 'anual' THEN 12
      ELSE 3
    END,
    deliveries_completed = 0,
    updated_at = NOW()
  WHERE id = v_subscription_id
  AND status = 'pending_payment';
  
  IF NOT FOUND THEN
    RAISE NOTICE 'Subscription % was not in pending_payment status, skipping activation', v_subscription_id;
    RETURN v_subscription_id;
  END IF;
  
  -- Create deliveries
  v_deliveries_created := create_subscription_deliveries(v_subscription_id);
  
  RAISE NOTICE 'Subscription % activated with % deliveries created', v_subscription_id, v_deliveries_created;
  
  RETURN v_subscription_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION activate_subscription_from_payment(UUID) IS 
  'Activates a subscription when its payment is approved. 
   Updates subscription data and creates delivery records.';

-- ============================================
-- FUNCTION 3: Validate subscription data
-- ============================================

CREATE OR REPLACE FUNCTION validate_subscription_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate deliveries_total matches plan_type
  IF NEW.plan_type = 'trimestral' AND NEW.deliveries_total != 3 THEN
    NEW.deliveries_total := 3;
  ELSIF NEW.plan_type = 'semestral' AND NEW.deliveries_total != 6 THEN
    NEW.deliveries_total := 6;
  ELSIF NEW.plan_type = 'anual' AND NEW.deliveries_total != 12 THEN
    NEW.deliveries_total := 12;
  END IF;
  
  -- Validate deliveries_completed doesn't exceed total
  IF NEW.deliveries_completed > NEW.deliveries_total THEN
    RAISE EXCEPTION 'deliveries_completed (%) cannot exceed deliveries_total (%)', 
      NEW.deliveries_completed, NEW.deliveries_total;
  END IF;
  
  -- Validate active subscription has required data
  IF NEW.status = 'active' THEN
    IF NEW.next_delivery_date IS NULL THEN
      RAISE EXCEPTION 'Active subscription must have next_delivery_date';
    END IF;
    
    IF NEW.deliveries_total IS NULL OR NEW.deliveries_total = 0 THEN
      RAISE EXCEPTION 'Active subscription must have deliveries_total > 0';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validation
DROP TRIGGER IF EXISTS trigger_validate_subscription_data ON subscriptions;

CREATE TRIGGER trigger_validate_subscription_data
  BEFORE INSERT OR UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION validate_subscription_data();

COMMENT ON FUNCTION validate_subscription_data() IS 
  'Validates subscription data before insert/update. 
   Ensures deliveries_total matches plan_type and other business rules.';

-- ============================================
-- FUNCTION 4: Trigger to auto-activate on payment approval
-- ============================================

CREATE OR REPLACE FUNCTION auto_activate_subscription_on_payment_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status changes to approved
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Only for subscription payments
    IF NEW.subscription_id IS NOT NULL THEN
      PERFORM activate_subscription_from_payment(NEW.id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_auto_activate_subscription ON manual_payments;

CREATE TRIGGER trigger_auto_activate_subscription
  AFTER UPDATE ON manual_payments
  FOR EACH ROW
  EXECUTE FUNCTION auto_activate_subscription_on_payment_approval();

COMMENT ON FUNCTION auto_activate_subscription_on_payment_approval() IS 
  'Automatically activates subscription when payment is approved';
