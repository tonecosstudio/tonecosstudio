-- ============================================================================
-- FIX: Corrigir valores de coins nas categorias de preço
-- Data: 2026-03-07
-- Problema: Valores desalinhados com o sistema de preços contextuais
-- Solução: Alinhar com collection_base_pricing (200, 300, 450)
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CORRIGINDO CATEGORIAS DE PREÇO';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Valores ANTES:';
  RAISE NOTICE '- Padrão: 250 coins';
  RAISE NOTICE '- Premium: 450 coins';
  RAISE NOTICE '- Ultra Raro: 600 coins';
  RAISE NOTICE '- Lendário: 750 coins';
  RAISE NOTICE '';
  RAISE NOTICE 'Valores DEPOIS (alinhados com sistema):';
  RAISE NOTICE '- Padrão: 200 coins (subscription base)';
  RAISE NOTICE '- Premium: 300 coins (standard_catalog base)';
  RAISE NOTICE '- Ultra Raro: 450 coins (premium_catalog base)';
  RAISE NOTICE '- Lendário: 600 coins (categoria especial)';
  RAISE NOTICE '';
END $$;

-- Atualizar valores
UPDATE price_categories
SET 
  price_coins = CASE name
    WHEN 'standard' THEN 200   -- Alinhado com subscription (200 coins)
    WHEN 'premium' THEN 300    -- Alinhado com standard_catalog (300 coins)
    WHEN 'ultra' THEN 450      -- Alinhado com premium_catalog (450 coins)
    WHEN 'legendary' THEN 600  -- Categoria especial
    ELSE price_coins
  END,
  updated_at = NOW()
WHERE name IN ('standard', 'premium', 'ultra', 'legendary');

-- Verificar e reportar
DO $$
DECLARE
  v_standard_coins INTEGER;
  v_premium_coins INTEGER;
  v_ultra_coins INTEGER;
  v_legendary_coins INTEGER;
BEGIN
  SELECT price_coins INTO v_standard_coins FROM price_categories WHERE name = 'standard';
  SELECT price_coins INTO v_premium_coins FROM price_categories WHERE name = 'premium';
  SELECT price_coins INTO v_ultra_coins FROM price_categories WHERE name = 'ultra';
  SELECT price_coins INTO v_legendary_coins FROM price_categories WHERE name = 'legendary';
  
  RAISE NOTICE '';
  RAISE NOTICE 'VALORES ATUALIZADOS:';
  RAISE NOTICE '- Padrão: % coins ✓', v_standard_coins;
  RAISE NOTICE '- Premium: % coins ✓', v_premium_coins;
  RAISE NOTICE '- Ultra Raro: % coins ✓', v_ultra_coins;
  RAISE NOTICE '- Lendário: % coins ✓', v_legendary_coins;
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
