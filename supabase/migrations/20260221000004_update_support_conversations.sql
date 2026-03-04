-- =====================================================
-- Migration: Update support_conversations table
-- Description: Add missing fields for advanced chat system
-- =====================================================

-- Add tags array (multiple tags support)
ALTER TABLE support_conversations 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Add risk_flags array
ALTER TABLE support_conversations 
ADD COLUMN IF NOT EXISTS risk_flags TEXT[] DEFAULT '{}';

-- Add promised_date field
ALTER TABLE support_conversations 
ADD COLUMN IF NOT EXISTS promised_date TIMESTAMPTZ;

-- Add quote_id for integration
ALTER TABLE support_conversations 
ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL;

-- Add subscription_id for integration
ALTER TABLE support_conversations 
ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL;

-- Create GIN indexes for array fields
CREATE INDEX IF NOT EXISTS idx_support_conversations_tags 
ON support_conversations USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_support_conversations_risk_flags 
ON support_conversations USING GIN(risk_flags);

-- CREATE INDEX IF NOT EXISTS for promised_date (partial index for non-null values)
CREATE INDEX IF NOT EXISTS idx_support_conversations_promised_date 
ON support_conversations(promised_date) 
WHERE promised_date IS NOT NULL;

-- Create indexes for new foreign keys
CREATE INDEX IF NOT EXISTS idx_support_conversations_quote 
ON support_conversations(quote_id);

CREATE INDEX IF NOT EXISTS idx_support_conversations_subscription 
ON support_conversations(subscription_id);

-- Add comments
COMMENT ON COLUMN support_conversations.tags IS 'Array de tags para categorizaÃƒÂ§ÃƒÂ£o mÃƒÂºltipla (pedido, orcamento, duvida, reclamacao, assinatura, urgente)';
COMMENT ON COLUMN support_conversations.risk_flags IS 'Array de flags de risco (cliente_conflito, atraso_critico, pagamento_problema)';
COMMENT ON COLUMN support_conversations.promised_date IS 'Data prometida ao cliente para resoluÃƒÂ§ÃƒÂ£o ou entrega';
COMMENT ON COLUMN support_conversations.quote_id IS 'Vincula conversa a um orÃƒÂ§amento';
COMMENT ON COLUMN support_conversations.subscription_id IS 'Vincula conversa a uma assinatura';
