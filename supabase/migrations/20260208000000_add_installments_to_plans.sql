-- Migration: Add installments field to subscription_plans
-- Purpose: Allow admin to configure max installments for each plan
-- Date: 2026-02-08

-- Add installments column
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS max_installments INTEGER NOT NULL DEFAULT 10;

-- Update existing plans to 10x
UPDATE subscription_plans
SET max_installments = 10
WHERE max_installments IS NULL OR max_installments = 0;

-- Add comment
COMMENT ON COLUMN subscription_plans.max_installments IS 'Maximum number of installments without interest (e.g., 10 for 10x sem juros)';
