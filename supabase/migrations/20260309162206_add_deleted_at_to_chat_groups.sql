-- =====================================================
-- Migration: Add deleted_at to chat_groups
-- Description: Adiciona coluna deleted_at para soft delete de grupos de chat
-- =====================================================

-- Adicionar coluna deleted_at
ALTER TABLE chat_groups
ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Criar índice para melhorar performance de filtros
CREATE INDEX idx_chat_groups_deleted_at ON chat_groups(deleted_at)
WHERE deleted_at IS NULL;

-- Comentário explicativo
COMMENT ON COLUMN chat_groups.deleted_at IS 'Timestamp de soft delete. NULL = ativo, NOT NULL = deletado';

-- Recarregar schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
