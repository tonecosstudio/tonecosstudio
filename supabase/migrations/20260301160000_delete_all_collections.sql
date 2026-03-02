-- ============================================
-- Migration: Deletar Todas as Coleções Antigas
-- Data: 2026-03-01 16:00
-- Descrição: Remove todas as coleções existentes para começar do zero
-- ============================================

-- ATENÇÃO: Esta operação é IRREVERSÍVEL!
-- Todas as coleções e dados relacionados serão permanentemente deletados.

-- Desabilitar triggers temporariamente para evitar conflitos
SET session_replication_role = 'replica';

-- 1. Deletar atribuições de níveis de preço
DELETE FROM collection_tier_assignments;

-- 2. Deletar histórico de preços relacionado a coleções
DELETE FROM pricing_history WHERE collection_id IS NOT NULL;

-- 3. Deletar imagens de coleções (se existir tabela)
DELETE FROM collection_images WHERE collection_id IN (SELECT id FROM collections);

-- 4. Deletar produtos das coleções (se existir relação)
DELETE FROM collection_products WHERE collection_id IN (SELECT id FROM collections);

-- 5. Deletar todas as coleções
DELETE FROM collections;

-- Reabilitar triggers
SET session_replication_role = 'origin';

-- Resetar sequências (se houver)
-- ALTER SEQUENCE collections_id_seq RESTART WITH 1;

-- Verificar resultado
SELECT 
  'Coleções deletadas' as status,
  (SELECT COUNT(*) FROM collections) as collections_count,
  (SELECT COUNT(*) FROM collection_tier_assignments) as assignments_count,
  (SELECT COUNT(*) FROM pricing_history WHERE collection_id IS NOT NULL) as history_count;

-- Log da operação
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
    'reason', 'Reset para começar do zero',
    'timestamp', NOW()
  )
);

