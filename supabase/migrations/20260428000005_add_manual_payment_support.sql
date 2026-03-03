-- =====================================================
-- MIGRATION: Add manual_payment support to production_queue
-- Date: 2026-04-28
-- Description: Extends production_queue to support manual_payment order type
-- =====================================================

-- =====================================================
-- 1. ADD MANUAL_PAYMENT TO ORDER_TYPE CHECK CONSTRAINT
-- =====================================================

-- Drop the existing constraint
ALTER TABLE production_queue 
  DROP CONSTRAINT IF EXISTS production_queue_order_type_check;

-- Add new constraint with manual_payment included
ALTER TABLE production_queue 
  ADD CONSTRAINT production_queue_order_type_check 
  CHECK (order_type IN ('subscription_delivery', 'standalone_purchase', 'manual_payment'));

COMMENT ON CONSTRAINT production_queue_order_type_check ON production_queue IS 
  'Validates order_type is one of: subscription_delivery, standalone_purchase, or manual_payment';

-- =====================================================
-- 2. UPDATE VALIDATION FUNCTION TO SUPPORT MANUAL_PAYMENT
-- =====================================================

CREATE OR REPLACE FUNCTION validate_production_queue_order_reference()
RETURNS TRIGGER AS $$
DECLARE
  order_exists BOOLEAN;
BEGIN
  -- Check if order exists in the appropriate table based on order_type
  IF NEW.order_type = 'subscription_delivery' THEN
    SELECT EXISTS (
      SELECT 1 FROM subscription_deliveries 
      WHERE id = NEW.order_id
    ) INTO order_exists;
    
    IF NOT order_exists THEN
      RAISE EXCEPTION 'Order ID % does not exist in subscription_deliveries table', NEW.order_id;
    END IF;
    
  ELSIF NEW.order_type = 'standalone_purchase' THEN
    SELECT EXISTS (
      SELECT 1 FROM standalone_purchases 
      WHERE id = NEW.order_id
    ) INTO order_exists;
    
    IF NOT order_exists THEN
      RAISE EXCEPTION 'Order ID % does not exist in standalone_purchases table', NEW.order_id;
    END IF;
    
  ELSIF NEW.order_type = 'manual_payment' THEN
    SELECT EXISTS (
      SELECT 1 FROM manual_payments 
      WHERE id = NEW.order_id
    ) INTO order_exists;
    
    IF NOT order_exists THEN
      RAISE EXCEPTION 'Order ID % does not exist in manual_payments table', NEW.order_id;
    END IF;
    
  ELSE
    RAISE EXCEPTION 'Invalid order_type: %', NEW.order_type;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_production_queue_order_reference IS 
  'Validates that order_id references a valid record in subscription_deliveries, standalone_purchases, or manual_payments based on order_type';

-- =====================================================
-- 3. UPDATE CHARACTER_CHOICES CONSTRAINT
-- =====================================================

-- Drop the existing constraint
ALTER TABLE character_choices 
  DROP CONSTRAINT IF EXISTS character_choices_order_type_check;

-- Add new constraint with manual_payment included
ALTER TABLE character_choices 
  ADD CONSTRAINT character_choices_order_type_check 
  CHECK (order_type IN ('subscription_delivery', 'standalone_purchase', 'manual_payment'));

-- =====================================================
-- 4. UPDATE CHARACTER_CHOICES VALIDATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION validate_character_choice_order_reference()
RETURNS TRIGGER AS $$
DECLARE
  order_exists BOOLEAN;
BEGIN
  -- Validate that order_id exists in the appropriate table based on order_type
  IF NEW.order_type = 'subscription_delivery' THEN
    SELECT EXISTS (
      SELECT 1 FROM subscription_deliveries 
      WHERE id = NEW.order_id
    ) INTO order_exists;
    
    IF NOT order_exists THEN
      RAISE EXCEPTION 'Order ID % does not exist in subscription_deliveries table', NEW.order_id;
    END IF;
    
  ELSIF NEW.order_type = 'standalone_purchase' THEN
    SELECT EXISTS (
      SELECT 1 FROM standalone_purchases 
      WHERE id = NEW.order_id
    ) INTO order_exists;
    
    IF NOT order_exists THEN
      RAISE EXCEPTION 'Order ID % does not exist in standalone_purchases table', NEW.order_id;
    END IF;
    
  ELSIF NEW.order_type = 'manual_payment' THEN
    SELECT EXISTS (
      SELECT 1 FROM manual_payments 
      WHERE id = NEW.order_id
    ) INTO order_exists;
    
    IF NOT order_exists THEN
      RAISE EXCEPTION 'Order ID % does not exist in manual_payments table', NEW.order_id;
    END IF;
    
  ELSE
    RAISE EXCEPTION 'Invalid order_type: %', NEW.order_type;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. UPDATE AUTO_POPULATE FUNCTION TO SUPPORT MANUAL_PAYMENTS
-- =====================================================

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
    -- For standalone_purchases: status = 'balance_paid'
    ELSIF v_order_type = 'standalone_purchase' THEN
      IF NEW.status != 'balance_paid' OR OLD.status = 'balance_paid' THEN
        RETURN NEW;
      END IF;
    -- For manual_payments: status = 'approved'
    ELSIF v_order_type = 'manual_payment' THEN
      IF NEW.status != 'approved' OR OLD.status = 'approved' THEN
        RETURN NEW;
      END IF;
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
  
  -- Get collection information based on order type
  IF v_order_type = 'subscription_delivery' THEN
    SELECT 
      c.id,
      c.name
    FROM collections c
    WHERE c.id = NEW.collection_id
    INTO v_collection_id, v_collection_name;
    
  ELSIF v_order_type = 'standalone_purchase' THEN
    SELECT 
      c.id,
      c.name
    FROM collections c
    WHERE c.id = NEW.collection_id
    INTO v_collection_id, v_collection_name;
    
  ELSIF v_order_type = 'manual_payment' THEN
    -- For manual payments, get collection from subscription
    SELECT 
      c.id,
      c.name
    FROM collections c
    INNER JOIN subscription_collections sc ON sc.collection_id = c.id
    WHERE sc.subscription_id = NEW.subscription_id
    ORDER BY sc.created_at DESC
    LIMIT 1
    INTO v_collection_id, v_collection_name;
  END IF;
  
  -- Determine if character choice is required
  -- Check if collection has multiple characters
  SELECT COUNT(*) > 1
  FROM collection_characters
  WHERE collection_id = v_collection_id
  INTO v_requires_choice;
  
  -- Set choice deadline if choice is required (7 days from now)
  IF v_requires_choice THEN
    v_choice_deadline := now() + INTERVAL '7 days';
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
    CASE WHEN v_requires_choice THEN NULL ELSE now() + INTERVAL '1 day' END
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

-- =====================================================
-- 6. CREATE TRIGGER FOR MANUAL_PAYMENTS
-- =====================================================

CREATE TRIGGER trigger_auto_populate_production_queue_manual
  AFTER INSERT OR UPDATE OF status ON manual_payments
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_production_queue();

COMMENT ON TRIGGER trigger_auto_populate_production_queue_manual ON manual_payments IS
  'Automatically populates production_queue when manual payment is approved';

-- =====================================================
-- 7. VALIDATE MIGRATION
-- =====================================================

DO $$
BEGIN
  -- Check if constraint was updated
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'production_queue_order_type_check'
    AND contype = 'c'
  ) THEN
    RAISE EXCEPTION 'Constraint production_queue_order_type_check was not created';
  END IF;
  
  -- Check if trigger was created
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_auto_populate_production_queue_manual'
  ) THEN
    RAISE EXCEPTION 'Trigger trigger_auto_populate_production_queue_manual was not created';
  END IF;
  
  RAISE NOTICE 'Migration 20260428000005_add_manual_payment_support.sql completed successfully';
END $$;

-- =====================================================
-- 8. MIGRATION SUMMARY
-- =====================================================

SELECT 
  '20260428000005_add_manual_payment_support.sql' AS migration_file,
  'Add manual_payment support to production_queue and character_choices' AS description,
  'SUCCESS' AS status,
  NOW() AS executed_at,
  'manual_payment order type now supported' AS changes;
