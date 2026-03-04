-- Migration: Create conversation_reminders table
-- Description: Tabela para gerenciar lembretes automÃƒÆ’Ã‚Â¡ticos de conversas (follow-up de orÃƒÆ’Ã‚Â§amentos, pagamentos pendentes, datas prometidas)
-- Requirements: 23.1, 23.2

CREATE TABLE IF NOT EXISTS conversation_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('quote_followup', 'payment_pending', 'promised_date')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ÃƒÆ’Ã‚Ândice para buscar lembretes pendentes que precisam ser enviados
CREATE INDEX IF NOT EXISTS idx_conversation_reminders_scheduled ON conversation_reminders(scheduled_for) 
  WHERE is_active = true AND sent_at IS NULL;

-- ÃƒÆ’Ã‚Ândice para buscar lembretes por conversa
CREATE INDEX IF NOT EXISTS idx_conversation_reminders_conversation ON conversation_reminders(conversation_id);

-- ComentÃƒÆ’Ã‚Â¡rios para documentaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
COMMENT ON TABLE conversation_reminders IS 'Lembretes automÃƒÆ’Ã‚Â¡ticos para follow-up de orÃƒÆ’Ã‚Â§amentos, pagamentos pendentes e datas prometidas';
COMMENT ON COLUMN conversation_reminders.reminder_type IS 'Tipo de lembrete: quote_followup (orÃƒÆ’Ã‚Â§amento sem resposta), payment_pending (pagamento pendente), promised_date (data prometida ao cliente)';
COMMENT ON COLUMN conversation_reminders.scheduled_for IS 'Data/hora agendada para envio do lembrete';
COMMENT ON COLUMN conversation_reminders.sent_at IS 'Data/hora em que o lembrete foi enviado (NULL = pendente)';
COMMENT ON COLUMN conversation_reminders.is_active IS 'Se false, o lembrete foi cancelado e nÃƒÆ’Ã‚Â£o serÃƒÆ’Ã‚Â¡ enviado';
