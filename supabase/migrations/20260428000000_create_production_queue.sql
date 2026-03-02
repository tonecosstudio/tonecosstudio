-- =====================================================
-- MIGRATION: Create production_queue table
-- Date: 2026-04-28
-- Description: Creates production queue table for managing production lifecycle
-- Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
-- =====================================================

-- =====================================================
-- 1. CREATE PRODUCTION_QUEUE TABLE
-- =====================================================

CREATE TABLE production_queue (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Order reference (polymorphic - can be subscription_delivery or standalone_purchase)
  order_id UUID NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('subscription_delivery', 'standalone_purchase')),
  
  -- Customer reference
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  
  -- Collection & Character
  collection_id UUID NOT NULL REFERENCES collections(id),
  collection_name TEXT NOT NULL,
  character_id UUID REFERENCES collection_characters(id),
  character_name TEXT,
  
  -- Production Status
  production_status TEXT NOT NULL DEFAULT 'awaiting_choice' CHECK (production_status IN (
    'awaiting_choice',
    'ready_for_production',
    'in_production',
    'completed',
    'on_hold',
    'cancelled'
  )),
  current_stage TEXT NOT NULL DEFAULT 'awaiting_choice' CHECK (current_stage IN (
    'awaiting_choice',
    'design',
    'production',
    'quality_check',
    'packaging',
    'shipped'
  )),
  
  -- Choice Management
  choice_status TEXT NOT NULL DEFAULT 'pending' CHECK (choice_status IN (
    'pending',
    'submitted',
    'approved',
    'rejected',
    'locked'
  )),
  choice_deadline TIMESTAMPTZ,
  choice_made_at TIMESTAMPTZ,
  
  -- Priority & Scheduling
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN (
    'critical',
    'high',
    'normal',
    'low'
  )),
  priority_score INTEGER NOT NULL DEFAULT 50,
  scheduled_production_date TIMESTAMPTZ,
  estimated_completion_date TIMESTAMPTZ,
  
  -- Assignment
  assigned_to UUID REFERENCES auth.users(id),
  assigned_to_name TEXT,
  assigned_at TIMESTAMPTZ,
  
  -- Tracking
  production_started_at TIMESTAMPTZ,
  production_completed_at TIMESTAMPTZ,
  
  -- Notes & Metadata
  production_notes TEXT,
  customer_notes TEXT,
  internal_flags TEXT[] DEFAULT '{}',
  
  -- Audit timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_production_dates CHECK (
    production_started_at IS NULL OR 
    production_completed_at IS NULL OR 
    production_started_at <= production_completed_at
  ),
  CONSTRAINT valid_choice_deadline CHECK (
    choice_status != 'pending' OR 
    choice_deadline IS NULL OR 
    choice_deadline > created_at
  )
);

-- =====================================================
-- 2. ADD FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Note: We cannot add traditional foreign keys because order_id is polymorphic
-- (it can reference either subscription_deliveries or standalone_purchases).
-- Instead, we use a trigger to validate the foreign key relationship.

CREATE OR REPLACE FUNCTION validate_production_queue_order_reference()
RETURNS TRIGGER AS $
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
  END IF;
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_production_queue_order_reference
  BEFORE INSERT OR UPDATE OF order_id, order_type
  ON production_queue
  FOR EACH ROW
  EXECUTE FUNCTION validate_production_queue_order_reference();

COMMENT ON FUNCTION validate_production_queue_order_reference IS 
  'Validates that order_id references a valid record in either subscription_deliveries or standalone_purchases based on order_type';

-- =====================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for order lookups (most common query)
CREATE INDEX idx_production_queue_order ON production_queue(order_id, order_type);

-- Index for customer lookups
CREATE INDEX idx_production_queue_customer ON production_queue(customer_id);

-- Index for status filtering (critical for dashboard)
CREATE INDEX idx_production_queue_status ON production_queue(production_status);

-- Index for priority sorting (critical for dashboard)
CREATE INDEX idx_production_queue_priority ON production_queue(priority_score DESC, choice_deadline ASC NULLS LAST);

-- Index for choice deadline queries (for reminder jobs)
CREATE INDEX idx_production_queue_choice_deadline ON production_queue(choice_deadline) 
  WHERE choice_status = 'pending' AND choice_deadline IS NOT NULL;

-- Composite index for collection-based views
CREATE INDEX idx_production_queue_collection_stage ON production_queue(collection_id, current_stage);

-- Index for assignment queries
CREATE INDEX idx_production_queue_assigned ON production_queue(assigned_to) 
  WHERE assigned_to IS NOT NULL;

-- Index for scheduled production date
CREATE INDEX idx_production_queue_scheduled ON production_queue(scheduled_production_date) 
  WHERE scheduled_production_date IS NOT NULL;

-- =====================================================
-- 4. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE production_queue IS 'Central table for managing production lifecycle of all orders (subscription deliveries and standalone purchases)';

COMMENT ON COLUMN production_queue.order_id IS 'ID of the order (subscription_delivery or standalone_purchase)';
COMMENT ON COLUMN production_queue.order_type IS 'Type of order: subscription_delivery or standalone_purchase';
COMMENT ON COLUMN production_queue.customer_id IS 'ID of the customer who placed the order';
COMMENT ON COLUMN production_queue.customer_name IS 'Customer full name (denormalized for performance)';
COMMENT ON COLUMN production_queue.customer_email IS 'Customer email (denormalized for performance)';
COMMENT ON COLUMN production_queue.collection_id IS 'ID of the collection being produced';
COMMENT ON COLUMN production_queue.collection_name IS 'Collection name (denormalized for performance)';
COMMENT ON COLUMN production_queue.character_id IS 'ID of the chosen character (NULL if not yet chosen)';
COMMENT ON COLUMN production_queue.character_name IS 'Character name (denormalized for performance)';
COMMENT ON COLUMN production_queue.production_status IS 'Overall production status';
COMMENT ON COLUMN production_queue.current_stage IS 'Current production stage';
COMMENT ON COLUMN production_queue.choice_status IS 'Status of character choice workflow';
COMMENT ON COLUMN production_queue.choice_deadline IS 'Deadline for customer to choose character';
COMMENT ON COLUMN production_queue.choice_made_at IS 'Timestamp when customer submitted their choice';
COMMENT ON COLUMN production_queue.priority IS 'Priority level (critical/high/normal/low)';
COMMENT ON COLUMN production_queue.priority_score IS 'Calculated priority score for sorting (0-100)';
COMMENT ON COLUMN production_queue.scheduled_production_date IS 'Date when production is scheduled to start';
COMMENT ON COLUMN production_queue.estimated_completion_date IS 'Estimated date when production will be completed';
COMMENT ON COLUMN production_queue.assigned_to IS 'ID of team member assigned to this item';
COMMENT ON COLUMN production_queue.assigned_to_name IS 'Name of assigned team member (denormalized for performance)';
COMMENT ON COLUMN production_queue.assigned_at IS 'Timestamp when item was assigned';
COMMENT ON COLUMN production_queue.production_started_at IS 'Timestamp when production actually started';
COMMENT ON COLUMN production_queue.production_completed_at IS 'Timestamp when production was completed';
COMMENT ON COLUMN production_queue.production_notes IS 'Internal production notes (admin only)';
COMMENT ON COLUMN production_queue.customer_notes IS 'Notes from customer about their order';
COMMENT ON COLUMN production_queue.internal_flags IS 'Array of internal flags (e.g., ["urgent", "vip_customer", "quality_issue"])';

-- =====================================================
-- 5. CREATE TRIGGER FOR UPDATED_AT TIMESTAMP
-- =====================================================

CREATE OR REPLACE FUNCTION update_production_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_production_queue_updated_at
  BEFORE UPDATE ON production_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_production_queue_updated_at();

-- =====================================================
-- 6. CREATE FUNCTION TO CALCULATE PRIORITY SCORE
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_priority_score(
  p_order_type TEXT,
  p_choice_deadline TIMESTAMPTZ,
  p_created_at TIMESTAMPTZ
)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 50; -- Base score
  order_type_score INTEGER := 0;
  deadline_score INTEGER := 0;
  age_score INTEGER := 0;
  hours_until_deadline NUMERIC;
  days_since_creation NUMERIC;
BEGIN
  -- Order type score (40% weight)
  IF p_order_type = 'subscription_delivery' THEN
    order_type_score := 40; -- High priority for subscribers
  ELSE
    order_type_score := 20; -- Normal priority for standalone
  END IF;
  
  -- Deadline proximity score (40% weight)
  IF p_choice_deadline IS NOT NULL THEN
    hours_until_deadline := EXTRACT(EPOCH FROM (p_choice_deadline - now())) / 3600;
    
    IF hours_until_deadline < 0 THEN
      deadline_score := 40; -- Deadline passed - critical
    ELSIF hours_until_deadline < 24 THEN
      deadline_score := 40; -- Less than 24h - critical
    ELSIF hours_until_deadline < 48 THEN
      deadline_score := 30; -- Less than 48h - high
    ELSIF hours_until_deadline < 120 THEN
      deadline_score := 20; -- Less than 5 days - medium
    ELSE
      deadline_score := 10; -- More than 5 days - low
    END IF;
  ELSE
    deadline_score := 0; -- No deadline
  END IF;
  
  -- Age score (20% weight) - older orders get higher priority
  days_since_creation := EXTRACT(EPOCH FROM (now() - p_created_at)) / 86400;
  
  IF days_since_creation > 30 THEN
    age_score := 20;
  ELSIF days_since_creation > 14 THEN
    age_score := 15;
  ELSIF days_since_creation > 7 THEN
    age_score := 10;
  ELSE
    age_score := 5;
  END IF;
  
  -- Calculate total score
  score := order_type_score + deadline_score + age_score;
  
  -- Ensure score is between 0 and 100
  score := GREATEST(0, LEAST(100, score));
  
  RETURN score;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_priority_score IS 'Calculates priority score (0-100) based on order type (40%), deadline proximity (40%), and order age (20%)';

-- =====================================================
-- 7. CREATE TRIGGER TO AUTO-UPDATE PRIORITY SCORE
-- =====================================================

CREATE OR REPLACE FUNCTION update_production_queue_priority()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate priority score
  NEW.priority_score := calculate_priority_score(
    NEW.order_type,
    NEW.choice_deadline,
    NEW.created_at
  );
  
  -- Set priority level based on score
  IF NEW.priority_score >= 80 THEN
    NEW.priority := 'critical';
  ELSIF NEW.priority_score >= 60 THEN
    NEW.priority := 'high';
  ELSIF NEW.priority_score >= 30 THEN
    NEW.priority := 'normal';
  ELSE
    NEW.priority := 'low';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_production_queue_priority
  BEFORE INSERT OR UPDATE OF order_type, choice_deadline, created_at
  ON production_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_production_queue_priority();

-- =====================================================
-- 8. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE production_queue ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all production queue items
CREATE POLICY "Admins can view all production queue items"
  ON production_queue FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Admins can insert production queue items
CREATE POLICY "Admins can insert production queue items"
  ON production_queue FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Admins can update production queue items
CREATE POLICY "Admins can update production queue items"
  ON production_queue FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Admins can delete production queue items
CREATE POLICY "Admins can delete production queue items"
  ON production_queue FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Customers can view their own production queue items
CREATE POLICY "Customers can view their own production queue items"
  ON production_queue FOR SELECT
  USING (customer_id = auth.uid());

-- =====================================================
-- 9. GRANT PERMISSIONS
-- =====================================================

-- Grant SELECT to authenticated users (via RLS)
GRANT SELECT ON production_queue TO authenticated;

-- Grant INSERT, UPDATE, DELETE to authenticated users (via RLS)
GRANT INSERT, UPDATE, DELETE ON production_queue TO authenticated;

-- Grant all to service role
GRANT ALL ON production_queue TO service_role;

-- =====================================================
-- 10. VALIDATE MIGRATION
-- =====================================================

DO $$
BEGIN
  -- Check if table was created
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'production_queue'
  ) THEN
    RAISE EXCEPTION 'Table production_queue was not created';
  END IF;
  
  -- Check if indexes were created
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'production_queue' 
    AND indexname = 'idx_production_queue_order'
  ) THEN
    RAISE EXCEPTION 'Index idx_production_queue_order was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'production_queue' 
    AND indexname = 'idx_production_queue_priority'
  ) THEN
    RAISE EXCEPTION 'Index idx_production_queue_priority was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'production_queue' 
    AND indexname = 'idx_production_queue_choice_deadline'
  ) THEN
    RAISE EXCEPTION 'Index idx_production_queue_choice_deadline was not created';
  END IF;
  
  -- Check if triggers were created
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_validate_production_queue_order_reference'
  ) THEN
    RAISE EXCEPTION 'Trigger trigger_validate_production_queue_order_reference was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_update_production_queue_updated_at'
  ) THEN
    RAISE EXCEPTION 'Trigger trigger_update_production_queue_updated_at was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_update_production_queue_priority'
  ) THEN
    RAISE EXCEPTION 'Trigger trigger_update_production_queue_priority was not created';
  END IF;
  
  -- Check if RLS is enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'production_queue' 
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS is not enabled on production_queue table';
  END IF;
  
  RAISE NOTICE 'Migration 20260428000000_create_production_queue.sql completed successfully';
END $$;

-- =====================================================
-- 11. MIGRATION SUMMARY
-- =====================================================

SELECT 
  '20260428000000_create_production_queue.sql' AS migration_file,
  'Create production_queue table with priority scoring and RLS' AS description,
  'SUCCESS' AS status,
  NOW() AS executed_at,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'production_queue') AS table_created,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'production_queue') AS indexes_created,
  (SELECT COUNT(*) FROM pg_trigger WHERE tgname LIKE '%production_queue%') AS triggers_created,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'production_queue') AS policies_created;
