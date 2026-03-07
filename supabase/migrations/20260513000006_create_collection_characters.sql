-- ============================================================================
-- Migration: Create Collection Characters
-- Description: Adiciona personagens às 4 coleções existentes
-- Date: 2026-05-13
-- ============================================================================

-- ============================================================================
-- PERSONAGENS POR COLEÇÃO:
-- - One Piece - Tripulação Mugiwara: 5 personagens
-- - Dragon Ball Z - Guerreiros Z: 5 personagens
-- - Naruto - Akatsuki: 5 personagens
-- - Attack on Titan - Survey Corps: 5 personagens
-- Total: 20 personagens
-- ============================================================================

DO $$
DECLARE
  v_collection_id UUID;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CRIANDO PERSONAGENS DAS COLEÇÕES';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- ============================================================================
  -- 1. ONE PIECE - TRIPULAÇÃO MUGIWARA
  -- ============================================================================
  
  SELECT id INTO v_collection_id FROM collections WHERE slug = 'one-piece-mugiwara';
  
  IF v_collection_id IS NOT NULL THEN
    RAISE NOTICE '📦 One Piece - Tripulação Mugiwara';
    
    INSERT INTO collection_characters (collection_id, name, description, release_order, status, created_at, updated_at)
    VALUES
      (v_collection_id, 'Monkey D. Luffy', 'Capitão dos Piratas do Chapéu de Palha', 1, 'revealed', NOW(), NOW()),
      (v_collection_id, 'Roronoa Zoro', 'Espadachim dos Três Estilos', 2, 'revealed', NOW(), NOW()),
      (v_collection_id, 'Nami', 'Navegadora e Ladra de Gatos', 3, 'revealed', NOW(), NOW()),
      (v_collection_id, 'Sanji', 'Cozinheiro de Perna Negra', 4, 'upcoming', NOW(), NOW()),
      (v_collection_id, 'Tony Tony Chopper', 'Médico Rena', 5, 'upcoming', NOW(), NOW())
    ON CONFLICT (collection_id, release_order) DO NOTHING;
    
    v_count := v_count + 5;
    RAISE NOTICE '   ✅ 5 personagens criados';
  END IF;
  
  -- ============================================================================
  -- 2. DRAGON BALL Z - GUERREIROS Z
  -- ============================================================================
  
  SELECT id INTO v_collection_id FROM collections WHERE slug = 'dragon-ball-z-warriors';
  
  IF v_collection_id IS NOT NULL THEN
    RAISE NOTICE '📦 Dragon Ball Z - Guerreiros Z';
    
    INSERT INTO collection_characters (collection_id, name, description, release_order, status, created_at, updated_at)
    VALUES
      (v_collection_id, 'Son Goku', 'Guerreiro Saiyajin, protetor da Terra', 1, 'revealed', NOW(), NOW()),
      (v_collection_id, 'Vegeta', 'Príncipe dos Saiyajins', 2, 'revealed', NOW(), NOW()),
      (v_collection_id, 'Son Gohan', 'Filho de Goku, meio Saiyajin', 3, 'revealed', NOW(), NOW()),
      (v_collection_id, 'Piccolo', 'Namekuseijin, mentor de Gohan', 4, 'upcoming', NOW(), NOW()),
      (v_collection_id, 'Trunks', 'Filho de Vegeta do futuro', 5, 'upcoming', NOW(), NOW())
    ON CONFLICT (collection_id, release_order) DO NOTHING;
    
    v_count := v_count + 5;
    RAISE NOTICE '   ✅ 5 personagens criados';
  END IF;
  
  -- ============================================================================
  -- 3. NARUTO - AKATSUKI
  -- ============================================================================
  
  SELECT id INTO v_collection_id FROM collections WHERE slug = 'naruto-akatsuki';
  
  IF v_collection_id IS NOT NULL THEN
    RAISE NOTICE '📦 Naruto - Akatsuki';
    
    INSERT INTO collection_characters (collection_id, name, description, release_order, status, created_at, updated_at)
    VALUES
      (v_collection_id, 'Itachi Uchiha', 'Gênio do clã Uchiha', 1, 'revealed', NOW(), NOW()),
      (v_collection_id, 'Pain (Nagato)', 'Líder da Akatsuki', 2, 'revealed', NOW(), NOW()),
      (v_collection_id, 'Obito Uchiha', 'Tobi, o mascarado', 3, 'revealed', NOW(), NOW()),
      (v_collection_id, 'Kisame Hoshigaki', 'Monstro da Névoa Oculta', 4, 'upcoming', NOW(), NOW()),
      (v_collection_id, 'Deidara', 'Artista explosivo', 5, 'upcoming', NOW(), NOW())
    ON CONFLICT (collection_id, release_order) DO NOTHING;
    
    v_count := v_count + 5;
    RAISE NOTICE '   ✅ 5 personagens criados';
  END IF;
  
  -- ============================================================================
  -- 4. ATTACK ON TITAN - SURVEY CORPS
  -- ============================================================================
  
  SELECT id INTO v_collection_id FROM collections WHERE slug = 'attack-on-titan-survey-corps';
  
  IF v_collection_id IS NOT NULL THEN
    RAISE NOTICE '📦 Attack on Titan - Survey Corps';
    
    INSERT INTO collection_characters (collection_id, name, description, release_order, status, created_at, updated_at)
    VALUES
      (v_collection_id, 'Eren Yeager', 'Titã de Ataque', 1, 'revealed', NOW(), NOW()),
      (v_collection_id, 'Mikasa Ackerman', 'Soldado mais forte', 2, 'revealed', NOW(), NOW()),
      (v_collection_id, 'Levi Ackerman', 'Capitão, soldado mais habilidoso', 3, 'revealed', NOW(), NOW()),
      (v_collection_id, 'Armin Arlert', 'Titã Colossal', 4, 'upcoming', NOW(), NOW()),
      (v_collection_id, 'Erwin Smith', 'Comandante do Corpo de Exploração', 5, 'upcoming', NOW(), NOW())
    ON CONFLICT (collection_id, release_order) DO NOTHING;
    
    v_count := v_count + 5;
    RAISE NOTICE '   ✅ 5 personagens criados';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESUMO';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Total de personagens criados: %', v_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Status dos personagens:';
  RAISE NOTICE '  • revealed (3 por coleção): Já revelados, disponíveis para escolha';
  RAISE NOTICE '  • upcoming (2 por coleção): Ainda não revelados';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  
END $$;

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

DO $$
DECLARE
  v_total_characters INTEGER;
  v_revealed_characters INTEGER;
  v_upcoming_characters INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_characters FROM collection_characters;
  SELECT COUNT(*) INTO v_revealed_characters FROM collection_characters WHERE status = 'revealed';
  SELECT COUNT(*) INTO v_upcoming_characters FROM collection_characters WHERE status = 'upcoming';
  
  RAISE NOTICE '';
  RAISE NOTICE 'VERIFICAÇÃO FINAL:';
  RAISE NOTICE '  Total de personagens: %', v_total_characters;
  RAISE NOTICE '  Revelados: %', v_revealed_characters;
  RAISE NOTICE '  Upcoming: %', v_upcoming_characters;
  RAISE NOTICE '';
  
  IF v_total_characters >= 20 THEN
    RAISE NOTICE '✅ Todos os personagens foram criados com sucesso!';
  ELSE
    RAISE WARNING '⚠️ Apenas % personagens foram criados', v_total_characters;
  END IF;
  
  RAISE NOTICE '';
END $$;
