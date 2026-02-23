-- Migration: Add release_month to collection_characters
-- Purpose: Adicionar campo de mês de lançamento para calendário
-- Date: 2026-02-03

-- Adicionar coluna release_month
ALTER TABLE collection_characters 
ADD COLUMN IF NOT EXISTS release_month INTEGER CHECK (release_month >= 1 AND release_month <= 12);

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_collection_characters_month ON collection_characters(release_month);

-- Comentário
COMMENT ON COLUMN collection_characters.release_month IS 'Mês de lançamento do personagem (1-12)';
