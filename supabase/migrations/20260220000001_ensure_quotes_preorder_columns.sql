-- Ensure all preorder columns exist in quotes table
-- This fixes 400 errors when querying quotes with is_preorder filter

-- Add columns if they don't exist (idempotent)
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS is_preorder BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_status TEXT,
ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS full_payment_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS ready_for_final_payment BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS final_payment_notified_at TIMESTAMPTZ;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_quotes_is_preorder ON quotes(is_preorder) WHERE is_preorder = true;
CREATE INDEX IF NOT EXISTS idx_quotes_payment_status ON quotes(payment_status);
