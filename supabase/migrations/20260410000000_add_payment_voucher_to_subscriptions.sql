-- Migration: Add payment voucher URL to subscriptions table
-- Task: 25.2 - Add voucher upload to subscription creation
-- Requirements: 25.1, 25.3
-- Date: 2026-04-10

-- Add payment_voucher_url field to subscriptions table
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS payment_voucher_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN subscriptions.payment_voucher_url IS 
  'URL of payment voucher (proof of payment) uploaded by customer for manual verification';

-- CREATE INDEX IF NOT EXISTS for faster lookups when filtering by voucher status
CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_voucher 
  ON subscriptions(payment_voucher_url) 
  WHERE payment_voucher_url IS NOT NULL;
