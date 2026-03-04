-- Migration: Add 'expired' status to character_choices
-- Feature: Production Management System
-- Task: 3.3.3 Create deadline expiration job (runs hourly)
-- Requirements: 2.2.4
-- Description: Adds 'expired' status to character_choices table to support deadline expiration workflow

-- =====================================================
-- PRODUCTION MANAGEMENT SYSTEM - Add Expired Status
-- =====================================================
-- This migration adds the 'expired' status to the character_choices
-- table to support the deadline expiration workflow.
--
-- When a customer fails to choose their character within the 7-day
-- deadline, the cron job marks the choice as 'expired' and notifies
-- administrators to manually assign a character.
--
-- Requirements:
-- - 2.2.4: Deadline Management - After deadline expires, admin is notified to manually assign character
-- =====================================================

-- =====================================================
-- STEP 1: Add 'expired' to status CHECK constraint
-- =====================================================

-- Drop the existing CHECK constraint
ALTER TABLE character_choices 
  DROP CONSTRAINT IF EXISTS character_choices_status_check;

-- Add new CHECK constraint with 'expired' status
ALTER TABLE character_choices
  ADD CONSTRAINT character_choices_status_check 
  CHECK (status IN (
    'pending',      -- Customer hasn't chosen yet
    'submitted',    -- Customer submitted choice
    'approved',     -- Admin approved choice
    'rejected',     -- Admin rejected choice (out of stock, etc.)
    'locked',       -- Choice locked (production started)
    'expired'       -- Deadline expired, awaiting admin assignment
  ));

-- =====================================================
-- STEP 2: Update status transition validation function
-- =====================================================

-- Drop and recreate the status transition validation function
-- to include 'expired' status transitions
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
    
    -- pending -> expired (deadline passed, cron job marks as expired)
    ELSIF OLD.status = 'pending' AND NEW.status = 'expired' THEN
      -- Valid transition, no additional checks needed
      -- Cron job will handle notification and production queue update
      NULL;
    
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
    
    -- expired -> approved (admin manually assigns character)
    ELSIF OLD.status = 'expired' AND NEW.status = 'approved' THEN
      IF NEW.approved_at IS NULL THEN
        NEW.approved_at := now();
      END IF;
      IF NEW.approved_by IS NULL THEN
        RAISE EXCEPTION 'approved_by must be set when approving a choice';
      END IF;
      IF NEW.character_id IS NULL THEN
        RAISE EXCEPTION 'character_id must be set when approving an expired choice';
      END IF;
    
    -- Invalid transition
    ELSE
      RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 3: Update production queue sync function
-- =====================================================

-- Update the sync function to handle 'expired' status
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
      choice_made_at = COALESCE(NEW.submitted_at, NEW.approved_at),
      production_status = CASE 
        WHEN production_status = 'awaiting_choice' THEN 'ready_for_production'
        ELSE production_status
      END,
      current_stage = CASE 
        WHEN current_stage = 'awaiting_choice' THEN 'design'
        ELSE current_stage
      END,
      -- Remove 'choice_expired' flag if it exists
      internal_flags = array_remove(internal_flags, 'choice_expired')
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
  
  -- Update production_queue when choice expires
  IF NEW.status = 'expired' AND (OLD IS NULL OR OLD.status != 'expired') THEN
    UPDATE production_queue
    SET 
      choice_status = 'expired',
      -- Note: internal_flags 'choice_expired' is added by the cron job
      updated_at = now()
    WHERE order_id = NEW.order_id 
      AND order_type = NEW.order_type;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 4: Add comment for documentation
-- =====================================================

COMMENT ON CONSTRAINT character_choices_status_check ON character_choices IS 
  'Valid status values: pending (awaiting customer choice), submitted (customer submitted), approved (admin approved), rejected (admin rejected), locked (production started), expired (deadline passed)';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- 
-- To verify the constraint was updated:
-- SELECT conname, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conname = 'character_choices_status_check';
--
-- To test the new status:
-- UPDATE character_choices 
-- SET status = 'expired' 
-- WHERE id = 'test-choice-id' AND status = 'pending';
--
-- To verify the status transition function:
-- SELECT proname, prosrc 
-- FROM pg_proc 
-- WHERE proname = 'validate_character_choice_status_transition';
--
-- =====================================================

-- =====================================================
-- NOTES
-- =====================================================
--
-- Status Workflow:
-- 1. pending Ã¢â€ â€™ submitted (customer chooses character)
-- 2. pending Ã¢â€ â€™ expired (deadline passes without choice)
-- 3. submitted Ã¢â€ â€™ approved (admin approves choice)
-- 4. submitted Ã¢â€ â€™ rejected (admin rejects choice)
-- 5. approved Ã¢â€ â€™ locked (production starts)
-- 6. rejected Ã¢â€ â€™ pending (customer can try again)
-- 7. expired Ã¢â€ â€™ approved (admin manually assigns character)
--
-- Expired Status:
-- - Set by cron-expire-character-choices job when deadline passes
-- - Indicates admin must manually assign character
-- - Can transition to 'approved' when admin assigns character
-- - Cannot transition back to 'pending' or 'submitted'
--
-- Production Queue Integration:
-- - When status changes to 'expired', production_queue.choice_status is updated
-- - Cron job adds 'choice_expired' flag to production_queue.internal_flags
-- - When admin approves expired choice, 'choice_expired' flag is removed
-- - Production can proceed once character is assigned
--
-- =====================================================

-- =====================================================
-- VALIDATE MIGRATION
-- =====================================================

DO $$
BEGIN
  -- Check if constraint was updated
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'character_choices_status_check'
    AND pg_get_constraintdef(oid) LIKE '%expired%'
  ) THEN
    RAISE EXCEPTION 'Constraint character_choices_status_check was not updated with expired status';
  END IF;
  
  -- Check if function was updated
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'validate_character_choice_status_transition'
    AND prosrc LIKE '%expired%'
  ) THEN
    RAISE EXCEPTION 'Function validate_character_choice_status_transition was not updated';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'sync_character_choice_to_production_queue'
    AND prosrc LIKE '%expired%'
  ) THEN
    RAISE EXCEPTION 'Function sync_character_choice_to_production_queue was not updated';
  END IF;
  
  RAISE NOTICE 'Migration 20260429000002_add_expired_status_to_character_choices.sql completed successfully';
END $$;

-- =====================================================
-- MIGRATION SUMMARY
-- =====================================================

SELECT 
  '20260429000002_add_expired_status_to_character_choices.sql' AS migration_file,
  'Add expired status to character_choices table' AS description,
  'SUCCESS' AS status,
  NOW() AS executed_at,
  (SELECT COUNT(*) FROM pg_constraint WHERE conname = 'character_choices_status_check' AND pg_get_constraintdef(oid) LIKE '%expired%') AS constraint_updated,
  (SELECT COUNT(*) FROM pg_proc WHERE proname = 'validate_character_choice_status_transition' AND prosrc LIKE '%expired%') AS transition_function_updated,
  (SELECT COUNT(*) FROM pg_proc WHERE proname = 'sync_character_choice_to_production_queue' AND prosrc LIKE '%expired%') AS sync_function_updated;
