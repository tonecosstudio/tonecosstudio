-- =====================================================
-- MIGRATION: Create production management functions
-- Date: 2026-04-28
-- Description: Creates utility functions for production management system
-- Requirements: 2.1, 2.2, 2.3, 2.5
-- =====================================================

-- =====================================================
-- 1. FUNCTION: get_production_metrics()
-- =====================================================
-- Returns JSON with counts per stage and other production metrics
-- Used by the dashboard to display real-time statistics

CREATE OR REPLACE FUNCTION get_production_metrics()
RETURNS JSON AS $
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    -- Stage counts
    'stages', json_build_object(
      'awaiting_choice', (SELECT COUNT(*) FROM production_queue WHERE current_stage = 'awaiting_choice'),
      'design', (SELECT COUNT(*) FROM production_queue WHERE current_stage = 'design'),
      'production', (SELECT COUNT(*) FROM production_queue WHERE current_stage = 'production'),
      'quality_check', (SELECT COUNT(*) FROM production_queue WHERE current_stage = 'quality_check'),
      'packaging', (SELECT COUNT(*) FROM production_queue WHERE current_stage = 'packaging'),
      'shipped', (SELECT COUNT(*) FROM production_queue WHERE current_stage = 'shipped')
    ),
    
    -- Status counts
    'statuses', json_build_object(
      'awaiting_choice', (SELECT COUNT(*) FROM production_queue WHERE production_status = 'awaiting_choice'),
      'ready_for_production', (SELECT COUNT(*) FROM production_queue WHERE production_status = 'ready_for_production'),
      'in_production', (SELECT COUNT(*) FROM production_queue WHERE production_status = 'in_production'),
      'completed', (SELECT COUNT(*) FROM production_queue WHERE production_status = 'completed'),
      'on_hold', (SELECT COUNT(*) FROM production_queue WHERE production_status = 'on_hold'),
      'cancelled', (SELECT COUNT(*) FROM production_queue WHERE production_status = 'cancelled')
    ),
    
    -- Priority counts
    'priorities', json_build_object(
      'critical', (SELECT COUNT(*) FROM production_queue WHERE priority = 'critical'),
      'high', (SELECT COUNT(*) FROM production_queue WHERE priority = 'high'),
      'normal', (SELECT COUNT(*) FROM production_queue WHERE priority = 'normal'),
      'low', (SELECT COUNT(*) FROM production_queue WHERE priority = 'low')
    ),
    
    -- Choice status counts
    'choices', json_build_object(
      'pending', (SELECT COUNT(*) FROM production_queue WHERE choice_status = 'pending'),
      'submitted', (SELECT COUNT(*) FROM production_queue WHERE choice_status = 'submitted'),
      'approved', (SELECT COUNT(*) FROM production_queue WHERE choice_status = 'approved'),
      'rejected', (SELECT COUNT(*) FROM production_queue WHERE choice_status = 'rejected'),
      'locked', (SELECT COUNT(*) FROM production_queue WHERE choice_status = 'locked')
    ),
    
    -- Urgent items
    'urgent', json_build_object(
      'deadline_critical', (
        SELECT COUNT(*) FROM production_queue 
        WHERE choice_deadline IS NOT NULL 
        AND choice_status = 'pending' 
        AND EXTRACT(EPOCH FROM (choice_deadline - now())) / 3600 < 24
      ),
      'deadline_urgent', (
        SELECT COUNT(*) FROM production_queue 
        WHERE choice_deadline IS NOT NULL 
        AND choice_status = 'pending' 
        AND EXTRACT(EPOCH FROM (choice_deadline - now())) / 3600 < 48
      ),
      'blocked', (SELECT COUNT(*) FROM production_queue WHERE production_status = 'on_hold'),
      'overdue', (
        SELECT COUNT(*) FROM production_queue 
        WHERE production_started_at IS NOT NULL 
        AND production_completed_at IS NULL
        AND EXTRACT(EPOCH FROM (now() - production_started_at)) / 3600 > 240
      )
    ),
    
    -- Scheduled items
    'scheduled', json_build_object(
      'today', (
        SELECT COUNT(*) FROM production_queue 
        WHERE scheduled_production_date IS NOT NULL 
        AND scheduled_production_date::date = CURRENT_DATE
      ),
      'this_week', (
        SELECT COUNT(*) FROM production_queue 
        WHERE scheduled_production_date IS NOT NULL 
        AND scheduled_production_date >= CURRENT_DATE 
        AND scheduled_production_date < CURRENT_DATE + INTERVAL '7 days'
      ),
      'this_month', (
        SELECT COUNT(*) FROM production_queue 
        WHERE scheduled_production_date IS NOT NULL 
        AND scheduled_production_date >= CURRENT_DATE 
        AND scheduled_production_date < CURRENT_DATE + INTERVAL '30 days'
      )
    ),
    
    -- Average stage durations (in hours)
    'avg_stage_durations', (
      SELECT json_object_agg(stage_name, avg_duration_hours)
      FROM (
        SELECT 
          stage_name,
          ROUND(AVG(actual_duration)::numeric, 2) AS avg_duration_hours
        FROM production_stages
        WHERE status = 'completed' AND actual_duration IS NOT NULL
        GROUP BY stage_name
      ) AS stage_avgs
    ),
    
    -- Overall metrics
    'overall', json_build_object(
      'total_items', (SELECT COUNT(*) FROM production_queue),
      'avg_production_time_hours', (
        SELECT ROUND(AVG(EXTRACT(EPOCH FROM (production_completed_at - production_started_at)) / 3600)::numeric, 2)
        FROM production_queue
        WHERE production_completed_at IS NOT NULL AND production_started_at IS NOT NULL
      ),
      'completion_rate', (
        SELECT ROUND((COUNT(*) FILTER (WHERE production_status = 'completed')::numeric / 
                     NULLIF(COUNT(*)::numeric, 0) * 100), 2)
        FROM production_queue
      ),
      'avg_priority_score', (
        SELECT ROUND(AVG(priority_score)::numeric, 2)
        FROM production_queue
      )
    ),
    
    -- Timestamp
    'generated_at', to_json(now())
  ) INTO result;
  
  RETURN result;
END;
$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_production_metrics IS 
  'Returns comprehensive production metrics as JSON including counts per stage, status, priority, and performance statistics';

-- =====================================================
-- 2. FUNCTION: check_character_availability(character_id)
-- =====================================================
-- Checks if a character is available for selection
-- Returns true if available, false otherwise

CREATE OR REPLACE FUNCTION check_character_availability(
  p_character_id UUID
)
RETURNS BOOLEAN AS $
DECLARE
  v_is_available BOOLEAN;
  v_character_exists BOOLEAN;
BEGIN
  -- Check if character exists
  SELECT EXISTS (
    SELECT 1 FROM collection_characters 
    WHERE id = p_character_id
  ) INTO v_character_exists;
  
  IF NOT v_character_exists THEN
    RETURN false;
  END IF;
  
  -- Check if character is marked as available
  SELECT is_available 
  FROM collection_characters 
  WHERE id = p_character_id
  INTO v_is_available;
  
  -- If is_available is NULL, treat as available (backward compatibility)
  IF v_is_available IS NULL THEN
    v_is_available := true;
  END IF;
  
  RETURN v_is_available;
END;
$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION check_character_availability IS 
  'Checks if a character is available for selection. Returns true if available, false otherwise.';

-- =====================================================
-- 3. FUNCTION: auto_populate_production_queue()
-- =====================================================
-- Trigger function that automatically populates production_queue
-- when an order is approved (subscription_delivery or standalone_purchase)

CREATE OR REPLACE FUNCTION auto_populate_production_queue()
RETURNS TRIGGER AS $
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
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    -- For INSERT, check if status is already approved
    IF v_order_type = 'subscription_delivery' AND NEW.status != 'confirmed' THEN
      RETURN NEW;
    ELSIF v_order_type = 'standalone_purchase' AND NEW.status != 'balance_paid' THEN
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
  
  -- Get collection information
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
$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_populate_production_queue IS 
  'Trigger function that automatically creates production_queue and character_choices records when orders are approved';

-- =====================================================
-- 4. CREATE TRIGGERS FOR AUTO-POPULATION
-- =====================================================

-- Trigger for subscription_deliveries
CREATE TRIGGER trigger_auto_populate_production_queue_subscription
  AFTER INSERT OR UPDATE OF status ON subscription_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_production_queue();

COMMENT ON TRIGGER trigger_auto_populate_production_queue_subscription ON subscription_deliveries IS
  'Automatically populates production_queue when subscription delivery is confirmed';

-- Trigger for standalone_purchases
CREATE TRIGGER trigger_auto_populate_production_queue_standalone
  AFTER INSERT OR UPDATE OF status ON standalone_purchases
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_production_queue();

COMMENT ON TRIGGER trigger_auto_populate_production_queue_standalone ON standalone_purchases IS
  'Automatically populates production_queue when standalone purchase balance is paid';

-- =====================================================
-- 5. GRANT PERMISSIONS
-- =====================================================

-- Grant EXECUTE on functions to authenticated users
GRANT EXECUTE ON FUNCTION get_production_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION check_character_availability(UUID) TO authenticated;

-- Grant EXECUTE to service role
GRANT EXECUTE ON FUNCTION get_production_metrics() TO service_role;
GRANT EXECUTE ON FUNCTION check_character_availability(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION auto_populate_production_queue() TO service_role;

-- =====================================================
-- 6. VALIDATE MIGRATION
-- =====================================================

DO $
BEGIN
  -- Check if functions were created
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_production_metrics'
  ) THEN
    RAISE EXCEPTION 'Function get_production_metrics was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'check_character_availability'
  ) THEN
    RAISE EXCEPTION 'Function check_character_availability was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'auto_populate_production_queue'
  ) THEN
    RAISE EXCEPTION 'Function auto_populate_production_queue was not created';
  END IF;
  
  -- Check if triggers were created
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_auto_populate_production_queue_subscription'
  ) THEN
    RAISE EXCEPTION 'Trigger trigger_auto_populate_production_queue_subscription was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_auto_populate_production_queue_standalone'
  ) THEN
    RAISE EXCEPTION 'Trigger trigger_auto_populate_production_queue_standalone was not created';
  END IF;
  
  RAISE NOTICE 'Migration 20260428000004_create_production_functions.sql completed successfully';
END $;

-- =====================================================
-- 7. TEST FUNCTIONS (Optional - for development)
-- =====================================================

-- Test get_production_metrics function
-- SELECT get_production_metrics();

-- Test check_character_availability function
-- SELECT check_character_availability('some-uuid-here');

-- =====================================================
-- 8. MIGRATION SUMMARY
-- =====================================================

SELECT 
  '20260428000004_create_production_functions.sql' AS migration_file,
  'Create production management utility functions and auto-population triggers' AS description,
  'SUCCESS' AS status,
  NOW() AS executed_at,
  (SELECT COUNT(*) FROM pg_proc WHERE proname IN ('get_production_metrics', 'check_character_availability', 'auto_populate_production_queue')) AS functions_created,
  (SELECT COUNT(*) FROM pg_trigger WHERE tgname LIKE '%auto_populate_production_queue%') AS triggers_created;
