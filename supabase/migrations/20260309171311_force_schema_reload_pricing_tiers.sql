-- =====================================================
-- Migration: Force Schema Reload for pricing_tiers
-- Description: Força reload do schema cache do PostgREST
-- =====================================================

-- Verificar se as colunas existem
DO $$
BEGIN
  -- Verificar price_full
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pricing_tiers' AND column_name = 'price_full'
  ) THEN
    RAISE EXCEPTION 'Coluna price_full não existe em pricing_tiers';
  END IF;

  -- Verificar price_pix
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pricing_tiers' AND column_name = 'price_pix'
  ) THEN
    RAISE EXCEPTION 'Coluna price_pix não existe em pricing_tiers';
  END IF;

  -- Verificar deposit_amount
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pricing_tiers' AND column_name = 'deposit_amount'
  ) THEN
    RAISE EXCEPTION 'Coluna deposit_amount não existe em pricing_tiers';
  END IF;

  RAISE NOTICE 'Todas as colunas existem em pricing_tiers';
END $$;

-- Forçar reload do schema cache múltiplas vezes
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';

-- Comentário para forçar mudança no schema
COMMENT ON TABLE pricing_tiers IS 'Níveis de precificação para personagens - Atualizado com price_full, price_pix e deposit_amount';
