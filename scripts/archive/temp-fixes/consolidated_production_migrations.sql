-- MIGRATIONS DE PRODUÇÃO CONSOLIDADAS
-- Execute este arquivo no SQL Editor do Supabase

-- =====================================================
-- MIGRATION: 20260428000000_create_production_queue.sql
-- =====================================================

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
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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



-- =====================================================
-- MIGRATION: 20260428000001_create_character_choices.sql
-- =====================================================

-- =====================================================
-- MIGRATION: Create character_choices table
-- Date: 2026-04-28
-- Description: Creates character choices table for managing customer character selection workflow
-- Requirements: 2.2.1, 2.2.2, 2.2.3, 2.2.4, 2.2.5
-- =====================================================

-- =====================================================
-- 1. CREATE CHARACTER_CHOICES TABLE
-- =====================================================

CREATE TABLE character_choices (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Order reference (polymorphic - can be subscription_delivery or standalone_purchase)
  order_id UUID NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('subscription_delivery', 'standalone_purchase')),
  
  -- User reference
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Collection reference
  collection_id UUID NOT NULL REFERENCES collections(id),
  
  -- Character choice details
  character_id UUID REFERENCES collection_characters(id),
  character_name TEXT,
  character_image_url TEXT,
  
  -- Status & Workflow
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Customer hasn't chosen yet
    'submitted',    -- Customer submitted choice
    'approved',     -- Admin approved choice
    'rejected',     -- Admin rejected choice (out of stock, etc.)
    'locked'        -- Choice locked (production started)
  )),
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  approved_by_name TEXT,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Deadline Management
  deadline TIMESTAMPTZ NOT NULL,
  reminders_sent INTEGER NOT NULL DEFAULT 0,
  last_reminder_at TIMESTAMPTZ,
  
  -- Change History
  previous_choice_id UUID REFERENCES character_choices(id),
  change_reason TEXT,
  change_count INTEGER NOT NULL DEFAULT 0,
  
  -- Audit timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_deadline CHECK (
    status != 'pending' OR 
    deadline > created_at
  ),
  CONSTRAINT valid_submission CHECK (
    status = 'pending' OR 
    submitted_at IS NOT NULL
  ),
  CONSTRAINT valid_approval CHECK (
    status != 'approved' OR 
    (approved_at IS NOT NULL AND approved_by IS NOT NULL)
  ),
  CONSTRAINT valid_rejection CHECK (
    status != 'rejected' OR 
    (rejected_at IS NOT NULL AND rejection_reason IS NOT NULL)
  ),
  CONSTRAINT max_changes CHECK (
    change_count <= 3
  ),
  CONSTRAINT valid_character_choice CHECK (
    status = 'pending' OR 
    character_id IS NOT NULL
  ),
  CONSTRAINT unique_active_choice_per_order UNIQUE (order_id, order_type)
);

-- =====================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for order lookups (most common query)
CREATE INDEX idx_character_choices_order ON character_choices(order_id, order_type);

-- Index for user lookups
CREATE INDEX idx_character_choices_user ON character_choices(user_id);

-- Index for status filtering
CREATE INDEX idx_character_choices_status ON character_choices(status);

-- Index for deadline queries (critical for reminder jobs)
CREATE INDEX idx_character_choices_deadline ON character_choices(deadline) 
  WHERE status = 'pending' AND deadline IS NOT NULL;

-- Index for pending approvals (admin workflow)
CREATE INDEX idx_character_choices_pending_approval ON character_choices(submitted_at) 
  WHERE status = 'submitted';

-- Index for collection lookups
CREATE INDEX idx_character_choices_collection ON character_choices(collection_id);

-- Index for character lookups
CREATE INDEX idx_character_choices_character ON character_choices(character_id) 
  WHERE character_id IS NOT NULL;

-- Index for change history tracking
CREATE INDEX idx_character_choices_previous ON character_choices(previous_choice_id) 
  WHERE previous_choice_id IS NOT NULL;

-- =====================================================
-- 3. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE character_choices IS 'Tracks customer character selection workflow including submission, approval/rejection, and change history';

COMMENT ON COLUMN character_choices.order_id IS 'ID of the order (subscription_delivery or standalone_purchase)';
COMMENT ON COLUMN character_choices.order_type IS 'Type of order: subscription_delivery or standalone_purchase';
COMMENT ON COLUMN character_choices.user_id IS 'ID of the customer making the choice';
COMMENT ON COLUMN character_choices.collection_id IS 'ID of the collection the character belongs to';
COMMENT ON COLUMN character_choices.character_id IS 'ID of the chosen character (NULL if not yet chosen)';
COMMENT ON COLUMN character_choices.character_name IS 'Character name (denormalized for performance)';
COMMENT ON COLUMN character_choices.character_image_url IS 'Character image URL (denormalized for performance)';
COMMENT ON COLUMN character_choices.status IS 'Current status of the choice workflow';
COMMENT ON COLUMN character_choices.submitted_at IS 'Timestamp when customer submitted their choice';
COMMENT ON COLUMN character_choices.approved_at IS 'Timestamp when admin approved the choice';
COMMENT ON COLUMN character_choices.approved_by IS 'ID of admin who approved the choice';
COMMENT ON COLUMN character_choices.approved_by_name IS 'Name of admin who approved (denormalized for performance)';
COMMENT ON COLUMN character_choices.rejected_at IS 'Timestamp when admin rejected the choice';
COMMENT ON COLUMN character_choices.rejection_reason IS 'Reason for rejection (e.g., out of stock)';
COMMENT ON COLUMN character_choices.deadline IS 'Deadline for customer to make their choice';
COMMENT ON COLUMN character_choices.reminders_sent IS 'Count of reminder emails sent to customer';
COMMENT ON COLUMN character_choices.last_reminder_at IS 'Timestamp of last reminder sent';
COMMENT ON COLUMN character_choices.previous_choice_id IS 'ID of previous choice if customer changed their mind';
COMMENT ON COLUMN character_choices.change_reason IS 'Reason provided by customer for changing their choice';
COMMENT ON COLUMN character_choices.change_count IS 'Number of times customer has changed their choice (max 3)';

-- =====================================================
-- 4. CREATE TRIGGER FOR UPDATED_AT TIMESTAMP
-- =====================================================

CREATE OR REPLACE FUNCTION update_character_choices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_character_choices_updated_at
  BEFORE UPDATE ON character_choices
  FOR EACH ROW
  EXECUTE FUNCTION update_character_choices_updated_at();

-- =====================================================
-- 5. CREATE FUNCTION TO VALIDATE ORDER REFERENCE
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
  ELSE
    RAISE EXCEPTION 'Invalid order_type: %', NEW.order_type;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_character_choice_order_reference
  BEFORE INSERT OR UPDATE OF order_id, order_type ON character_choices
  FOR EACH ROW
  EXECUTE FUNCTION validate_character_choice_order_reference();

-- =====================================================
-- 6. CREATE FUNCTION TO VALIDATE STATUS TRANSITIONS
-- =====================================================

CREATE OR REPLACE FUNCTION validate_character_choice_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow any status on INSERT
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;
  
  -- Validate status transitions on UPDATE
  IF OLD.status != NEW.status THEN
    -- pending -> submitted (customer submits choice)
    IF OLD.status = 'pending' AND NEW.status = 'submitted' THEN
      IF NEW.character_id IS NULL THEN
        RAISE EXCEPTION 'Cannot submit choice without selecting a character';
      END IF;
      IF NEW.submitted_at IS NULL THEN
        NEW.submitted_at := now();
      END IF;
    
    -- submitted -> approved (admin approves)
    ELSIF OLD.status = 'submitted' AND NEW.status = 'approved' THEN
      IF NEW.approved_at IS NULL THEN
        NEW.approved_at := now();
      END IF;
      IF NEW.approved_by IS NULL THEN
        RAISE EXCEPTION 'approved_by must be set when approving a choice';
      END IF;
    
    -- submitted -> rejected (admin rejects)
    ELSIF OLD.status = 'submitted' AND NEW.status = 'rejected' THEN
      IF NEW.rejected_at IS NULL THEN
        NEW.rejected_at := now();
      END IF;
      IF NEW.rejection_reason IS NULL OR NEW.rejection_reason = '' THEN
        RAISE EXCEPTION 'rejection_reason must be provided when rejecting a choice';
      END IF;
    
    -- approved -> locked (production starts)
    ELSIF OLD.status = 'approved' AND NEW.status = 'locked' THEN
      -- Valid transition, no additional checks needed
      NULL;
    
    -- rejected -> pending (customer can try again)
    ELSIF OLD.status = 'rejected' AND NEW.status = 'pending' THEN
      -- Valid transition, no additional checks needed
      NULL;
    
    -- Invalid transition
    ELSE
      RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_character_choice_status_transition
  BEFORE INSERT OR UPDATE ON character_choices
  FOR EACH ROW
  EXECUTE FUNCTION validate_character_choice_status_transition();

-- =====================================================
-- 7. CREATE FUNCTION TO SYNC WITH PRODUCTION QUEUE
-- =====================================================

CREATE OR REPLACE FUNCTION sync_character_choice_to_production_queue()
RETURNS TRIGGER AS $$
BEGIN
  -- Update production_queue when choice is approved
  IF NEW.status = 'approved' AND (OLD IS NULL OR OLD.status != 'approved') THEN
    UPDATE production_queue
    SET 
      character_id = NEW.character_id,
      character_name = NEW.character_name,
      choice_status = 'approved',
      choice_made_at = NEW.submitted_at,
      production_status = CASE 
        WHEN production_status = 'awaiting_choice' THEN 'ready_for_production'
        ELSE production_status
      END,
      current_stage = CASE 
        WHEN current_stage = 'awaiting_choice' THEN 'design'
        ELSE current_stage
      END
    WHERE order_id = NEW.order_id 
      AND order_type = NEW.order_type;
  END IF;
  
  -- Update production_queue when choice is locked
  IF NEW.status = 'locked' AND (OLD IS NULL OR OLD.status != 'locked') THEN
    UPDATE production_queue
    SET choice_status = 'locked'
    WHERE order_id = NEW.order_id 
      AND order_type = NEW.order_type;
  END IF;
  
  -- Update production_queue when choice is submitted
  IF NEW.status = 'submitted' AND (OLD IS NULL OR OLD.status != 'submitted') THEN
    UPDATE production_queue
    SET 
      choice_status = 'submitted',
      choice_made_at = NEW.submitted_at
    WHERE order_id = NEW.order_id 
      AND order_type = NEW.order_type;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_character_choice_to_production_queue
  AFTER INSERT OR UPDATE ON character_choices
  FOR EACH ROW
  EXECUTE FUNCTION sync_character_choice_to_production_queue();

-- =====================================================
-- 8. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE character_choices ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all character choices
CREATE POLICY "Admins can view all character choices"
  ON character_choices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Admins can insert character choices
CREATE POLICY "Admins can insert character choices"
  ON character_choices FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Admins can update character choices
CREATE POLICY "Admins can update character choices"
  ON character_choices FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Admins can delete character choices
CREATE POLICY "Admins can delete character choices"
  ON character_choices FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Customers can view their own character choices
CREATE POLICY "Customers can view their own character choices"
  ON character_choices FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Customers can insert their own character choices
CREATE POLICY "Customers can insert their own character choices"
  ON character_choices FOR INSERT
  WITH CHECK (
    user_id = auth.uid() 
    AND status = 'pending'
  );

-- Policy: Customers can update their own pending or rejected choices
CREATE POLICY "Customers can update their own pending or rejected choices"
  ON character_choices FOR UPDATE
  USING (
    user_id = auth.uid() 
    AND status IN ('pending', 'rejected')
  )
  WITH CHECK (
    user_id = auth.uid()
    AND change_count <= 3
  );

-- =====================================================
-- 9. GRANT PERMISSIONS
-- =====================================================

-- Grant SELECT to authenticated users (via RLS)
GRANT SELECT ON character_choices TO authenticated;

-- Grant INSERT, UPDATE, DELETE to authenticated users (via RLS)
GRANT INSERT, UPDATE, DELETE ON character_choices TO authenticated;

-- Grant all to service role
GRANT ALL ON character_choices TO service_role;

-- =====================================================
-- 10. VALIDATE MIGRATION
-- =====================================================

DO $$
BEGIN
  -- Check if table was created
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'character_choices'
  ) THEN
    RAISE EXCEPTION 'Table character_choices was not created';
  END IF;
  
  -- Check if indexes were created
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'character_choices' 
    AND indexname = 'idx_character_choices_order'
  ) THEN
    RAISE EXCEPTION 'Index idx_character_choices_order was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'character_choices' 
    AND indexname = 'idx_character_choices_deadline'
  ) THEN
    RAISE EXCEPTION 'Index idx_character_choices_deadline was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'character_choices' 
    AND indexname = 'idx_character_choices_pending_approval'
  ) THEN
    RAISE EXCEPTION 'Index idx_character_choices_pending_approval was not created';
  END IF;
  
  -- Check if triggers were created
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_update_character_choices_updated_at'
  ) THEN
    RAISE EXCEPTION 'Trigger trigger_update_character_choices_updated_at was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_validate_character_choice_order_reference'
  ) THEN
    RAISE EXCEPTION 'Trigger trigger_validate_character_choice_order_reference was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_validate_character_choice_status_transition'
  ) THEN
    RAISE EXCEPTION 'Trigger trigger_validate_character_choice_status_transition was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_sync_character_choice_to_production_queue'
  ) THEN
    RAISE EXCEPTION 'Trigger trigger_sync_character_choice_to_production_queue was not created';
  END IF;
  
  -- Check if RLS is enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'character_choices' 
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS is not enabled on character_choices table';
  END IF;
  
  RAISE NOTICE 'Migration 20260428000001_create_character_choices.sql completed successfully';
END $$;

-- =====================================================
-- 11. MIGRATION SUMMARY
-- =====================================================

SELECT 
  '20260428000001_create_character_choices.sql' AS migration_file,
  'Create character_choices table with workflow validation and RLS' AS description,
  'SUCCESS' AS status,
  NOW() AS executed_at,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'character_choices') AS table_created,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'character_choices') AS indexes_created,
  (SELECT COUNT(*) FROM pg_trigger WHERE tgname LIKE '%character_choices%') AS triggers_created,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'character_choices') AS policies_created;



-- =====================================================
-- MIGRATION: 20260428000002_create_production_stages.sql
-- =====================================================

-- =====================================================
-- MIGRATION: Create production_stages table
-- Date: 2026-04-28
-- Description: Creates production stages table for tracking detailed production stage history
-- Requirements: 2.3.1, 2.3.2, 2.3.3, 2.3.4, 2.3.5
-- =====================================================

-- =====================================================
-- 1. CREATE PRODUCTION_STAGES TABLE
-- =====================================================

CREATE TABLE production_stages (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Production queue reference
  production_queue_id UUID NOT NULL REFERENCES production_queue(id) ON DELETE CASCADE,
  
  -- Stage details
  stage_name TEXT NOT NULL CHECK (stage_name IN (
    'awaiting_choice',
    'design',
    'production',
    'quality_check',
    'packaging',
    'shipped'
  )),
  stage_order INTEGER NOT NULL CHECK (stage_order BETWEEN 1 AND 6),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'in_progress',
    'completed',
    'blocked'
  )),
  
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_duration INTEGER NOT NULL DEFAULT 24, -- hours
  actual_duration INTEGER, -- hours (calculated)
  
  -- Assignment
  assigned_to UUID REFERENCES auth.users(id),
  assigned_to_name TEXT,
  assigned_at TIMESTAMPTZ,
  
  -- Documentation
  notes TEXT,
  photos TEXT[] DEFAULT '{}', -- Array of storage URLs
  
  -- Blocking issues
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  block_reason TEXT,
  blocked_at TIMESTAMPTZ,
  unblocked_at TIMESTAMPTZ,
  
  -- Audit timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_stage_dates CHECK (
    started_at IS NULL OR 
    completed_at IS NULL OR 
    started_at <= completed_at
  ),
  CONSTRAINT valid_block_reason CHECK (
    NOT is_blocked OR 
    (block_reason IS NOT NULL AND block_reason != '')
  ),
  CONSTRAINT valid_blocked_at CHECK (
    NOT is_blocked OR 
    blocked_at IS NOT NULL
  ),
  CONSTRAINT valid_completion CHECK (
    status != 'completed' OR 
    completed_at IS NOT NULL
  ),
  CONSTRAINT unique_stage_per_queue UNIQUE (production_queue_id, stage_order)
);

-- =====================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for production queue lookups (most common query)
CREATE INDEX idx_production_stages_queue ON production_stages(production_queue_id);

-- Index for status filtering
CREATE INDEX idx_production_stages_status ON production_stages(status);

-- Index for blocked items queries
CREATE INDEX idx_production_stages_blocked ON production_stages(is_blocked, blocked_at) 
  WHERE is_blocked = true;

-- Index for assignment queries
CREATE INDEX idx_production_stages_assigned ON production_stages(assigned_to) 
  WHERE assigned_to IS NOT NULL;

-- Composite index for queue and stage order (for sequential stage queries)
CREATE INDEX idx_production_stages_queue_order ON production_stages(production_queue_id, stage_order);

-- Index for in-progress stages
CREATE INDEX idx_production_stages_in_progress ON production_stages(started_at) 
  WHERE status = 'in_progress' AND completed_at IS NULL;

-- =====================================================
-- 3. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE production_stages IS 'Tracks detailed history of each production stage for every production queue item';

COMMENT ON COLUMN production_stages.production_queue_id IS 'ID of the production queue item this stage belongs to';
COMMENT ON COLUMN production_stages.stage_name IS 'Name of the production stage';
COMMENT ON COLUMN production_stages.stage_order IS 'Sequential order of the stage (1-6)';
COMMENT ON COLUMN production_stages.status IS 'Current status of the stage (pending/in_progress/completed/blocked)';
COMMENT ON COLUMN production_stages.started_at IS 'Timestamp when stage was started';
COMMENT ON COLUMN production_stages.completed_at IS 'Timestamp when stage was completed';
COMMENT ON COLUMN production_stages.estimated_duration IS 'Estimated duration for this stage in hours';
COMMENT ON COLUMN production_stages.actual_duration IS 'Actual duration in hours (auto-calculated from started_at and completed_at)';
COMMENT ON COLUMN production_stages.assigned_to IS 'ID of team member assigned to this stage';
COMMENT ON COLUMN production_stages.assigned_to_name IS 'Name of assigned team member (denormalized for performance)';
COMMENT ON COLUMN production_stages.assigned_at IS 'Timestamp when stage was assigned';
COMMENT ON COLUMN production_stages.notes IS 'Notes about this stage (e.g., issues encountered, special instructions)';
COMMENT ON COLUMN production_stages.photos IS 'Array of photo URLs from Supabase Storage';
COMMENT ON COLUMN production_stages.is_blocked IS 'Whether this stage is currently blocked';
COMMENT ON COLUMN production_stages.block_reason IS 'Reason why stage is blocked (required if is_blocked = true)';
COMMENT ON COLUMN production_stages.blocked_at IS 'Timestamp when stage was blocked';
COMMENT ON COLUMN production_stages.unblocked_at IS 'Timestamp when stage was unblocked';

-- =====================================================
-- 4. CREATE TRIGGER FOR UPDATED_AT TIMESTAMP
-- =====================================================

CREATE OR REPLACE FUNCTION update_production_stages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_production_stages_updated_at
  BEFORE UPDATE ON production_stages
  FOR EACH ROW
  EXECUTE FUNCTION update_production_stages_updated_at();

-- =====================================================
-- 5. CREATE FUNCTION TO CALCULATE ACTUAL DURATION
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_stage_actual_duration()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate actual duration when stage is completed
  IF NEW.completed_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
    NEW.actual_duration := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) / 3600;
  ELSE
    NEW.actual_duration := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_stage_actual_duration
  BEFORE INSERT OR UPDATE OF started_at, completed_at
  ON production_stages
  FOR EACH ROW
  EXECUTE FUNCTION calculate_stage_actual_duration();

-- =====================================================
-- 6. CREATE FUNCTION TO SYNC STAGE STATUS TO PRODUCTION QUEUE
-- =====================================================

CREATE OR REPLACE FUNCTION sync_production_stage_to_queue()
RETURNS TRIGGER AS $$
DECLARE
  v_stage_name TEXT;
  v_all_completed BOOLEAN;
BEGIN
  -- Get the stage name
  v_stage_name := NEW.stage_name;
  
  -- When a stage is completed, update production_queue current_stage
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    -- Check if this is the last stage
    IF v_stage_name = 'shipped' THEN
      UPDATE production_queue
      SET 
        current_stage = 'shipped',
        production_status = 'completed',
        production_completed_at = NEW.completed_at
      WHERE id = NEW.production_queue_id;
    ELSE
      -- Move to next stage
      UPDATE production_queue
      SET current_stage = CASE v_stage_name
        WHEN 'awaiting_choice' THEN 'design'
        WHEN 'design' THEN 'production'
        WHEN 'production' THEN 'quality_check'
        WHEN 'quality_check' THEN 'packaging'
        WHEN 'packaging' THEN 'shipped'
        ELSE current_stage
      END
      WHERE id = NEW.production_queue_id;
    END IF;
  END IF;
  
  -- When a stage is blocked, update production_queue status
  IF NEW.is_blocked = true AND (OLD IS NULL OR OLD.is_blocked = false) THEN
    UPDATE production_queue
    SET production_status = 'on_hold'
    WHERE id = NEW.production_queue_id;
  END IF;
  
  -- When a stage is unblocked, update production_queue status
  IF NEW.is_blocked = false AND OLD IS NOT NULL AND OLD.is_blocked = true THEN
    -- Check if all stages are completed
    SELECT NOT EXISTS (
      SELECT 1 FROM production_stages
      WHERE production_queue_id = NEW.production_queue_id
        AND status != 'completed'
        AND id != NEW.id
    ) INTO v_all_completed;
    
    IF v_all_completed THEN
      UPDATE production_queue
      SET production_status = 'completed'
      WHERE id = NEW.production_queue_id;
    ELSE
      UPDATE production_queue
      SET production_status = 'in_production'
      WHERE id = NEW.production_queue_id;
    END IF;
  END IF;
  
  -- When first stage starts, update production_started_at
  IF NEW.status = 'in_progress' AND NEW.started_at IS NOT NULL AND (OLD IS NULL OR OLD.status != 'in_progress') THEN
    UPDATE production_queue
    SET 
      production_started_at = COALESCE(production_started_at, NEW.started_at),
      production_status = CASE 
        WHEN production_status = 'ready_for_production' THEN 'in_production'
        ELSE production_status
      END
    WHERE id = NEW.production_queue_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_production_stage_to_queue
  AFTER INSERT OR UPDATE ON production_stages
  FOR EACH ROW
  EXECUTE FUNCTION sync_production_stage_to_queue();

-- =====================================================
-- 7. CREATE FUNCTION TO INITIALIZE STAGES FOR NEW PRODUCTION QUEUE ITEMS
-- =====================================================

CREATE OR REPLACE FUNCTION initialize_production_stages()
RETURNS TRIGGER AS $$
BEGIN
  -- Create all 6 stages for the new production queue item
  INSERT INTO production_stages (
    production_queue_id,
    stage_name,
    stage_order,
    status,
    estimated_duration
  ) VALUES
    (NEW.id, 'awaiting_choice', 1, 'pending', 168), -- 7 days
    (NEW.id, 'design', 2, 'pending', 48),           -- 2 days
    (NEW.id, 'production', 3, 'pending', 120),      -- 5 days
    (NEW.id, 'quality_check', 4, 'pending', 24),    -- 1 day
    (NEW.id, 'packaging', 5, 'pending', 12),        -- 12 hours
    (NEW.id, 'shipped', 6, 'pending', 0);           -- 0 hours (instant)
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_initialize_production_stages
  AFTER INSERT ON production_queue
  FOR EACH ROW
  EXECUTE FUNCTION initialize_production_stages();

-- =====================================================
-- 8. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE production_stages ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all production stages
CREATE POLICY "Admins can view all production stages"
  ON production_stages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Admins can insert production stages
CREATE POLICY "Admins can insert production stages"
  ON production_stages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Admins can update production stages
CREATE POLICY "Admins can update production stages"
  ON production_stages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Admins can delete production stages
CREATE POLICY "Admins can delete production stages"
  ON production_stages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Customers can view stages for their own orders
CREATE POLICY "Customers can view their own production stages"
  ON production_stages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM production_queue
      WHERE production_queue.id = production_stages.production_queue_id
      AND production_queue.customer_id = auth.uid()
    )
  );

-- =====================================================
-- 9. GRANT PERMISSIONS
-- =====================================================

-- Grant SELECT to authenticated users (via RLS)
GRANT SELECT ON production_stages TO authenticated;

-- Grant INSERT, UPDATE, DELETE to authenticated users (via RLS)
GRANT INSERT, UPDATE, DELETE ON production_stages TO authenticated;

-- Grant all to service role
GRANT ALL ON production_stages TO service_role;

-- =====================================================
-- 10. VALIDATE MIGRATION
-- =====================================================

DO $$
BEGIN
  -- Check if table was created
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'production_stages'
  ) THEN
    RAISE EXCEPTION 'Table production_stages was not created';
  END IF;
  
  -- Check if indexes were created
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'production_stages' 
    AND indexname = 'idx_production_stages_queue'
  ) THEN
    RAISE EXCEPTION 'Index idx_production_stages_queue was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'production_stages' 
    AND indexname = 'idx_production_stages_status'
  ) THEN
    RAISE EXCEPTION 'Index idx_production_stages_status was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'production_stages' 
    AND indexname = 'idx_production_stages_queue_order'
  ) THEN
    RAISE EXCEPTION 'Index idx_production_stages_queue_order was not created';
  END IF;
  
  -- Check if triggers were created
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_update_production_stages_updated_at'
  ) THEN
    RAISE EXCEPTION 'Trigger trigger_update_production_stages_updated_at was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_calculate_stage_actual_duration'
  ) THEN
    RAISE EXCEPTION 'Trigger trigger_calculate_stage_actual_duration was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_sync_production_stage_to_queue'
  ) THEN
    RAISE EXCEPTION 'Trigger trigger_sync_production_stage_to_queue was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_initialize_production_stages'
  ) THEN
    RAISE EXCEPTION 'Trigger trigger_initialize_production_stages was not created';
  END IF;
  
  -- Check if RLS is enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'production_stages' 
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS is not enabled on production_stages table';
  END IF;
  
  RAISE NOTICE 'Migration 20260428000002_create_production_stages.sql completed successfully';
END $$;

-- =====================================================
-- 11. MIGRATION SUMMARY
-- =====================================================

SELECT 
  '20260428000002_create_production_stages.sql' AS migration_file,
  'Create production_stages table with stage tracking and auto-initialization' AS description,
  'SUCCESS' AS status,
  NOW() AS executed_at,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'production_stages') AS table_created,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'production_stages') AS indexes_created,
  (SELECT COUNT(*) FROM pg_trigger WHERE tgname LIKE '%production_stages%') AS triggers_created,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'production_stages') AS policies_created;



-- =====================================================
-- MIGRATION: 20260428000003_create_production_views.sql
-- =====================================================

-- =====================================================
-- MIGRATION: Create production views for optimized queries
-- Date: 2026-04-28
-- Description: Creates database views for optimized production dashboard queries
-- Requirements: 2.1, 2.2, 2.3
-- =====================================================

-- =====================================================
-- 1. CREATE PRODUCTION_QUEUE_WITH_DETAILS VIEW
-- =====================================================
-- This view joins production_queue with customer, collection, and character data
-- for optimized dashboard queries without multiple joins

CREATE OR REPLACE VIEW production_queue_with_details AS
SELECT 
  -- Production queue fields
  pq.id,
  pq.order_id,
  pq.order_type,
  pq.customer_id,
  pq.customer_name,
  pq.customer_email,
  pq.collection_id,
  pq.collection_name,
  pq.character_id,
  pq.character_name,
  pq.production_status,
  pq.current_stage,
  pq.choice_status,
  pq.choice_deadline,
  pq.choice_made_at,
  pq.priority,
  pq.priority_score,
  pq.scheduled_production_date,
  pq.estimated_completion_date,
  pq.assigned_to,
  pq.assigned_to_name,
  pq.assigned_at,
  pq.production_started_at,
  pq.production_completed_at,
  pq.production_notes,
  pq.customer_notes,
  pq.internal_flags,
  pq.created_at,
  pq.updated_at,
  
  -- Customer profile data
  p.full_name AS customer_full_name,
  p.phone AS customer_phone,
  
  -- Collection data
  c.name AS collection_display_name,
  c.description AS collection_description,
  c.image_url AS collection_image_url,
  c.is_active AS collection_is_active,
  
  -- Character data (if chosen)
  cc.name AS character_display_name,
  cc.description AS character_description,
  cc.image_url AS character_image_url,
  cc.is_available AS character_is_available,
  
  -- Calculated fields
  CASE 
    WHEN pq.choice_deadline IS NOT NULL AND pq.choice_status = 'pending' THEN
      EXTRACT(EPOCH FROM (pq.choice_deadline - now())) / 3600
    ELSE NULL
  END AS hours_until_deadline,
  
  CASE 
    WHEN pq.production_started_at IS NOT NULL AND pq.production_completed_at IS NULL THEN
      EXTRACT(EPOCH FROM (now() - pq.production_started_at)) / 3600
    ELSE NULL
  END AS hours_in_production,
  
  CASE 
    WHEN pq.production_started_at IS NOT NULL AND pq.production_completed_at IS NOT NULL THEN
      EXTRACT(EPOCH FROM (pq.production_completed_at - pq.production_started_at)) / 3600
    ELSE NULL
  END AS total_production_hours

FROM production_queue pq
LEFT JOIN profiles p ON pq.customer_id = p.id
LEFT JOIN collections c ON pq.collection_id = c.id
LEFT JOIN collection_characters cc ON pq.character_id = cc.id;

COMMENT ON VIEW production_queue_with_details IS 
  'Optimized view joining production_queue with customer, collection, and character data for dashboard queries';

-- =====================================================
-- 2. CREATE PENDING_CHOICES_WITH_COUNTDOWN VIEW
-- =====================================================
-- This view shows all pending character choices with calculated time remaining
-- and urgency indicators for the choice management interface

CREATE OR REPLACE VIEW pending_choices_with_countdown AS
SELECT 
  -- Character choice fields
  ch.id,
  ch.order_id,
  ch.order_type,
  ch.user_id,
  ch.collection_id,
  ch.character_id,
  ch.character_name,
  ch.character_image_url,
  ch.status,
  ch.submitted_at,
  ch.approved_at,
  ch.approved_by,
  ch.approved_by_name,
  ch.rejected_at,
  ch.rejection_reason,
  ch.deadline,
  ch.reminders_sent,
  ch.last_reminder_at,
  ch.previous_choice_id,
  ch.change_reason,
  ch.change_count,
  ch.created_at,
  ch.updated_at,
  
  -- Production queue data
  pq.customer_name,
  pq.customer_email,
  pq.collection_name,
  pq.priority,
  pq.priority_score,
  
  -- Customer profile data
  p.full_name AS customer_full_name,
  p.phone AS customer_phone,
  
  -- Collection data
  c.name AS collection_display_name,
  c.image_url AS collection_image_url,
  
  -- Calculated countdown fields
  EXTRACT(EPOCH FROM (ch.deadline - now())) / 3600 AS hours_until_deadline,
  EXTRACT(EPOCH FROM (ch.deadline - now())) / 86400 AS days_until_deadline,
  
  -- Urgency indicator
  CASE 
    WHEN ch.deadline < now() THEN 'expired'
    WHEN EXTRACT(EPOCH FROM (ch.deadline - now())) / 3600 < 24 THEN 'critical'
    WHEN EXTRACT(EPOCH FROM (ch.deadline - now())) / 3600 < 48 THEN 'urgent'
    WHEN EXTRACT(EPOCH FROM (ch.deadline - now())) / 3600 < 120 THEN 'warning'
    ELSE 'normal'
  END AS urgency_level,
  
  -- Reminder status
  CASE 
    WHEN ch.reminders_sent = 0 THEN 'no_reminders'
    WHEN ch.reminders_sent = 1 THEN 'first_reminder_sent'
    WHEN ch.reminders_sent = 2 THEN 'second_reminder_sent'
    WHEN ch.reminders_sent >= 3 THEN 'final_reminder_sent'
    ELSE 'unknown'
  END AS reminder_status,
  
  -- Next reminder due
  CASE 
    WHEN ch.reminders_sent = 0 AND EXTRACT(EPOCH FROM (ch.deadline - now())) / 3600 <= 120 THEN true
    WHEN ch.reminders_sent = 1 AND EXTRACT(EPOCH FROM (ch.deadline - now())) / 3600 <= 48 THEN true
    WHEN ch.reminders_sent = 2 AND EXTRACT(EPOCH FROM (ch.deadline - now())) / 3600 <= 24 THEN true
    ELSE false
  END AS reminder_due

FROM character_choices ch
LEFT JOIN production_queue pq ON ch.order_id = pq.order_id AND ch.order_type = pq.order_type
LEFT JOIN profiles p ON ch.user_id = p.id
LEFT JOIN collections c ON ch.collection_id = c.id
WHERE ch.status IN ('pending', 'submitted');

COMMENT ON VIEW pending_choices_with_countdown IS 
  'Shows pending character choices with calculated countdown, urgency levels, and reminder status';

-- =====================================================
-- 3. CREATE PRODUCTION_METRICS VIEW
-- =====================================================
-- This view aggregates production stage durations and provides metrics
-- for dashboard analytics and performance monitoring

CREATE OR REPLACE VIEW production_metrics AS
SELECT 
  -- Stage metrics
  ps.stage_name,
  ps.stage_order,
  
  -- Count metrics
  COUNT(*) AS total_stages,
  COUNT(*) FILTER (WHERE ps.status = 'pending') AS pending_count,
  COUNT(*) FILTER (WHERE ps.status = 'in_progress') AS in_progress_count,
  COUNT(*) FILTER (WHERE ps.status = 'completed') AS completed_count,
  COUNT(*) FILTER (WHERE ps.status = 'blocked') AS blocked_count,
  
  -- Duration metrics (in hours)
  AVG(ps.actual_duration) FILTER (WHERE ps.status = 'completed') AS avg_duration_hours,
  MIN(ps.actual_duration) FILTER (WHERE ps.status = 'completed') AS min_duration_hours,
  MAX(ps.actual_duration) FILTER (WHERE ps.status = 'completed') AS max_duration_hours,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ps.actual_duration) FILTER (WHERE ps.status = 'completed') AS median_duration_hours,
  PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY ps.actual_duration) FILTER (WHERE ps.status = 'completed') AS p90_duration_hours,
  
  -- Estimated vs actual
  AVG(ps.estimated_duration) AS avg_estimated_hours,
  AVG(ps.actual_duration - ps.estimated_duration) FILTER (WHERE ps.status = 'completed') AS avg_variance_hours,
  
  -- Performance indicators
  COUNT(*) FILTER (
    WHERE ps.status = 'completed' 
    AND ps.actual_duration > ps.estimated_duration * 1.5
  ) AS exceeded_estimate_count,
  
  COUNT(*) FILTER (
    WHERE ps.status = 'in_progress' 
    AND ps.started_at IS NOT NULL
    AND EXTRACT(EPOCH FROM (now() - ps.started_at)) / 3600 > ps.estimated_duration * 1.5
  ) AS overdue_in_progress_count,
  
  -- Blocking metrics
  COUNT(*) FILTER (WHERE ps.is_blocked = true) AS currently_blocked_count,
  AVG(EXTRACT(EPOCH FROM (COALESCE(ps.unblocked_at, now()) - ps.blocked_at)) / 3600) 
    FILTER (WHERE ps.blocked_at IS NOT NULL) AS avg_blocked_duration_hours,
  
  -- Assignment metrics
  COUNT(DISTINCT ps.assigned_to) FILTER (WHERE ps.assigned_to IS NOT NULL) AS unique_assignees,
  AVG(EXTRACT(EPOCH FROM (COALESCE(ps.started_at, now()) - ps.assigned_at)) / 3600)
    FILTER (WHERE ps.assigned_at IS NOT NULL) AS avg_time_to_start_hours,
  
  -- Timestamps
  MIN(ps.created_at) AS first_stage_created,
  MAX(ps.updated_at) AS last_stage_updated

FROM production_stages ps
GROUP BY ps.stage_name, ps.stage_order
ORDER BY ps.stage_order;

COMMENT ON VIEW production_metrics IS 
  'Aggregates production stage durations and performance metrics for dashboard analytics';

-- =====================================================
-- 4. CREATE ADDITIONAL HELPER VIEW: URGENT_ITEMS
-- =====================================================
-- This view identifies items requiring immediate attention

CREATE OR REPLACE VIEW urgent_production_items AS
SELECT 
  pq.id,
  pq.order_id,
  pq.order_type,
  pq.customer_name,
  pq.customer_email,
  pq.collection_name,
  pq.character_name,
  pq.current_stage,
  pq.production_status,
  pq.priority,
  pq.priority_score,
  pq.choice_deadline,
  pq.choice_status,
  
  -- Urgency reasons (array of reasons why this item is urgent)
  ARRAY_REMOVE(ARRAY[
    CASE WHEN pq.choice_deadline IS NOT NULL 
         AND pq.choice_status = 'pending' 
         AND EXTRACT(EPOCH FROM (pq.choice_deadline - now())) / 3600 < 24 
    THEN 'choice_deadline_critical' END,
    
    CASE WHEN pq.choice_deadline IS NOT NULL 
         AND pq.choice_status = 'pending' 
         AND EXTRACT(EPOCH FROM (pq.choice_deadline - now())) / 3600 < 48 
    THEN 'choice_deadline_urgent' END,
    
    CASE WHEN pq.production_status = 'on_hold' 
    THEN 'production_blocked' END,
    
    CASE WHEN pq.production_started_at IS NOT NULL 
         AND pq.production_completed_at IS NULL
         AND EXTRACT(EPOCH FROM (now() - pq.production_started_at)) / 3600 > 240 
    THEN 'production_overdue' END,
    
    CASE WHEN pq.priority = 'critical' 
    THEN 'critical_priority' END,
    
    CASE WHEN EXISTS (
      SELECT 1 FROM production_stages ps 
      WHERE ps.production_queue_id = pq.id 
      AND ps.is_blocked = true
    ) THEN 'stage_blocked' END
  ], NULL) AS urgency_reasons,
  
  -- Urgency score (higher = more urgent)
  (
    CASE WHEN pq.choice_deadline IS NOT NULL 
         AND pq.choice_status = 'pending' 
         AND EXTRACT(EPOCH FROM (pq.choice_deadline - now())) / 3600 < 24 
    THEN 50 ELSE 0 END +
    
    CASE WHEN pq.choice_deadline IS NOT NULL 
         AND pq.choice_status = 'pending' 
         AND EXTRACT(EPOCH FROM (pq.choice_deadline - now())) / 3600 < 48 
    THEN 30 ELSE 0 END +
    
    CASE WHEN pq.production_status = 'on_hold' 
    THEN 40 ELSE 0 END +
    
    CASE WHEN pq.production_started_at IS NOT NULL 
         AND pq.production_completed_at IS NULL
         AND EXTRACT(EPOCH FROM (now() - pq.production_started_at)) / 3600 > 240 
    THEN 35 ELSE 0 END +
    
    CASE WHEN pq.priority = 'critical' 
    THEN 25 ELSE 0 END +
    
    CASE WHEN EXISTS (
      SELECT 1 FROM production_stages ps 
      WHERE ps.production_queue_id = pq.id 
      AND ps.is_blocked = true
    ) THEN 30 ELSE 0 END
  ) AS urgency_score,
  
  pq.created_at,
  pq.updated_at

FROM production_queue pq
WHERE 
  -- Choice deadline critical (< 24h)
  (pq.choice_deadline IS NOT NULL 
   AND pq.choice_status = 'pending' 
   AND EXTRACT(EPOCH FROM (pq.choice_deadline - now())) / 3600 < 24)
  OR
  -- Choice deadline urgent (< 48h)
  (pq.choice_deadline IS NOT NULL 
   AND pq.choice_status = 'pending' 
   AND EXTRACT(EPOCH FROM (pq.choice_deadline - now())) / 3600 < 48)
  OR
  -- Production blocked
  pq.production_status = 'on_hold'
  OR
  -- Production overdue (> 10 days in production)
  (pq.production_started_at IS NOT NULL 
   AND pq.production_completed_at IS NULL
   AND EXTRACT(EPOCH FROM (now() - pq.production_started_at)) / 3600 > 240)
  OR
  -- Critical priority
  pq.priority = 'critical'
  OR
  -- Has blocked stages
  EXISTS (
    SELECT 1 FROM production_stages ps 
    WHERE ps.production_queue_id = pq.id 
    AND ps.is_blocked = true
  )
ORDER BY urgency_score DESC, pq.priority_score DESC;

COMMENT ON VIEW urgent_production_items IS 
  'Identifies production items requiring immediate attention with urgency scoring';

-- =====================================================
-- 5. CREATE INDEXES ON VIEWS FOR PERFORMANCE
-- =====================================================
-- Note: PostgreSQL doesn't support indexes directly on views,
-- but we can create indexes on the underlying tables that will
-- benefit the view queries. These were already created in previous
-- migrations, but we document them here for reference.

-- The following indexes on base tables optimize view performance:
-- - idx_production_queue_status (for production_queue_with_details)
-- - idx_production_queue_priority (for production_queue_with_details)
-- - idx_character_choices_deadline (for pending_choices_with_countdown)
-- - idx_character_choices_status (for pending_choices_with_countdown)
-- - idx_production_stages_status (for production_metrics)
-- - idx_production_stages_queue (for production_metrics)

-- =====================================================
-- 6. CREATE MATERIALIZED VIEW FOR DASHBOARD SUMMARY
-- =====================================================
-- This materialized view provides fast access to dashboard summary statistics
-- It should be refreshed periodically (e.g., every 5 minutes)

CREATE MATERIALIZED VIEW production_dashboard_summary AS
SELECT 
  -- Overall counts
  COUNT(*) AS total_items,
  COUNT(*) FILTER (WHERE production_status = 'awaiting_choice') AS awaiting_choice_count,
  COUNT(*) FILTER (WHERE production_status = 'ready_for_production') AS ready_count,
  COUNT(*) FILTER (WHERE production_status = 'in_production') AS in_production_count,
  COUNT(*) FILTER (WHERE production_status = 'completed') AS completed_count,
  COUNT(*) FILTER (WHERE production_status = 'on_hold') AS on_hold_count,
  
  -- Priority counts
  COUNT(*) FILTER (WHERE priority = 'critical') AS critical_count,
  COUNT(*) FILTER (WHERE priority = 'high') AS high_count,
  COUNT(*) FILTER (WHERE priority = 'normal') AS normal_count,
  COUNT(*) FILTER (WHERE priority = 'low') AS low_count,
  
  -- Stage counts
  COUNT(*) FILTER (WHERE current_stage = 'awaiting_choice') AS stage_awaiting_choice,
  COUNT(*) FILTER (WHERE current_stage = 'design') AS stage_design,
  COUNT(*) FILTER (WHERE current_stage = 'production') AS stage_production,
  COUNT(*) FILTER (WHERE current_stage = 'quality_check') AS stage_quality_check,
  COUNT(*) FILTER (WHERE current_stage = 'packaging') AS stage_packaging,
  COUNT(*) FILTER (WHERE current_stage = 'shipped') AS stage_shipped,
  
  -- Choice status counts
  COUNT(*) FILTER (WHERE choice_status = 'pending') AS choice_pending_count,
  COUNT(*) FILTER (WHERE choice_status = 'submitted') AS choice_submitted_count,
  COUNT(*) FILTER (WHERE choice_status = 'approved') AS choice_approved_count,
  
  -- Urgent items
  COUNT(*) FILTER (
    WHERE choice_deadline IS NOT NULL 
    AND choice_status = 'pending' 
    AND EXTRACT(EPOCH FROM (choice_deadline - now())) / 3600 < 24
  ) AS urgent_choices_count,
  
  COUNT(*) FILTER (WHERE production_status = 'on_hold') AS blocked_items_count,
  
  -- Scheduled items
  COUNT(*) FILTER (
    WHERE scheduled_production_date IS NOT NULL 
    AND scheduled_production_date::date = CURRENT_DATE
  ) AS scheduled_today_count,
  
  COUNT(*) FILTER (
    WHERE scheduled_production_date IS NOT NULL 
    AND scheduled_production_date >= CURRENT_DATE 
    AND scheduled_production_date < CURRENT_DATE + INTERVAL '7 days'
  ) AS scheduled_this_week_count,
  
  -- Performance metrics
  AVG(EXTRACT(EPOCH FROM (production_completed_at - production_started_at)) / 3600) 
    FILTER (WHERE production_completed_at IS NOT NULL AND production_started_at IS NOT NULL) 
    AS avg_production_time_hours,
  
  -- Last updated
  now() AS last_refreshed

FROM production_queue;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX ON production_dashboard_summary ((1));

COMMENT ON MATERIALIZED VIEW production_dashboard_summary IS 
  'Materialized view with dashboard summary statistics, refreshed periodically for performance';

-- =====================================================
-- 7. CREATE FUNCTION TO REFRESH MATERIALIZED VIEW
-- =====================================================

CREATE OR REPLACE FUNCTION refresh_production_dashboard_summary()
RETURNS void AS $\nBEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY production_dashboard_summary;
END;\n$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_production_dashboard_summary IS 
  'Refreshes the production_dashboard_summary materialized view concurrently';

-- =====================================================
-- 8. GRANT PERMISSIONS ON VIEWS
-- =====================================================

-- Grant SELECT on views to authenticated users (via RLS on underlying tables)
GRANT SELECT ON production_queue_with_details TO authenticated;
GRANT SELECT ON pending_choices_with_countdown TO authenticated;
GRANT SELECT ON production_metrics TO authenticated;
GRANT SELECT ON urgent_production_items TO authenticated;
GRANT SELECT ON production_dashboard_summary TO authenticated;

-- Grant all to service role
GRANT ALL ON production_queue_with_details TO service_role;
GRANT ALL ON pending_choices_with_countdown TO service_role;
GRANT ALL ON production_metrics TO service_role;
GRANT ALL ON urgent_production_items TO service_role;
GRANT ALL ON production_dashboard_summary TO service_role;

-- =====================================================
-- 9. VALIDATE MIGRATION
-- =====================================================

DO $
BEGIN
  -- Check if views were created
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'production_queue_with_details'
  ) THEN
    RAISE EXCEPTION 'View production_queue_with_details was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'pending_choices_with_countdown'
  ) THEN
    RAISE EXCEPTION 'View pending_choices_with_countdown was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'production_metrics'
  ) THEN
    RAISE EXCEPTION 'View production_metrics was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'urgent_production_items'
  ) THEN
    RAISE EXCEPTION 'View urgent_production_items was not created';
  END IF;
  
  -- Check if materialized view was created
  IF NOT EXISTS (
    SELECT 1 FROM pg_matviews 
    WHERE schemaname = 'public' 
    AND matviewname = 'production_dashboard_summary'
  ) THEN
    RAISE EXCEPTION 'Materialized view production_dashboard_summary was not created';
  END IF;
  
  RAISE NOTICE 'Migration 20260428000003_create_production_views.sql completed successfully';
END $;

-- =====================================================
-- 10. MIGRATION SUMMARY
-- =====================================================

SELECT 
  '20260428000003_create_production_views.sql' AS migration_file,
  'Create optimized database views for production dashboard queries' AS description,
  'SUCCESS' AS status,
  NOW() AS executed_at,
  (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public' AND table_name LIKE 'production%' OR table_name LIKE '%choices%') AS views_created,
  (SELECT COUNT(*) FROM pg_matviews WHERE schemaname = 'public' AND matviewname LIKE 'production%') AS materialized_views_created;



-- =====================================================
-- MIGRATION: 20260428000004_create_production_functions.sql
-- =====================================================

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
RETURNS JSON AS $\nDECLARE
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
END;\n$ LANGUAGE plpgsql STABLE;

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
RETURNS BOOLEAN AS $\nDECLARE
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
END;\n$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION check_character_availability IS 
  'Checks if a character is available for selection. Returns true if available, false otherwise.';

-- =====================================================
-- 3. FUNCTION: auto_populate_production_queue()
-- =====================================================
-- Trigger function that automatically populates production_queue
-- when an order is approved (subscription_delivery or standalone_purchase)

CREATE OR REPLACE FUNCTION auto_populate_production_queue()
RETURNS TRIGGER AS $\nDECLARE
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
END;\n$ LANGUAGE plpgsql;

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




