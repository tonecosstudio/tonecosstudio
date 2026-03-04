-- Migration: Add tracking and cycle fields to subscription_deliveries table
-- Purpose: Add fields for delivery tracking, cycle association, collection choice, automatic maintenance, and bonus pieces
-- Requirements: 6.4, 9.6, 18.4, 29.4, 29.6, 29.11
-- Date: 2026-02-26

-- Add tracking_code field (already exists but ensure it's there and create index)
-- Note: tracking_code already exists in the table, but we need to create an index for it
CREATE INDEX IF NOT EXISTS idx_deliveries_tracking ON subscription_deliveries(tracking_code);

-- Add cycle_id field (already added in premium club migration, but ensure it's there)
-- Note: cycle_id was added in 20260301000000_create_premium_club_system.sql
-- We'll add it with IF NOT EXISTS to be safe
-- Skip foreign key constraint if cycles table doesn't exist yet (will be added in later migration)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cycles') THEN
    ALTER TABLE subscription_deliveries
      ADD COLUMN IF NOT EXISTS cycle_id UUID REFERENCES cycles(id);
  ELSE
    ALTER TABLE subscription_deliveries
      ADD COLUMN IF NOT EXISTS cycle_id UUID;
  END IF;
END $$;

-- Add collection_id field to store the chosen collection for this delivery
ALTER TABLE subscription_deliveries
  ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES collections(id);

-- Add auto_maintained field to indicate if collection choice was automatically maintained from previous month
ALTER TABLE subscription_deliveries
  ADD COLUMN IF NOT EXISTS auto_maintained BOOLEAN DEFAULT false;

-- Add bonus_piece_id field to reference exclusive bonus piece for 6th delivery of Semestral plan
-- Skip foreign key constraint if bonus_pieces table doesn't exist yet (will be added in later migration)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bonus_pieces') THEN
    ALTER TABLE subscription_deliveries
      ADD COLUMN IF NOT EXISTS bonus_piece_id UUID REFERENCES bonus_pieces(id);
  ELSE
    ALTER TABLE subscription_deliveries
      ADD COLUMN IF NOT EXISTS bonus_piece_id UUID;
  END IF;
END $$;

-- Create indexes for efficient querying as specified in requirements
-- Note: idx_deliveries_cycle already exists from premium club migration, but we'll create it if not exists
CREATE INDEX IF NOT EXISTS idx_deliveries_cycle ON subscription_deliveries(cycle_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_collection ON subscription_deliveries(collection_id);

-- Add comments for documentation
COMMENT ON COLUMN subscription_deliveries.tracking_code IS 'CÃƒÂ³digo de rastreamento da transportadora, populado quando a etiqueta de envio ÃƒÂ© gerada via API da transportadora';
COMMENT ON COLUMN subscription_deliveries.cycle_id IS 'Associa a entrega a um ciclo de produÃƒÂ§ÃƒÂ£o especÃƒÂ­fico, ajuda no gerenciamento de capacidade e relatÃƒÂ³rios baseados em ciclo';
COMMENT ON COLUMN subscription_deliveries.collection_id IS 'Armazena a coleÃƒÂ§ÃƒÂ£o escolhida para esta entrega, deve ser uma coleÃƒÂ§ÃƒÂ£o ativa para o mÃƒÂªs da entrega';
COMMENT ON COLUMN subscription_deliveries.auto_maintained IS 'Indica se a escolha da coleÃƒÂ§ÃƒÂ£o foi mantida automaticamente do mÃƒÂªs anterior (true quando o sistema copia automaticamente a escolha anterior)';
COMMENT ON COLUMN subscription_deliveries.bonus_piece_id IS 'Referencia a peÃƒÂ§a bÃƒÂ´nus exclusiva para a 6Ã‚Âª entrega de planos Semestrais, sÃƒÂ³ ÃƒÂ© populado para a 6Ã‚Âª entrega de planos Semestrais';

-- Update the updated_at trigger to ensure it works with new columns
-- (The trigger already exists from the original table creation)