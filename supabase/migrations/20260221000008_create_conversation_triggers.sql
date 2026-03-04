-- =====================================================
-- Migration: Create conversation update triggers
-- Description: Triggers to automatically update conversation metadata
-- =====================================================

-- =====================================================
-- Trigger 1: Update last_message_at and status
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
      ELSE status -- MantÃƒÂ©m status atual para mensagens system
    END,
    updated_at = now()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON support_messages;

CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON support_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- =====================================================
-- Trigger 2: Mark first admin response time
-- =====================================================

CREATE OR REPLACE FUNCTION mark_first_admin_response()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation_user_id UUID;
BEGIN
  -- Apenas processa se ÃƒÂ© mensagem de admin (nÃƒÂ£o system)
  IF NEW.sender_type != 'admin' THEN
    RETURN NEW;
  END IF;
  
  -- Busca user_id da conversa
  SELECT user_id INTO v_conversation_user_id
  FROM support_conversations
  WHERE id = NEW.conversation_id;
  
  -- Se ÃƒÂ© admin e nÃƒÂ£o ÃƒÂ© o dono da conversa, marca first_response_at
  IF NEW.sender_id != v_conversation_user_id THEN
    UPDATE support_conversations
    SET first_response_at = NEW.created_at
    WHERE id = NEW.conversation_id
      AND first_response_at IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_mark_first_admin_response ON support_messages;

CREATE TRIGGER trigger_mark_first_admin_response
  AFTER INSERT ON support_messages
  FOR EACH ROW
  EXECUTE FUNCTION mark_first_admin_response();

-- Add comments
COMMENT ON FUNCTION update_conversation_last_message() IS 'Atualiza last_message_at e status da conversa quando nova mensagem ÃƒÂ© inserida';
COMMENT ON FUNCTION mark_first_admin_response() IS 'Marca first_response_at quando admin responde pela primeira vez';
