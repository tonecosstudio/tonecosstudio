-- =====================================================
-- ORDER STATUS NOTIFICATION TRIGGER
-- =====================================================
-- Criado em: 21 de Fevereiro de 2026
-- Descrição: Trigger para notificação automática de mudança de status de pedidos
-- Requisitos: 6.1, 6.2, 6.3, 6.5, 6.6
-- =====================================================

-- =====================================================
-- 1. ADICIONAR CAMPOS ÀS TABELAS
-- =====================================================

-- Adicionar campo tracking_code à manual_payments
ALTER TABLE manual_payments 
ADD COLUMN IF NOT EXISTS tracking_code TEXT;

-- Adicionar campo sender_type à support_messages
-- Valores: 'admin', 'customer', 'system'
ALTER TABLE support_messages 
ADD COLUMN IF NOT EXISTS sender_type TEXT NOT NULL DEFAULT 'customer' 
CHECK (sender_type IN ('admin', 'customer', 'system'));

-- Adicionar campo order_id para vincular conversas a pedidos
ALTER TABLE support_conversations 
ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES manual_payments(id) ON DELETE SET NULL;

-- Adicionar campo tag (singular) para categorização simples
-- Nota: A tabela já tem tags (array), mas para MVP inicial usamos tag singular
ALTER TABLE support_conversations 
ADD COLUMN IF NOT EXISTS tag TEXT CHECK (tag IN ('pedido', 'orcamento', 'duvida', 'reclamacao', 'assinatura', 'urgente'));

-- Criar índice para order_id
CREATE INDEX IF NOT EXISTS idx_support_conversations_order ON support_conversations(order_id);

-- =====================================================
-- 2. FUNÇÃO DE NOTIFICAÇÃO DE MUDANÇA DE STATUS
-- =====================================================

CREATE OR REPLACE FUNCTION notify_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation_id UUID;
  v_template TEXT;
  v_message TEXT;
BEGIN
  -- Apenas processa se status mudou
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Busca ou cria conversa para este pedido
  SELECT id INTO v_conversation_id
  FROM support_conversations
  WHERE order_id = NEW.id;
  
  IF v_conversation_id IS NULL THEN
    INSERT INTO support_conversations (user_id, subject, status, tag, order_id)
    VALUES (NEW.user_id, 'Pedido ' || NEW.reference_number, 'waiting_customer', 'pedido', NEW.id)
    RETURNING id INTO v_conversation_id;
  END IF;
  
  -- Busca template de mensagem
  SELECT message_template INTO v_template
  FROM order_status_templates
  WHERE status = NEW.status AND is_active = true;
  
  IF v_template IS NOT NULL THEN
    -- Substitui variáveis no template
    v_message := replace(v_template, '{order_number}', NEW.reference_number);
    v_message := replace(v_message, '{amount}', NEW.amount::TEXT);
    v_message := replace(v_message, '{tracking_code}', COALESCE(NEW.tracking_code, 'Em breve'));
    
    -- Insere mensagem automática
    -- Nota: sender_id é o user_id do pedido, sender_type é 'system'
    INSERT INTO support_messages (conversation_id, sender_id, sender_type, message)
    VALUES (v_conversation_id, NEW.user_id, 'system', v_message);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. CRIAR TRIGGER
-- =====================================================

CREATE TRIGGER trigger_notify_order_status_change
  AFTER UPDATE ON manual_payments
  FOR EACH ROW
  EXECUTE FUNCTION notify_order_status_change();

-- =====================================================
-- 4. COMENTÁRIOS
-- =====================================================

COMMENT ON FUNCTION notify_order_status_change() IS 'Função que cria mensagem automática na conversa quando status do pedido muda';
COMMENT ON COLUMN manual_payments.tracking_code IS 'Código de rastreamento do pedido (para status enviado/entregue)';
COMMENT ON COLUMN support_messages.sender_type IS 'Tipo do remetente: admin | customer | system (mensagens automáticas)';
COMMENT ON COLUMN support_conversations.order_id IS 'Vincula conversa a um pedido (manual_payment)';
COMMENT ON COLUMN support_conversations.tag IS 'Tag singular para categorização simples (pedido, orcamento, duvida, reclamacao, assinatura, urgente)';

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================
