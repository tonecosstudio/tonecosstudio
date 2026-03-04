-- =====================================================
-- MIGRATION: Add denormalized fields to character_choices
-- Date: 2026-05-06
-- Description: Adds denormalized customer and collection fields to character_choices table
--              to avoid complex joins and improve query performance
-- =====================================================

-- =====================================================
-- 1. ADD DENORMALIZED COLUMNS
-- =====================================================

ALTER TABLE character_choices
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_email TEXT,
ADD COLUMN IF NOT EXISTS collection_name TEXT;

COMMENT ON COLUMN character_choices.customer_name IS 'Denormalized customer name from profiles table';
COMMENT ON COLUMN character_choices.customer_email IS 'Denormalized customer email from profiles table';
COMMENT ON COLUMN character_choices.collection_name IS 'Denormalized collection name from collections table';

-- =====================================================
-- 2. POPULATE EXISTING RECORDS
-- =====================================================

-- Populate customer data from profiles
UPDATE character_choices cc
SET 
  customer_name = COALESCE(p.full_name, p.email, 'Unknown Customer'),
  customer_email = p.email
FROM profiles p
WHERE cc.user_id = p.id
  AND (cc.customer_name IS NULL OR cc.customer_email IS NULL);

-- Populate collection data from collections
UPDATE character_choices cc
SET collection_name = c.name
FROM collections c
WHERE cc.collection_id = c.id
  AND cc.collection_name IS NULL;

-- =====================================================
-- 3. UPDATE AUTO_POPULATE_PRODUCTION_QUEUE FUNCTION
-- =====================================================

-- Update the trigger function to also populate character_choices with denormalized data
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
      v_approval_date := NEW.updated_at;
    -- For standalone_purchases: status = 'balance_paid'
    ELSIF v_order_type = 'standalone_purchase' THEN
      IF NEW.status != 'balance_paid' OR OLD.status = 'balance_paid' THEN
        RETURN NEW;
      END IF;
      v_approval_date := NEW.updated_at;
    -- For manual_payments: status = 'approved'
    ELSIF v_order_type = 'manual_payment' THEN
      IF NEW.status != 'approved' OR OLD.status = 'approved' THEN
        RETURN NEW;
      END IF;
      v_approval_date := NEW.updated_at;
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
    v_approval_date := NEW.created_at;
  END IF;
  
  -- Check if production queue entry already exists
  IF EXISTS (
    SELECT 1 FROM production_queue 
    WHERE order_id = NEW.id AND order_type = v_order_type
  ) THEN
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
  SELECT COUNT(*) > 1
  FROM collection_characters
  WHERE collection_id = v_collection_id
  INTO v_requires_choice;
  
  -- Calculate choice deadline using the function if choice is required
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
    NULL,
    NULL,
    CASE WHEN v_requires_choice THEN 'awaiting_choice' ELSE 'ready_for_production' END,
    CASE WHEN v_requires_choice THEN 'awaiting_choice' ELSE 'design' END,
    CASE WHEN v_requires_choice THEN 'pending' ELSE 'approved' END,
    v_choice_deadline,
    CASE WHEN v_requires_choice THEN NULL ELSE v_approval_date + INTERVAL '1 day' END
  );
  
  -- Create character_choices record if choice is required (WITH DENORMALIZED DATA)
  IF v_requires_choice THEN
    INSERT INTO character_choices (
      order_id,
      order_type,
      user_id,
      collection_id,
      status,
      deadline,
      customer_name,
      customer_email,
      collection_name
    ) VALUES (
      NEW.id,
      v_order_type,
      NEW.user_id,
      v_collection_id,
      'pending',
      v_choice_deadline,
      v_customer_name,
      v_customer_email,
      v_collection_name
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_populate_production_queue IS 
  'Trigger function that automatically creates production_queue and character_choices records (with denormalized data) when orders are approved.';

-- =====================================================
-- 4. VALIDATE MIGRATION
-- =====================================================

DO $$
BEGIN
  -- Check if columns were added
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'character_choices' AND column_name = 'customer_name'
  ) THEN
    RAISE EXCEPTION 'Column customer_name was not added to character_choices';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'character_choices' AND column_name = 'customer_email'
  ) THEN
    RAISE EXCEPTION 'Column customer_email was not added to character_choices';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'character_choices' AND column_name = 'collection_name'
  ) THEN
    RAISE EXCEPTION 'Column collection_name was not added to character_choices';
  END IF;
  
  RAISE NOTICE 'Migration 20260506000000_add_denormalized_fields_to_character_choices.sql completed successfully';
END $$;
