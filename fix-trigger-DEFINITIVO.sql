-- =====================================================
-- CORREÇÃO: auto_populate_production_queue
-- Data: 2026-03-07
-- Usa: user_id
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
  v_approval_date TIMESTAMPTZ;
  v_user_id UUID;
BEGIN
  -- Determine order type
  IF TG_TABLE_NAME = 'subscription_deliveries' THEN
    v_order_type := 'subscription_delivery';
    SELECT user_id INTO v_user_id FROM subscriptions WHERE id = NEW.subscription_id;
  ELSIF TG_TABLE_NAME = 'standalone_purchases' THEN
    v_order_type := 'standalone_purchase';
    v_user_id := NEW.user_id;
  ELSIF TG_TABLE_NAME = 'manual_payments' THEN
    v_order_type := 'manual_payment';
    v_user_id := NEW.user_id;
  ELSE
    RAISE EXCEPTION 'Unsupported table: %', TG_TABLE_NAME;
  END IF;
  
  -- Check status
  IF TG_OP = 'UPDATE' THEN
    IF v_order_type = 'subscription_delivery' AND (NEW.status != 'confirmed' OR OLD.status = 'confirmed') THEN
      RETURN NEW;
    ELSIF v_order_type = 'standalone_purchase' AND (NEW.status != 'balance_paid' OR OLD.status = 'balance_paid') THEN
      RETURN NEW;
    ELSIF v_order_type = 'manual_payment' AND (NEW.status != 'approved' OR OLD.status = 'approved') THEN
      RETURN NEW;
    END IF;
    v_approval_date := NEW.updated_at;
  ELSIF TG_OP = 'INSERT' THEN
    IF (v_order_type = 'subscription_delivery' AND NEW.status != 'confirmed')
      OR (v_order_type = 'standalone_purchase' AND NEW.status != 'balance_paid')
      OR (v_order_type = 'manual_payment' AND NEW.status != 'approved') THEN
      RETURN NEW;
    END IF;
    v_approval_date := NEW.created_at;
  END IF;
  
  -- Check if already exists
  IF EXISTS (SELECT 1 FROM production_queue WHERE order_id = NEW.id AND order_type = v_order_type) THEN
    RETURN NEW;
  END IF;
  
  -- Get customer info
  SELECT COALESCE(p.full_name, p.email, 'Unknown'), p.email
  INTO v_customer_name, v_customer_email
  FROM profiles p WHERE p.id = v_user_id;
  
  -- Get collection info
  SELECT c.id, c.name
  INTO v_collection_id, v_collection_name
  FROM collections c WHERE c.id = NEW.collection_id;
  
  -- Check if choice required
  SELECT COUNT(*) > 1 INTO v_requires_choice
  FROM collection_characters WHERE collection_id = v_collection_id;
  
  -- Calculate deadline
  IF v_requires_choice THEN
    v_choice_deadline := calculate_character_choice_deadline(v_approval_date);
  ELSE
    v_choice_deadline := NULL;
  END IF;
  
  -- Insert into production_queue
  INSERT INTO production_queue (
    order_id, order_type, user_id, customer_name, customer_email,
    collection_id, collection_name, character_id, character_name,
    production_status, current_stage, choice_status, choice_deadline, scheduled_production_date
  ) VALUES (
    NEW.id, v_order_type, v_user_id, v_customer_name, v_customer_email,
    v_collection_id, v_collection_name, NULL, NULL,
    CASE WHEN v_requires_choice THEN 'awaiting_choice' ELSE 'ready_for_production' END,
    CASE WHEN v_requires_choice THEN 'awaiting_choice' ELSE 'design' END,
    CASE WHEN v_requires_choice THEN 'pending' ELSE 'approved' END,
    v_choice_deadline,
    CASE WHEN v_requires_choice THEN NULL ELSE v_approval_date + INTERVAL '1 day' END
  );
  
  -- Create character_choices if needed
  IF v_requires_choice THEN
    INSERT INTO character_choices (
      order_id, order_type, user_id, collection_id, status, deadline,
      customer_name, customer_email, collection_name
    ) VALUES (
      NEW.id, v_order_type, v_user_id, v_collection_id, 'pending', v_choice_deadline,
      v_customer_name, v_customer_email, v_collection_name
    ) ON CONFLICT (order_id, order_type) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_populate_production_queue IS 
  'Trigger function that automatically creates production_queue records. FIXED to use user_id.';
