-- ============================================
-- Migration: Deletar Todas as ColeÃƒÂ§ÃƒÂµes Antigas
-- Data: 2026-03-01 16:00
-- DescriÃƒÂ§ÃƒÂ£o: Remove todas as coleÃƒÂ§ÃƒÂµes existentes para comeÃƒÂ§ar do zero
-- ============================================

-- ATENÃƒâ€¡ÃƒÆ’O: Esta operaÃƒÂ§ÃƒÂ£o ÃƒÂ© IRREVERSÃƒÂVEL!
-- Todas as coleÃƒÂ§ÃƒÂµes e dados relacionados serÃƒÂ£o permanentemente deletados.

-- Desabilitar triggers temporariamente para evitar conflitos
SET session_replication_role = 'replica';

-- 1. Deletar atribuiÃƒÂ§ÃƒÂµes de nÃƒÂ­veis de preÃƒÂ§o
DELETE FROM collection_tier_assignments;

-- 2. Deletar histÃƒÂ³rico de preÃƒÂ§os relacionado a coleÃƒÂ§ÃƒÂµes
DELETE FROM pricing_history WHERE collection_id IS NOT NULL;

-- 3. Deletar imagens de coleÃƒÂ§ÃƒÂµes (se existir tabela)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collection_images') THEN
    DELETE FROM collection_images WHERE collection_id IN (SELECT id FROM collections);
  END IF;
END $$;

-- 4. Deletar produtos das coleÃƒÂ§ÃƒÂµes (se existir relaÃƒÂ§ÃƒÂ£o)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collection_products') THEN
    DELETE FROM collection_products WHERE collection_id IN (SELECT id FROM collections);
  END IF;
END $$;

-- 5. Deletar todas as coleÃƒÂ§ÃƒÂµes
DELETE FROM collections;

-- Reabilitar triggers
SET session_replication_role = 'origin';

-- Resetar sequÃƒÂªncias (se houver)
-- ALTER SEQUENCE collections_id_seq RESTART WITH 1;

-- Verificar resultado
SELECT 
  'ColeÃƒÂ§ÃƒÂµes deletadas' as status,
  (SELECT COUNT(*) FROM collections) as collections_count,
  (SELECT COUNT(*) FROM collection_tier_assignments) as assignments_count,
  (SELECT COUNT(*) FROM pricing_history WHERE collection_id IS NOT NULL) as history_count;

-- Log da operaÃƒÂ§ÃƒÂ£o
INSERT INTO migration_audit (
  migration_type,
  collections_affected,
  status,
  completed_at,
  migration_data
)
VALUES (
  'initial_migration',
  0,
  'completed',
  NOW(),
  jsonb_build_object(
    'operation', 'delete_all_collections',
    'reason', 'Reset para comeÃƒÂ§ar do zero',
    'timestamp', NOW()
  )
);

