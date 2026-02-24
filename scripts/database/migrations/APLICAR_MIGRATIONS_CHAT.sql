-- =====================================================
-- MIGRATIONS DO SISTEMA DE CHAT AVANÇADO
-- Execute este arquivo no Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. Update support_conversations
-- =====================================================

ALTER TABLE support_conversations 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

ALTER TABLE support_conversations 
ADD COLUMN IF NOT EXISTS risk_flags TEXT[] DEFAULT '{}';

ALTER TABLE support_conversations 
ADD COLUMN IF NOT EXISTS promised_date TIMESTAMPTZ;

ALTER TABLE support_conversations 
ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL;

ALTER TABLE support_conversations 
ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_support_conversations_tags 
ON support_conversations USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_support_conversations_risk_flags 
ON support_conversations USING GIN(risk_flags);

CREATE INDEX IF NOT EXISTS idx_support_conversations_promised_date 
ON support_conversations(promised_date) 
WHERE promised_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_support_conversations_quote 
ON support_conversations(quote_id);

CREATE INDEX IF NOT EXISTS idx_support_conversations_subscription 
ON support_conversations(subscription_id);

COMMENT ON COLUMN support_conversations.tags IS 'Array de tags para categorização múltipla';
COMMENT ON COLUMN support_conversations.risk_flags IS 'Array de flags de risco';
COMMENT ON COLUMN support_conversations.promised_date IS 'Data prometida ao cliente';

-- =====================================================
-- 2. Update support_messages
-- =====================================================

ALTER TABLE support_messages 
ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE support_messages 
ADD COLUMN IF NOT EXISTS read_by_admin BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE support_messages 
ADD COLUMN IF NOT EXISTS read_by_customer BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE support_messages 
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

ALTER TABLE support_messages 
ADD COLUMN IF NOT EXISTS sender_type TEXT NOT NULL DEFAULT 'customer' 
CHECK (sender_type IN ('admin', 'customer', 'system'));

CREATE INDEX IF NOT EXISTS idx_support_messages_unread_admin 
ON support_messages(conversation_id) 
WHERE is_internal = false AND read_by_admin = false;

CREATE INDEX IF NOT EXISTS idx_support_messages_unread_customer 
ON support_messages(conversation_id) 
WHERE is_internal = false AND read_by_customer = false;

-- =====================================================
-- 3. Create support_attachments
-- =====================================================

CREATE TABLE IF NOT EXISTS support_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES support_messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  thumbnail_path TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_attachments_message 
ON support_attachments(message_id);

CREATE INDEX IF NOT EXISTS idx_support_attachments_uploaded_by 
ON support_attachments(uploaded_by);

-- =====================================================
-- 4. Create order_production_stages
-- =====================================================

CREATE TABLE IF NOT EXISTS order_production_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES manual_payments(id) ON DELETE CASCADE,
  stage TEXT NOT NULL CHECK (stage IN ('molde_pronto', 'impressao_iniciada', 'pintura_iniciada', 'finalizacao')),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_production_stages_order 
ON order_production_stages(order_id, created_at DESC);

-- =====================================================
-- 5. Create conversation triggers
-- =====================================================

CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE support_conversations
  SET 
    last_message_at = NEW.created_at,
    status = CASE
      WHEN NEW.sender_type = 'customer' THEN 'waiting_admin'
      WHEN NEW.sender_type = 'admin' THEN 'waiting_customer'
      ELSE status
    END,
    updated_at = now()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON support_messages;

CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON support_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

CREATE OR REPLACE FUNCTION mark_first_admin_response()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation_user_id UUID;
BEGIN
  IF NEW.sender_type != 'admin' THEN
    RETURN NEW;
  END IF;
  
  SELECT user_id INTO v_conversation_user_id
  FROM support_conversations
  WHERE id = NEW.conversation_id;
  
  IF NEW.sender_id != v_conversation_user_id THEN
    UPDATE support_conversations
    SET first_response_at = NEW.created_at
    WHERE id = NEW.conversation_id
      AND first_response_at IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_mark_first_admin_response ON support_messages;

CREATE TRIGGER trigger_mark_first_admin_response
  AFTER INSERT ON support_messages
  FOR EACH ROW
  EXECUTE FUNCTION mark_first_admin_response();

-- =====================================================
-- FIM DAS MIGRATIONS
-- =====================================================

SELECT 'Migrations aplicadas com sucesso!' as status;
