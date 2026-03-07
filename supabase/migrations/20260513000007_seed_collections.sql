-- ============================================================================
-- Migration: Seed Collections
-- Description: Cria as 4 coleções principais do sistema
-- Date: 2026-05-13
-- ============================================================================

-- ============================================================================
-- COLEÇÕES:
-- 1. One Piece - Tripulação Mugiwara
-- 2. Dragon Ball Z - Guerreiros Z
-- 3. Naruto - Akatsuki
-- 4. Attack on Titan - Survey Corps
-- ============================================================================

DO $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CRIANDO COLEÇÕES';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- ============================================================================
  -- 1. ONE PIECE - TRIPULAÇÃO MUGIWARA
  -- ============================================================================
  
  INSERT INTO collections (
    name,
    slug,
    description,
    image_url,
    is_active,
    display_order,
    created_at,
    updated_at
  )
  VALUES (
    'One Piece - Tripulação Mugiwara',
    'one-piece-mugiwara',
    'Coleção dos piratas do Chapéu de Palha, liderados por Monkey D. Luffy em sua jornada para se tornar o Rei dos Piratas.',
    '/images/collections/one-piece-mugiwara.jpg',
    true,
    1,
    NOW(),
    NOW()
  )
  ON CONFLICT (slug) DO NOTHING;
  
  v_count := v_count + 1;
  RAISE NOTICE '✅ One Piece - Tripulação Mugiwara';
  
  -- ============================================================================
  -- 2. DRAGON BALL Z - GUERREIROS Z
  -- ============================================================================
  
  INSERT INTO collections (
    name,
    slug,
    description,
    image_url,
    is_active,
    display_order,
    created_at,
    updated_at
  )
  VALUES (
    'Dragon Ball Z - Guerreiros Z',
    'dragon-ball-z-warriors',
    'Coleção dos poderosos guerreiros que protegem a Terra das ameaças mais perigosas do universo.',
    '/images/collections/dragon-ball-z-warriors.jpg',
    true,
    2,
    NOW(),
    NOW()
  )
  ON CONFLICT (slug) DO NOTHING;
  
  v_count := v_count + 1;
  RAISE NOTICE '✅ Dragon Ball Z - Guerreiros Z';
  
  -- ============================================================================
  -- 3. NARUTO - AKATSUKI
  -- ============================================================================
  
  INSERT INTO collections (
    name,
    slug,
    description,
    image_url,
    is_active,
    display_order,
    created_at,
    updated_at
  )
  VALUES (
    'Naruto - Akatsuki',
    'naruto-akatsuki',
    'Coleção da organização criminosa mais temida do mundo ninja, formada por ninjas renegados de poder extraordinário.',
    '/images/collections/naruto-akatsuki.jpg',
    true,
    3,
    NOW(),
    NOW()
  )
  ON CONFLICT (slug) DO NOTHING;
  
  v_count := v_count + 1;
  RAISE NOTICE '✅ Naruto - Akatsuki';
  
  -- ============================================================================
  -- 4. ATTACK ON TITAN - SURVEY CORPS
  -- ============================================================================
  
  INSERT INTO collections (
    name,
    slug,
    description,
    image_url,
    is_active,
    display_order,
    created_at,
    updated_at
  )
  VALUES (
    'Attack on Titan - Survey Corps',
    'attack-on-titan-survey-corps',
    'Coleção dos bravos soldados do Corpo de Exploração que arriscam suas vidas para proteger a humanidade dos Titãs.',
    '/images/collections/attack-on-titan-survey-corps.jpg',
    true,
    4,
    NOW(),
    NOW()
  )
  ON CONFLICT (slug) DO NOTHING;
  
  v_count := v_count + 1;
  RAISE NOTICE '✅ Attack on Titan - Survey Corps';
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESUMO';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Total de coleções criadas: %', v_count;
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  
END $$;

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

DO $$
DECLARE
  v_total_collections INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_collections FROM collections;
  
  RAISE NOTICE '';
  RAISE NOTICE 'VERIFICAÇÃO FINAL:';
  RAISE NOTICE '  Total de coleções: %', v_total_collections;
  RAISE NOTICE '';
  
  IF v_total_collections >= 4 THEN
    RAISE NOTICE '✅ Todas as coleções foram criadas com sucesso!';
  ELSE
    RAISE WARNING '⚠️ Apenas % coleções foram criadas', v_total_collections;
  END IF;
  
  RAISE NOTICE '';
END $$;
