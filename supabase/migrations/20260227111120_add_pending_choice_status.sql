-- Migration: Add pending_choice status to delivery_status enum
-- Date: 2026-02-27
-- Description: Adds 'pending_choice' and 'confirmed' statuses to delivery_status enum
-- These statuses are used in the automatic maintenance workflow

-- Add 'pending_choice' status if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid  
    WHERE t.typname = 'delivery_status' AND e.enumlabel = 'pending_choice'
  ) THEN
    ALTER TYPE delivery_status ADD VALUE 'pending_choice';
  END IF;
END $$;

-- Add 'confirmed' status if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid  
    WHERE t.typname = 'delivery_status' AND e.enumlabel = 'confirmed'
  ) THEN
    ALTER TYPE delivery_status ADD VALUE 'confirmed';
  END IF;
END $$;

-- Add 'in_production' status if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid  
    WHERE t.typname = 'delivery_status' AND e.enumlabel = 'in_production'
  ) THEN
    ALTER TYPE delivery_status ADD VALUE 'in_production';
  END IF;
END $$;

COMMENT ON TYPE delivery_status IS 'Status values for subscription deliveries: scheduled (future), pending_choice (awaiting collection selection), confirmed (choice made), pending_production (legacy), in_production, processing (legacy), shipped, delivered, cancelled';
