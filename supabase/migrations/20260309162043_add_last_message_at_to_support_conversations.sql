-- =====================================================
-- Migration: Add last_message_at to Support Conversations
-- Description: Adiciona coluna para rastrear última mensagem
-- =====================================================

-- =====================================================
-- Adicionar coluna last_message_at
-- =====================================================

ALTER TABLE support_conversations 
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ DEFAULT NOW();

-- Criar índice para ordenação
CREATE INDEX IF NOT EXISTS idx_support_conversations_last_message_at 
ON support_conversations(last_message_at DESC);

-- Atualizar registros existentes com created_at
UPDATE support_conversations 
SET last_message_at = updated_at 
WHERE last_message_at IS NULL;

-- =====================================================
-- Trigger para atualizar last_message_at automaticamente
-- =====================================================

-- Função para atualizar last_message_at quando updated_at muda
CREATE OR REPLACE FUNCTION update_last_message_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_message_at = NEW.updated_at;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS set_last_message_at_support_conversations ON support_conversations;
CREATE TRIGGER set_last_message_at_support_conversations
  BEFORE UPDATE ON support_conversations
  FOR EACH ROW
  WHEN (OLD.updated_at IS DISTINCT FROM NEW.updated_at)
  EXECUTE FUNCTION update_last_message_at();

-- =====================================================
-- Reload Schema Cache
-- =====================================================

NOTIFY pgrst, 'reload schema';

-- =====================================================
-- Verificação
-- =====================================================

DO $$
DECLARE
  has_column BOOLEAN;
  has_index BOOLEAN;
BEGIN
  -- Verificar se coluna existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'support_conversations'
    AND column_name = 'last_message_at'
  ) INTO has_column;
  
  -- Verificar se índice existe
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'support_conversations'
    AND indexname = 'idx_support_conversations_last_message_at'
  ) INTO has_index;
  
  IF has_column AND has_index THEN
    RAISE NOTICE '✅ Column last_message_at and index added successfully';
  ELSE
    RAISE EXCEPTION '❌ Missing: column=%, index=%', has_column, has_index;
  END IF;
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN support_conversations.last_message_at IS 'Data e hora da última mensagem na conversa (atualizado automaticamente)';
COMMENT ON FUNCTION update_last_message_at IS 'Atualiza last_message_at quando updated_at muda';

