-- =====================================================
-- MIGRATION: Create deadline calculation function
-- Date: 2026-05-05
-- Description: Creates a reusable function to calculate character choice deadlines
-- Task: 3.3.1 Create deadline calculation function
-- Requirements: 2.2.4 (AC1: Deadline is set to 7 days after order payment approval)
-- =====================================================

-- =====================================================
-- 1. CREATE DEADLINE CALCULATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_character_choice_deadline(
  p_approval_date TIMESTAMPTZ DEFAULT now()
)
RETURNS TIMESTAMPTZ AS $$
BEGIN
  -- Set deadline to 7 days after payment approval
  -- Using INTERVAL '7 days' for exact 7-day calculation
  RETURN p_approval_date + INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_character_choice_deadline IS 
  'Calculates character choice deadline as 7 days after order payment approval date. Returns TIMESTAMPTZ.';

-- =====================================================
-- 2. UPDATE AUTO_POPULATE_PRODUCTION_QUEUE FUNCTION
-- =====================================================
-- Update the existing function to use the new deadline calculation function

CREATE OR REPLACE FUNCTION auto_populate_production_queue()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_name TEXT;
  v_customer_email TEXT;
  v_collection_id UUID;
  v_collection_name TEXT;
  v_choice_deadline TIMESTAMPTZ;
  v_requires_choice BOOLEAN;
  v_order_type TEXT;
  v_approval_date TIMESTAMPTZ;
BEGIN
  -- Determine order type based on trigger table
  IF TG_TABLE_NAME = 'subscription_deliveries' THEN
    v_order_type := 'subscription_delivery';
  ELSIF TG_TABLE_NAME = 'standalone_purchases' THEN
    v_order_type := 'standalone_purchase';
  ELSIF TG_TABLE_NAME = 'manual_payments' THEN
    v_order_type := 'manual_payment';
  ELSE
    RAISE EXCEPTION 'auto_populate_production_queue triggered on unsupported table: %', TG_TABLE_NAME;
  END IF;
  
  -- Only proceed if status changed to approved/confirmed
  IF TG_OP = 'UPDATE' THEN
    -- For subscription_deliveries: status = 'confirmed'
    IF v_order_type = 'subscription_delivery' THEN
      IF NEW.status != 'confirmed' OR OLD.status = 'confirmed' THEN
        RETURN NEW;
      END IF;
      v_approval_date := NEW.updated_at; -- Use the timestamp when status changed to confirmed
    -- For standalone_purchases: status = 'balance_paid'
    ELSIF v_order_type = 'standalone_purchase' THEN
      IF NEW.status != 'balance_paid' OR OLD.status = 'balance_paid' THEN
        RETURN NEW;
      END IF;
      v_approval_date := NEW.updated_at; -- Use the timestamp when status changed to balance_paid
    -- For manual_payments: status = 'approved'
    ELSIF v_order_type = 'manual_payment' THEN
      IF NEW.status != 'approved' OR OLD.status = 'approved' THEN
        RETURN NEW;
      END IF;
      v_approval_date := NEW.updated_at; -- Use the timestamp when status changed to approved
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    -- For INSERT, check if status is already approved
    IF v_order_type = 'subscription_delivery' AND NEW.status != 'confirmed' THEN
      RETURN NEW;
    ELSIF v_order_type = 'standalone_purchase' AND NEW.status != 'balance_paid' THEN
      RETURN NEW;
    ELSIF v_order_type = 'manual_payment' AND NEW.status != 'approved' THEN
      RETURN NEW;
    END IF;
    v_approval_date := NEW.created_at; -- Use creation timestamp for INSERT
  END IF;
  
  -- Check if production queue entry already exists
  IF EXISTS (
    SELECT 1 FROM production_queue 
    WHERE order_id = NEW.id AND order_type = v_order_type
  ) THEN
    -- Already exists, skip
    RETURN NEW;
  END IF;
  
  -- Get customer information
  SELECT 
    COALESCE(p.full_name, p.email, 'Unknown Customer'),
    p.email
  FROM profiles p
  WHERE p.id = NEW.user_id
  INTO v_customer_name, v_customer_email;
  
  -- Get collection information
  SELECT 
    c.id,
    c.name
  FROM collections c
  WHERE c.id = NEW.collection_id
  INTO v_collection_id, v_collection_name;
  
  -- Determine if character choice is required
  -- Check if collection has multiple characters
  SELECT COUNT(*) > 1
  FROM collection_characters
  WHERE collection_id = v_collection_id
  INTO v_requires_choice;
  
  -- Calculate choice deadline using the new function if choice is required
  IF v_requires_choice THEN
    v_choice_deadline := calculate_character_choice_deadline(v_approval_date);
  ELSE
    v_choice_deadline := NULL;
  END IF;
  
  -- Insert into production_queue
  INSERT INTO production_queue (
    order_id,
    order_type,
    customer_id,
    customer_name,
    customer_email,
    collection_id,
    collection_name,
    character_id,
    character_name,
    production_status,
    current_stage,
    choice_status,
    choice_deadline,
    scheduled_production_date
  ) VALUES (
    NEW.id,
    v_order_type,
    NEW.user_id,
    v_customer_name,
    v_customer_email,
    v_collection_id,
    v_collection_name,
    NULL, -- Character not chosen yet
    NULL,
    CASE WHEN v_requires_choice THEN 'awaiting_choice' ELSE 'ready_for_production' END,
    CASE WHEN v_requires_choice THEN 'awaiting_choice' ELSE 'design' END,
    CASE WHEN v_requires_choice THEN 'pending' ELSE 'approved' END,
    v_choice_deadline,
    CASE WHEN v_requires_choice THEN NULL ELSE v_approval_date + INTERVAL '1 day' END
  );
  
  -- Create character_choices record if choice is required
  IF v_requires_choice THEN
    INSERT INTO character_choices (
      order_id,
      order_type,
      user_id,
      collection_id,
      status,
      deadline
    ) VALUES (
      NEW.id,
      v_order_type,
      NEW.user_id,
      v_collection_id,
      'pending',
      v_choice_deadline
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_populate_production_queue IS 
  'Trigger function that automatically creates production_queue and character_choices records when orders are approved. Uses calculate_character_choice_deadline() for consistent deadline calculation.';

-- =====================================================
-- 3. GRANT PERMISSIONS
-- =====================================================

-- Grant EXECUTE on the new function to authenticated users
GRANT EXECUTE ON FUNCTION calculate_character_choice_deadline(TIMESTAMPTZ) TO authenticated;

-- Grant EXECUTE to service role
GRANT EXECUTE ON FUNCTION calculate_character_choice_deadline(TIMESTAMPTZ) TO service_role;

-- =====================================================
-- 4. VALIDATE MIGRATION
-- =====================================================

DO $$
BEGIN
  -- Check if function was created
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'calculate_character_choice_deadline'
  ) THEN
    RAISE EXCEPTION 'Function calculate_character_choice_deadline was not created';
  END IF;
  
  -- Test the function with a sample date
  DECLARE
    test_approval_date TIMESTAMPTZ := '2026-05-01 10:00:00+00';
    test_deadline TIMESTAMPTZ;
    expected_deadline TIMESTAMPTZ := '2026-05-08 10:00:00+00';
  BEGIN
    test_deadline := calculate_character_choice_deadline(test_approval_date);
    
    IF test_deadline != expected_deadline THEN
      RAISE EXCEPTION 'Deadline calculation test failed. Expected: %, Got: %', expected_deadline, test_deadline;
    END IF;
    
    RAISE NOTICE 'Deadline calculation test passed: % + 7 days = %', test_approval_date, test_deadline;
  END;
  
  -- Check if auto_populate_production_queue was updated
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'auto_populate_production_queue'
  ) THEN
    RAISE EXCEPTION 'Function auto_populate_production_queue was not found';
  END IF;
  
  RAISE NOTICE 'Migration 20260505000000_create_deadline_calculation_function.sql completed successfully';
END $$;

-- =====================================================
-- 5. MIGRATION SUMMARY
-- =====================================================

SELECT 
  '20260505000000_create_deadline_calculation_function.sql' AS migration_file,
  'Create deadline calculation function and update auto_populate_production_queue' AS description,
  'SUCCESS' AS status,
  NOW() AS executed_at,
  (SELECT COUNT(*) FROM pg_proc WHERE proname = 'calculate_character_choice_deadline') AS function_created,
  (SELECT COUNT(*) FROM pg_proc WHERE proname = 'auto_populate_production_queue') AS function_updated;
