-- =====================================================
-- Migration: Add Missing Columns to pricing_tiers
-- Description: Adiciona colunas price_full, price_pix e deposit_amount
-- =====================================================

-- Adicionar colunas faltantes
ALTER TABLE pricing_tiers
  ADD COLUMN IF NOT EXISTS price_full DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS price_pix DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2) DEFAULT 0;

-- Migrar dados existentes
-- price_full = price_brl (preço cheio)
-- price_pix = price_brl * 0.95 (5% de desconto no PIX)
UPDATE pricing_tiers
SET 
  price_full = price_brl,
  price_pix = price_brl * 0.95,
  deposit_amount = 0
WHERE price_full IS NULL;

-- Adicionar constraints
ALTER TABLE pricing_tiers
  ADD CONSTRAINT pricing_tiers_price_full_positive CHECK (price_full IS NULL OR price_full > 0),
  ADD CONSTRAINT pricing_tiers_price_pix_positive CHECK (price_pix IS NULL OR price_pix > 0),
  ADD CONSTRAINT pricing_tiers_deposit_amount_non_negative CHECK (deposit_amount >= 0);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_price_full ON pricing_tiers(price_full) WHERE price_full IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_price_pix ON pricing_tiers(price_pix) WHERE price_pix IS NOT NULL;

-- Comentários
COMMENT ON COLUMN pricing_tiers.price_full IS 'Preço cheio em reais (sem desconto)';
COMMENT ON COLUMN pricing_tiers.price_pix IS 'Preço com desconto PIX (geralmente 5% menor)';
COMMENT ON COLUMN pricing_tiers.deposit_amount IS 'Valor de entrada/sinal em reais (para compras parceladas)';

-- Recarregar schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
