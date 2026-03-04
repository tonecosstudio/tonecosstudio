-- Migration: Add subscription cycle and pause fields
-- Purpose: Add entry_cycle_id to associate subscription with creation cycle, and pause_count to track subscription pauses
-- Requirements: 20.1, 23.6, 29.5, 29.12
-- Date: 2026-02-26

-- Add entry_cycle_id field to associate subscription with the cycle when it was created
-- This determines first delivery month: Cycle 1 (days 1-15) = next month, Cycle 2 (days 16-end) = second subsequent month
-- Skip foreign key constraint if cycles table doesn't exist yet (will be added in later migration)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cycles') THEN
    ALTER TABLE subscriptions
      ADD COLUMN IF NOT EXISTS entry_cycle_id UUID REFERENCES cycles(id);
  ELSE
    ALTER TABLE subscriptions
      ADD COLUMN IF NOT EXISTS entry_cycle_id UUID;
  END IF;
END $$;

-- Add pause_count field to track how many pauses subscriber has used (max 2 per subscription plan)
-- When subscriber pauses, shift all subsequent deliveries by one month and release production capacity
-- Add CHECK constraint as part of column definition to ensure pause_count is between 0 and 2 (inclusive)
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS pause_count INTEGER DEFAULT 0 CHECK (pause_count >= 0 AND pause_count <= 2);

-- CREATE INDEX IF NOT EXISTS for efficient querying by entry_cycle_id
-- This supports Requirement 20: Subscription-Cycle Association on Creation
CREATE INDEX IF NOT EXISTS idx_subscriptions_entry_cycle ON subscriptions(entry_cycle_id);

-- Add comments for documentation
COMMENT ON COLUMN subscriptions.entry_cycle_id IS 'Associa a assinatura ao ciclo em que foi criada, determina o mÃƒÂªs da primeira entrega: Ciclo 1 (dias 1-15) = prÃƒÂ³ximo mÃƒÂªs, Ciclo 2 (dias 16-fim) = segundo mÃƒÂªs subsequente';
COMMENT ON COLUMN subscriptions.pause_count IS 'Contador de pausas utilizadas pelo assinante (mÃƒÂ¡ximo 2 por plano de assinatura). Quando o assinante pausa, todas as entregas subsequentes sÃƒÂ£o deslocadas em um mÃƒÂªs e a capacidade de produÃƒÂ§ÃƒÂ£o ÃƒÂ© liberada.';

-- Update the updated_at trigger to ensure it works with new columns
-- (The trigger already exists from the original table creation)