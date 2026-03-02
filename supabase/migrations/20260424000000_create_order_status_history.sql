-- =====================================================
-- MIGRATION: Create order_status_history table
-- Date: 2026-04-24
-- Description: Creates audit log table for tracking order status changes
-- Requirements: 5.4, 12.3, 12.4
-- =====================================================

-- =====================================================
-- 1. CREATE ORDER_STATUS_HISTORY TABLE
-- =====================================================

CREATE TABLE order_status_history (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Order reference (polymorphic - can be subscription_delivery or standalone_purchase)
  order_id UUID NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('subscription_delivery', 'standalone_purchase')),
  
  -- Status change details
  old_status TEXT,
  new_status TEXT NOT NULL,
  
  -- Admin who made the change
  changed_by_admin_id UUID REFERENCES auth.users(id),
  changed_by_admin_name TEXT,
  
  -- Additional context
  change_reason TEXT,
  notes TEXT,
  
  -- Audit timestamp
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for order lookups (most common query)
CREATE INDEX idx_order_status_history_order ON order_status_history(order_id, order_type, created_at DESC);

-- Index for admin lookups
CREATE INDEX idx_order_status_history_admin ON order_status_history(changed_by_admin_id);

-- Index for date range queries
CREATE INDEX idx_order_status_history_created ON order_status_history(created_at DESC);

-- =====================================================
-- 3. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE order_status_history IS 'Audit log for tracking all status changes in orders (subscription deliveries and standalone purchases)';

COMMENT ON COLUMN order_status_history.order_id IS 'ID of the order (subscription_delivery or standalone_purchase)';
COMMENT ON COLUMN order_status_history.order_type IS 'Type of order: subscription_delivery or standalone_purchase';
COMMENT ON COLUMN order_status_history.old_status IS 'Previous status before the change (NULL for initial status)';
COMMENT ON COLUMN order_status_history.new_status IS 'New status after the change';
COMMENT ON COLUMN order_status_history.changed_by_admin_id IS 'ID of the admin user who made the change';
COMMENT ON COLUMN order_status_history.changed_by_admin_name IS 'Name of the admin user (denormalized for performance)';

-- =====================================================
-- 4. CREATE TRIGGER FUNCTIONS FOR AUTO-LOGGING
-- =====================================================

-- Function to log subscription_deliveries status changes
CREATE OR REPLACE FUNCTION log_subscription_delivery_status_change()
RETURNS TRIGGER AS $$
DECLARE
  admin_name TEXT;
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get admin name if available
    IF auth.uid() IS NOT NULL THEN
      SELECT full_name INTO admin_name
      FROM profiles
      WHERE id = auth.uid();
    END IF;
    
    -- Insert history record
    INSERT INTO order_status_history (
      order_id,
      order_type,
      old_status,
      new_status,
      changed_by_admin_id,
      changed_by_admin_name
    ) VALUES (
      NEW.id,
      'subscription_delivery',
      OLD.status,
      NEW.status,
      auth.uid(),
      COALESCE(admin_name, 'System')
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log standalone_purchases status changes
CREATE OR REPLACE FUNCTION log_standalone_purchase_status_change()
RETURNS TRIGGER AS $$
DECLARE
  admin_name TEXT;
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get admin name if available
    IF auth.uid() IS NOT NULL THEN
      SELECT full_name INTO admin_name
      FROM profiles
      WHERE id = auth.uid();
    END IF;
    
    -- Insert history record
    INSERT INTO order_status_history (
      order_id,
      order_type,
      old_status,
      new_status,
      changed_by_admin_id,
      changed_by_admin_name
    ) VALUES (
      NEW.id,
      'standalone_purchase',
      OLD.status,
      NEW.status,
      auth.uid(),
      COALESCE(admin_name, 'System')
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. CREATE TRIGGERS
-- =====================================================

CREATE TRIGGER trigger_log_subscription_delivery_status_change
  AFTER UPDATE ON subscription_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION log_subscription_delivery_status_change();

CREATE TRIGGER trigger_log_standalone_purchase_status_change
  AFTER UPDATE ON standalone_purchases
  FOR EACH ROW
  EXECUTE FUNCTION log_standalone_purchase_status_change();

-- =====================================================
-- 6. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all history
CREATE POLICY "Admins can view all order status history"
  ON order_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: System can insert history records
CREATE POLICY "System can insert order status history"
  ON order_status_history FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- 7. GRANT PERMISSIONS
-- =====================================================

-- Grant SELECT to authenticated users (via RLS)
GRANT SELECT ON order_status_history TO authenticated;

-- Grant INSERT to authenticated users (for trigger)
GRANT INSERT ON order_status_history TO authenticated;

-- Grant all to service role
GRANT ALL ON order_status_history TO service_role;

-- =====================================================
-- 8. CREATE INITIAL HISTORY RECORDS FOR EXISTING ORDERS
-- =====================================================

-- Log initial status for existing subscription deliveries
INSERT INTO order_status_history (
  order_id,
  order_type,
  old_status,
  new_status,
  changed_by_admin_name,
  created_at
)
SELECT 
  id,
  'subscription_delivery',
  NULL,
  status,
  'System',
  created_at
FROM subscription_deliveries
WHERE NOT EXISTS (
  SELECT 1 FROM order_status_history 
  WHERE order_status_history.order_id = subscription_deliveries.id
  AND order_status_history.order_type = 'subscription_delivery'
);

-- Log initial status for existing standalone purchases
INSERT INTO order_status_history (
  order_id,
  order_type,
  old_status,
  new_status,
  changed_by_admin_name,
  created_at
)
SELECT 
  id,
  'standalone_purchase',
  NULL,
  status,
  'System',
  created_at
FROM standalone_purchases
WHERE NOT EXISTS (
  SELECT 1 FROM order_status_history 
  WHERE order_status_history.order_id = standalone_purchases.id
  AND order_status_history.order_type = 'standalone_purchase'
);

-- =====================================================
-- 9. VALIDATE MIGRATION
-- =====================================================

DO $$
BEGIN
  -- Check if table was created
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'order_status_history'
  ) THEN
    RAISE EXCEPTION 'Table order_status_history was not created';
  END IF;
  
  -- Check if indexes were created
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'order_status_history' 
    AND indexname = 'idx_order_status_history_order'
  ) THEN
    RAISE EXCEPTION 'Index idx_order_status_history_order was not created';
  END IF;
  
  -- Check if triggers were created
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_log_subscription_delivery_status_change'
  ) THEN
    RAISE EXCEPTION 'Trigger trigger_log_subscription_delivery_status_change was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_log_standalone_purchase_status_change'
  ) THEN
    RAISE EXCEPTION 'Trigger trigger_log_standalone_purchase_status_change was not created';
  END IF;
  
  RAISE NOTICE 'Migration 20260424000000_create_order_status_history.sql completed successfully';
END $$;

-- =====================================================
-- 10. MIGRATION SUMMARY
-- =====================================================

SELECT 
  '20260424000000_create_order_status_history.sql' AS migration_file,
  'Create order_status_history table with triggers' AS description,
  'SUCCESS' AS status,
  NOW() AS executed_at,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_status_history') AS table_created,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'order_status_history') AS indexes_created,
  (SELECT COUNT(*) FROM pg_trigger WHERE tgname LIKE '%order_status%') AS triggers_created,
  (SELECT COUNT(*) FROM order_status_history) AS initial_records_created;
