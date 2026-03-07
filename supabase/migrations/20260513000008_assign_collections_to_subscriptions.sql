-- ============================================================================
-- Migration: Assign Collections to Subscriptions
-- Description: Atribui coleções reais aos usuários mock de assinatura
-- Date: 2026-05-13
-- Dependencies:
--   - 20260513000007_seed_collections.sql (coleções devem existir)
--   - 20260513000001_create_mock_user_all_subscriptions.sql (usuários devem existir)
-- ============================================================================

DO $$
DECLARE
  v_collection_one_piece UUID;
  v_collection_dbz UUID;
  v_collection_naruto UUID;
  v_collection_aot UUID;
  v_user_trimestral UUID;
  v_user_semestral UUID;
  v_user_anual UUID;
  v_user_legacy UUID;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ATRIBUINDO COLEÇÕES ÀS ASSINATURAS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- ============================================================================
  -- 1. BUSCAR IDS DAS COLEÇÕES
  -- ============================================================================
  
  SELECT id INTO v_collection_one_piece FROM collections WHERE slug = 'one-piece-mugiwara';
  SELECT id INTO v_collection_dbz FROM collections WHERE slug = 'dragon-ball-z-warriors';
  SELECT id INTO v_collection_naruto FROM collections WHERE slug = 'naruto-akatsuki';
  SELECT id INTO v_collection_aot FROM collections WHERE slug = 'attack-on-titan-survey-corps';
  
  IF v_collection_one_piece IS NULL OR v_collection_dbz IS NULL OR 
     v_collection_naruto IS NULL OR v_collection_aot IS NULL THEN
    RAISE EXCEPTION 'Coleções não encontradas. Execute a migration 20260513000007_seed_collections.sql primeiro.';
  END IF;
  
  RAISE NOTICE '✅ Coleções encontradas:';
  RAISE NOTICE '   • One Piece: %', v_collection_one_piece;
  RAISE NOTICE '   • Dragon Ball Z: %', v_collection_dbz;
  RAISE NOTICE '   • Naruto: %', v_collection_naruto;
  RAISE NOTICE '   • Attack on Titan: %', v_collection_aot;
  RAISE NOTICE '';
  
  -- ============================================================================
  -- 2. BUSCAR IDS DOS USUÁRIOS
  -- ============================================================================
  
  SELECT id INTO v_user_trimestral FROM auth.users WHERE email = 'trimestral@ordax.com.br';
  SELECT id INTO v_user_semestral FROM auth.users WHERE email = 'semestral@ordax.com.br';
  SELECT id INTO v_user_anual FROM auth.users WHERE email = 'anual@ordax.com.br';
  SELECT id INTO v_user_legacy FROM auth.users WHERE email = 'legacy@ordax.com.br';
  
  IF v_user_trimestral IS NULL OR v_user_semestral IS NULL OR 
     v_user_anual IS NULL OR v_user_legacy IS NULL THEN
    RAISE WARNING 'Alguns usuários mock não foram encontrados. Verifique se a migration 20260513000001 foi executada.';
  END IF;
  
  -- ============================================================================
  -- 3. ATRIBUIR COLEÇÕES ÀS ASSINATURAS
  -- ============================================================================
  
  -- João Trimestral → One Piece
  IF v_user_trimestral IS NOT NULL THEN
    UPDATE subscriptions
    SET active_collection_id = v_collection_one_piece,
        updated_at = NOW()
    WHERE user_id = v_user_trimestral;
    
    IF FOUND THEN
      v_count := v_count + 1;
      RAISE NOTICE '✅ João Trimestral → One Piece - Tripulação Mugiwara';
    END IF;
  END IF;
  
  -- Maria Semestral → Dragon Ball Z
  IF v_user_semestral IS NOT NULL THEN
    UPDATE subscriptions
    SET active_collection_id = v_collection_dbz,
        updated_at = NOW()
    WHERE user_id = v_user_semestral;
    
    IF FOUND THEN
      v_count := v_count + 1;
      RAISE NOTICE '✅ Maria Semestral → Dragon Ball Z - Guerreiros Z';
    END IF;
  END IF;
  
  -- Pedro Anual → Naruto
  IF v_user_anual IS NOT NULL THEN
    UPDATE subscriptions
    SET active_collection_id = v_collection_naruto,
        updated_at = NOW()
    WHERE user_id = v_user_anual;
    
    IF FOUND THEN
      v_count := v_count + 1;
      RAISE NOTICE '✅ Pedro Anual → Naruto - Akatsuki';
    END IF;
  END IF;
  
  -- Ana Legacy → Attack on Titan
  IF v_user_legacy IS NOT NULL THEN
    UPDATE subscriptions
    SET active_collection_id = v_collection_aot,
        updated_at = NOW()
    WHERE user_id = v_user_legacy;
    
    IF FOUND THEN
      v_count := v_count + 1;
      RAISE NOTICE '✅ Ana Legacy → Attack on Titan - Survey Corps';
    END IF;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESUMO';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Total de assinaturas atualizadas: %', v_count;
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  
END $$;

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

DO $$
DECLARE
  v_subscriptions_with_collections INTEGER;
  v_total_subscriptions INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_subscriptions FROM subscriptions;
  SELECT COUNT(*) INTO v_subscriptions_with_collections 
  FROM subscriptions 
  WHERE active_collection_id IS NOT NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE 'VERIFICAÇÃO FINAL:';
  RAISE NOTICE '  Total de assinaturas: %', v_total_subscriptions;
  RAISE NOTICE '  Assinaturas com coleção: %', v_subscriptions_with_collections;
  RAISE NOTICE '';
  
  IF v_subscriptions_with_collections < v_total_subscriptions THEN
    RAISE WARNING '⚠️ Algumas assinaturas ainda não têm coleção atribuída';
  ELSE
    RAISE NOTICE '✅ Todas as assinaturas têm coleção atribuída!';
  END IF;
  
  RAISE NOTICE '';
END $$;
