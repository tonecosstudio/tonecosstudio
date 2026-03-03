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

