-- =====================================================
-- MIGRATION: Fix Trigger Function to Use user_id
-- Date: 2026-03-07
-- Description: Fixes auto_populate_production_queue to use user_id instead of customer_id
-- =====================================================

-- The trigger function was written for customer_id but the table has user_id
-- This migration fixes the function to match the actual schema

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
  v_user_id UUID;
BEGIN
  -- Determine order type based on trigger table
  IF TG_TABLE_NAME = 'subscription_deliveries' THEN
    v_order_type := 'subscription_delivery';
    -- Get user_id from subscription
    SELECT user_id INTO v_user_id
    FROM subscriptions
    WHERE id = NEW.subscription_id;
  ELSIF TG_TABLE_NAME = 'standalone_purchases' THEN
    v_order_type := 'standalone_purchase';
    v_user_id := NEW.user_id;
  ELSIF TG_TABLE_NAME = 'manual_payments' THEN
    v_order_type := 'manual_payment';
    v_user_id := NEW.user_id;
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
  WHERE p.id = v_user_id
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
  
  -- Insert into production_queue (using user_id, not customer_id)
  INSERT INTO production_queue (
    order_id,
    order_type,
    user_id,  -- ← FIXED: use user_id instead of customer_id
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
    v_user_id,  -- ← FIXED: use v_user_id
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
  
  -- Create character_choices record if choice is required
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
      v_user_id,
      v_collection_id,
      'pending',
      v_choice_deadline,
      v_customer_name,
      v_customer_email,
      v_collection_name
    )
    ON CONFLICT (order_id, order_type) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_populate_production_queue IS 
  'Trigger function that automatically creates production_queue and character_choices records when orders are approved. FIXED to use user_id instead of customer_id.';
