-- Adicionar campo deleted_at para soft delete de mensagens
-- Apenas admins podem deletar mensagens

ALTER TABLE support_messages
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- Criar índice para melhorar performance de queries
CREATE INDEX IF NOT EXISTS idx_support_messages_deleted_at 
ON support_messages(deleted_at) 
WHERE deleted_at IS NOT NULL;

-- Comentários
COMMENT ON COLUMN support_messages.deleted_at IS 'Timestamp quando a mensagem foi deletada (soft delete)';
COMMENT ON COLUMN support_messages.deleted_by IS 'ID do usuário que deletou a mensagem';
