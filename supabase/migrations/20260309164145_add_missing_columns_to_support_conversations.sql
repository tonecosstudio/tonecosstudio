-- =====================================================
-- Migration: Add Missing Columns to support_conversations
-- Description: Adiciona colunas priority, tags e relacionamentos
-- =====================================================

-- =====================================================
-- ADICIONAR COLUNAS FALTANTES
-- =====================================================

ALTER TABLE support_conversations
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS order_id UUID,
ADD COLUMN IF NOT EXISTS quote_id UUID,
ADD COLUMN IF NOT EXISTS subscription_id UUID,
ADD COLUMN IF NOT EXISTS payment_id UUID;

-- Criar índices para as novas colunas
CREATE INDEX IF NOT EXISTS idx_support_conversations_priority ON support_conversations(priority);
CREATE INDEX IF NOT EXISTS idx_support_conversations_tags ON support_conversations USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_support_conversations_order_id ON support_conversations(order_id);
CREATE INDEX IF NOT EXISTS idx_support_conversations_quote_id ON support_conversations(quote_id);
CREATE INDEX IF NOT EXISTS idx_support_conversations_subscription_id ON support_conversations(subscription_id);
CREATE INDEX IF NOT EXISTS idx_support_conversations_payment_id ON support_conversations(payment_id);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN support_conversations.priority IS 'Prioridade da conversa: low, medium, high, urgent';
COMMENT ON COLUMN support_conversations.tags IS 'Tags para categorização (duvida, problema, sugestao, etc)';
COMMENT ON COLUMN support_conversations.order_id IS 'ID do pedido relacionado (se aplicável)';
COMMENT ON COLUMN support_conversations.quote_id IS 'ID do orçamento relacionado (se aplicável)';
COMMENT ON COLUMN support_conversations.subscription_id IS 'ID da assinatura relacionada (se aplicável)';
COMMENT ON COLUMN support_conversations.payment_id IS 'ID do pagamento relacionado (se aplicável)';

-- Recarregar schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
