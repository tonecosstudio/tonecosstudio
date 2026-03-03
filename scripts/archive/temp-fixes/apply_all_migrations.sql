-- ============================================
-- APLICAÇÃO COMPLETA DE TODAS AS MIGRATIONS
-- Execute este arquivo no Supabase SQL Editor
-- ============================================

-- ============================================
-- MIGRATION 1: Migrate legacy data
-- ============================================

INSERT INTO subscription_collections (subscription_id, collection_id, added_at)
SELECT 
  s.id,
  s.collection_id,
  s.created_at
FROM subscriptions s
LEFT JOIN subscription_collections sc ON sc.subscription_id = s.id AND sc.collection_id = s.collection_id
WHERE s.collection_id IS NOT NULL
AND sc.id IS NULL
ON CONFLICT (subscription_id, collection_id) DO NOTHING;

COMMENT ON COLUMN subscriptions.collection_id IS 
  'DEPRECATED: Legacy field. Use subscription_collections table for N:N relationship.';

-- ============================================
-- MIGRATION 2: Fix collection trigger
-- ============================================

DROP FUNCTION IF EXISTS create_group_for_new_collection() CASCADE;

CREATE OR REPLACE FUNCTION create_group_for_new_collection()
RETURNS TRIGGER AS $$
DECLARE
  group_name TEXT;
  admin_user_id UUID;
BEGIN
  SELECT ur.user_id INTO admin_user_id
  FROM user_roles ur
  WHERE ur.role = 'admin'
  LIMIT 1;
  
  IF admin_user_id IS NULL THEN
    SELECT id INTO admin_user_id
    FROM auth.users
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;
  
  IF admin_user_id IS NULL THEN
    RAISE NOTICE 'No admin or user found to create chat group for collection %', NEW.id;
    RETURN NEW;
  END IF;
  
  group_name := '📦 ' || NEW.name;
  
  INSERT INTO chat_groups (name, type, membership_criteria, created_by, created_at, updated_at)
  VALUES (
    group_name,
    'colecao',
    jsonb_build_object('type', 'colecao', 'collectionId', NEW.id::text),
    admin_user_id,
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Failed to create chat group for collection %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_group_for_collection ON collections;

CREATE TRIGGER trigger_create_group_for_collection
  AFTER INSERT ON collections
  FOR EACH ROW
  EXECUTE FUNCTION create_group_for_new_collection();

-- ============================================
-- MIGRATION 3: Business functions
-- ============================================

CREATE OR REPLACE FUNCTION create_subscription_deliveries(p_subscription_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_subscription RECORD;
  v_deliveries_count INTEGER := 0;
  v_delivery_number INTEGER;
  v_delivery_date TIMESTAMPTZ;
BEGIN
  SELECT id, plan_type, deliveries_total, next_delivery_date
  INTO v_subscription
  FROM subscriptions
  WHERE id = p_subscription_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription % not found', p_subscription_id;
  END IF;
  
  FOR v_delivery_number IN 1..v_subscription.deliveries_total LOOP
    v_delivery_date := v_subscription.next_delivery_date + ((v_delivery_number - 1) * INTERVAL '30 days');
    
    INSERT INTO subscription_deliveries (
      subscription_id, delivery_number, status, expected_delivery_date, created_at, updated_at
    )
    VALUES (
      p_subscription_id, v_delivery_number, 'scheduled', v_delivery_date, NOW(), NOW()
    )
    ON CONFLICT (subscription_id, delivery_number) DO NOTHING;
    
    v_deliveries_count := v_deliveries_count + 1;
  END LOOP;
  
  RETURN v_deliveries_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION activate_subscription_from_payment(p_payment_id UUID)
RETURNS UUID AS $$
DECLARE
  v_payment RECORD;
  v_subscription_id UUID;
  v_deliveries_created INTEGER;
BEGIN
  SELECT id, subscription_id, amount, status, approved_at
  INTO v_payment
  FROM manual_payments
  WHERE id = p_payment_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment % not found', p_payment_id;
  END IF;
  
  IF v_payment.status != 'approved' THEN
    RAISE EXCEPTION 'Payment % is not approved', p_payment_id;
  END IF;
  
  IF v_payment.subscription_id IS NULL THEN
    RAISE EXCEPTION 'Payment % is not linked to a subscription', p_payment_id;
  END IF;
  
  v_subscription_id := v_payment.subscription_id;
  
  UPDATE subscriptions
  SET 
    status = 'active',
    total_paid = v_payment.amount,
    payment_method = 'pix',
    payment_id = v_payment.id::text,
    next_delivery_date = COALESCE(next_delivery_date, NOW() + INTERVAL '3 months'),
    next_production_start = COALESCE(next_production_start, NOW() + INTERVAL '3 months' - INTERVAL '15 days'),
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
    RAISE NOTICE 'Subscription % was not in pending_payment status', v_subscription_id;
    RETURN v_subscription_id;
  END IF;
  
  v_deliveries_created := create_subscription_deliveries(v_subscription_id);
  
  RAISE NOTICE 'Subscription % activated with % deliveries', v_subscription_id, v_deliveries_created;
  
  RETURN v_subscription_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_subscription_data()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.plan_type = 'trimestral' AND NEW.deliveries_total != 3 THEN
    NEW.deliveries_total := 3;
  ELSIF NEW.plan_type = 'semestral' AND NEW.deliveries_total != 6 THEN
    NEW.deliveries_total := 6;
  ELSIF NEW.plan_type = 'anual' AND NEW.deliveries_total != 12 THEN
    NEW.deliveries_total := 12;
  END IF;
  
  IF NEW.deliveries_completed > NEW.deliveries_total THEN
    RAISE EXCEPTION 'deliveries_completed cannot exceed deliveries_total';
  END IF;
  
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

DROP TRIGGER IF EXISTS trigger_validate_subscription_data ON subscriptions;

CREATE TRIGGER trigger_validate_subscription_data
  BEFORE INSERT OR UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION validate_subscription_data();

CREATE OR REPLACE FUNCTION auto_activate_subscription_on_payment_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    IF NEW.subscription_id IS NOT NULL THEN
      PERFORM activate_subscription_from_payment(NEW.id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_activate_subscription ON manual_payments;

CREATE TRIGGER trigger_auto_activate_subscription
  AFTER UPDATE ON manual_payments
  FOR EACH ROW
  EXECUTE FUNCTION auto_activate_subscription_on_payment_approval();

-- ============================================
-- MIGRATION 4: Constraints
-- ============================================

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS check_deliveries_completed_valid;
ALTER TABLE subscriptions ADD CONSTRAINT check_deliveries_completed_valid
  CHECK (deliveries_completed <= deliveries_total);

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS check_total_paid_non_negative;
ALTER TABLE subscriptions ADD CONSTRAINT check_total_paid_non_negative
  CHECK (total_paid >= 0);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status_dates
  ON subscriptions (status, next_delivery_date, next_production_start)
  WHERE status = 'active';

-- ============================================
-- MIGRATION 5: Cleanup
-- ============================================

WITH ranked_subscriptions AS (
  SELECT 
    id,
    user_id,
    status,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY user_id, status ORDER BY created_at DESC) as rn
  FROM subscriptions
  WHERE status = 'pending_payment'
)
UPDATE subscriptions s
SET status = 'cancelled', updated_at = NOW()
FROM ranked_subscriptions rs
WHERE s.id = rs.id AND rs.rn > 1 AND rs.status = 'pending_payment';

UPDATE subscriptions
SET 
  deliveries_total = CASE 
    WHEN plan_type = 'trimestral' THEN 3
    WHEN plan_type = 'semestral' THEN 6
    WHEN plan_type = 'anual' THEN 12
    ELSE 3
  END,
  deliveries_completed = COALESCE(deliveries_completed, 0),
  updated_at = NOW()
WHERE status = 'active'
AND (deliveries_total IS NULL OR deliveries_total = 0);

UPDATE subscriptions
SET 
  next_delivery_date = COALESCE(next_delivery_date, NOW() + INTERVAL '3 months'),
  next_production_start = COALESCE(next_production_start, NOW() + INTERVAL '3 months' - INTERVAL '15 days'),
  updated_at = NOW()
WHERE status = 'active'
AND (next_delivery_date IS NULL OR next_production_start IS NULL);
