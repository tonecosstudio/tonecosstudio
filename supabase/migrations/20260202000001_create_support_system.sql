-- =====================================================
-- SUPPORT SYSTEM - Sistema de Suporte com Chat AssÃƒÆ’Ã‚Â­ncrono
-- =====================================================
-- Criado em: 02 de Fevereiro de 2026
-- DescriÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o: Sistema de suporte com chat assÃƒÆ’Ã‚Â­ncrono (prazo de 48h)
-- =====================================================

-- =====================================================
-- 0. FUNÃƒÆ’Ã¢â‚¬Â¡ÃƒÆ’Ã†â€™O AUXILIAR - update_updated_at_column
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 1. SUPPORT_CONVERSATIONS - Conversas de Suporte
-- =====================================================
CREATE TABLE IF NOT EXISTS support_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- InformaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes da conversa
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'waiting_admin', 'waiting_customer', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- AtribuiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  
  -- Datas importantes
  first_response_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  
  -- Metadados
  tags TEXT[] DEFAULT '{}',
  internal_notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ÃƒÆ’Ã‚Ândices para performance
CREATE INDEX IF NOT EXISTS idx_support_conversations_user ON support_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_support_conversations_status ON support_conversations(status);
CREATE INDEX IF NOT EXISTS idx_support_conversations_assigned ON support_conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_conversations_last_message ON support_conversations(last_message_at DESC);

-- Trigger para updated_at
CREATE TRIGGER update_support_conversations_updated_at
  BEFORE UPDATE ON support_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. SUPPORT_MESSAGES - Mensagens do Chat
-- =====================================================
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- ConteÃƒÆ’Ã‚Âºdo
  message TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false, -- Nota interna (sÃƒÆ’Ã‚Â³ admin vÃƒÆ’Ã‚Âª)
  
  -- Anexos
  attachments TEXT[] DEFAULT '{}',
  
  -- Metadados
  read_by_customer BOOLEAN NOT NULL DEFAULT false,
  read_by_admin BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ÃƒÆ’Ã‚Ândices para performance
CREATE INDEX IF NOT EXISTS idx_support_messages_conversation ON support_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_support_messages_sender ON support_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_unread_customer ON support_messages(conversation_id) 
  WHERE is_internal = false AND read_by_customer = false;
CREATE INDEX IF NOT EXISTS idx_support_messages_unread_admin ON support_messages(conversation_id) 
  WHERE is_internal = false AND read_by_admin = false;

-- =====================================================
-- 3. SUPPORT_QUICK_REPLIES - Respostas RÃƒÆ’Ã‚Â¡pidas
-- =====================================================
CREATE TABLE IF NOT EXISTS support_quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- IdentificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
  title TEXT NOT NULL,
  shortcut TEXT UNIQUE, -- Ex: 'Ctrl+1', 'Ctrl+2'
  category TEXT NOT NULL DEFAULT 'geral' CHECK (category IN ('geral', 'pedidos', 'pagamentos', 'producao', 'envio')),
  
  -- ConteÃƒÆ’Ã‚Âºdo
  message TEXT NOT NULL,
  description TEXT,
  
  -- Controle
  is_active BOOLEAN NOT NULL DEFAULT true,
  usage_count INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ÃƒÆ’Ã‚Ândices para performance
CREATE INDEX IF NOT EXISTS idx_support_quick_replies_active ON support_quick_replies(is_active);
CREATE INDEX IF NOT EXISTS idx_support_quick_replies_category ON support_quick_replies(category);
CREATE INDEX IF NOT EXISTS idx_support_quick_replies_shortcut ON support_quick_replies(shortcut) WHERE shortcut IS NOT NULL;

-- Trigger para updated_at
CREATE TRIGGER update_support_quick_replies_updated_at
  BEFORE UPDATE ON support_quick_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. RLS POLICIES - SeguranÃƒÆ’Ã‚Â§a
-- =====================================================

-- Support Conversations: Cliente vÃƒÆ’Ã‚Âª apenas suas conversas
ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "UsuÃƒÆ’Ã‚Â¡rios veem suas prÃƒÆ’Ã‚Â³prias conversas"
  ON support_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "UsuÃƒÆ’Ã‚Â¡rios podem criar conversas"
  ON support_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins veem todas as conversas"
  ON support_conversations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Support Messages: Cliente vÃƒÆ’Ã‚Âª mensagens de suas conversas (exceto internas)
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "UsuÃƒÆ’Ã‚Â¡rios veem mensagens de suas conversas"
  ON support_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_conversations
      WHERE support_conversations.id = support_messages.conversation_id
      AND support_conversations.user_id = auth.uid()
    )
    AND is_internal = false
  );

CREATE POLICY "UsuÃƒÆ’Ã‚Â¡rios podem enviar mensagens em suas conversas"
  ON support_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_conversations
      WHERE support_conversations.id = support_messages.conversation_id
      AND support_conversations.user_id = auth.uid()
    )
    AND auth.uid() = sender_id
    AND is_internal = false
  );

CREATE POLICY "Admins veem todas as mensagens"
  ON support_messages FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem enviar mensagens"
  ON support_messages FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = sender_id);

CREATE POLICY "Admins podem atualizar mensagens"
  ON support_messages FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Support Quick Replies: Apenas admins
ALTER TABLE support_quick_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar respostas rÃƒÆ’Ã‚Â¡pidas"
  ON support_quick_replies FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- 5. FUNÃƒÆ’Ã¢â‚¬Â¡ÃƒÆ’Ã¢â‚¬Â¢ES AUXILIARES
-- =====================================================

-- FunÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o para atualizar last_message_at na conversa
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE support_conversations
  SET 
    last_message_at = NEW.created_at,
    status = CASE
      WHEN NEW.sender_id IN (SELECT user_id FROM support_conversations WHERE id = NEW.conversation_id)
      THEN 'waiting_admin'
      ELSE 'waiting_customer'
    END
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON support_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- FunÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o para marcar primeira resposta do admin
CREATE OR REPLACE FUNCTION mark_first_admin_response()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_conversation_user_id UUID;
BEGIN
  -- Verifica se sender ÃƒÆ’Ã‚Â© admin
  SELECT has_role(NEW.sender_id, 'admin'::app_role) INTO v_is_admin;
  
  -- Busca user_id da conversa
  SELECT user_id INTO v_conversation_user_id
  FROM support_conversations
  WHERE id = NEW.conversation_id;
  
  -- Se ÃƒÆ’Ã‚Â© admin e nÃƒÆ’Ã‚Â£o ÃƒÆ’Ã‚Â© o dono da conversa
  IF v_is_admin AND NEW.sender_id != v_conversation_user_id THEN
    UPDATE support_conversations
    SET first_response_at = NEW.created_at
    WHERE id = NEW.conversation_id
      AND first_response_at IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_mark_first_admin_response
  AFTER INSERT ON support_messages
  FOR EACH ROW
  EXECUTE FUNCTION mark_first_admin_response();

-- FunÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o para incrementar contador de uso de resposta rÃƒÆ’Ã‚Â¡pida
CREATE OR REPLACE FUNCTION increment_quick_reply_usage(
  p_quick_reply_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE support_quick_replies
  SET usage_count = usage_count + 1
  WHERE id = p_quick_reply_id;
END;
$$;

-- =====================================================
-- 6. DADOS INICIAIS - Respostas RÃƒÆ’Ã‚Â¡pidas
-- =====================================================

-- Resposta para Cliente Antigo na Ordax
INSERT INTO support_quick_replies (title, shortcut, category, message, description) VALUES
(
  'Cliente Antigo - Resposta Neutra',
  'Ctrl+1',
  'pedidos',
  'OlÃƒÆ’Ã‚Â¡ [Nome], recebemos sua mensagem. Todos os contatos e pedidos antigos estÃƒÆ’Ã‚Â£o sendo analisados internamente. No momento, nÃƒÆ’Ã‚Â£o podemos abrir novos compromissos nem informar prazos de entregas passadas. Agradecemos sua compreensÃƒÆ’Ã‚Â£o e paciÃƒÆ’Ã‚Âªncia enquanto registramos sua situaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o.',
  'Mensagem neutra e defensiva para clientes antigos'
);

-- Resposta para ReclamaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o PÃƒÆ’Ã‚Âºblica
INSERT INTO support_quick_replies (title, shortcut, category, message, description) VALUES
(
  'Resposta PÃƒÆ’Ã‚Âºblica - ReclamaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o',
  'Ctrl+2',
  'geral',
  'OlÃƒÆ’Ã‚Â¡, registramos seu contato e situaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o para anÃƒÆ’Ã‚Â¡lise interna. Estamos trabalhando na organizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o das produÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes e agradecemos sua compreensÃƒÆ’Ã‚Â£o.',
  'Resposta padrÃƒÆ’Ã‚Â£o para reclamaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes pÃƒÆ’Ã‚Âºblicas em feed/comentÃƒÆ’Ã‚Â¡rios'
);

-- ConfirmaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de Recebimento
INSERT INTO support_quick_replies (title, shortcut, category, message, description) VALUES
(
  'ConfirmaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de Recebimento',
  'Ctrl+3',
  'geral',
  'OlÃƒÆ’Ã‚Â¡! Recebemos sua mensagem e vamos analisar sua solicitaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o. Nossa equipe retornarÃƒÆ’Ã‚Â¡ em atÃƒÆ’Ã‚Â© 48 horas ÃƒÆ’Ã‚Âºteis. Agradecemos sua paciÃƒÆ’Ã‚Âªncia!',
  'ConfirmaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o automÃƒÆ’Ã‚Â¡tica de recebimento de mensagem'
);

-- Status de ProduÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
INSERT INTO support_quick_replies (title, shortcut, category, message, description) VALUES
(
  'Status de ProduÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o',
  'Ctrl+4',
  'producao',
  'OlÃƒÆ’Ã‚Â¡! Seu pedido estÃƒÆ’Ã‚Â¡ em produÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o. VocÃƒÆ’Ã‚Âª pode acompanhar o progresso na ÃƒÆ’Ã‚Â¡rea "Meus Pedidos" da plataforma. Enviaremos atualizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes por email conforme avanÃƒÆ’Ã‚Â§amos nas etapas.',
  'Informar status de produÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o ao cliente'
);

-- Rastreamento de Envio
INSERT INTO support_quick_replies (title, shortcut, category, message, description) VALUES
(
  'Rastreamento de Envio',
  'Ctrl+5',
  'envio',
  'OlÃƒÆ’Ã‚Â¡! Seu pedido foi enviado. CÃƒÆ’Ã‚Â³digo de rastreamento: [CÃƒÆ’Ã¢â‚¬Å“DIGO]. VocÃƒÆ’Ã‚Âª pode acompanhar a entrega em: [LINK]. Prazo estimado: [PRAZO] dias ÃƒÆ’Ã‚Âºteis.',
  'Informar cÃƒÆ’Ã‚Â³digo de rastreamento ao cliente'
);

-- DÃƒÆ’Ã‚Âºvida sobre Pagamento
INSERT INTO support_quick_replies (title, shortcut, category, message, description) VALUES
(
  'DÃƒÆ’Ã‚Âºvida sobre Pagamento',
  'Ctrl+6',
  'pagamentos',
  'OlÃƒÆ’Ã‚Â¡! Para questÃƒÆ’Ã‚Âµes sobre pagamento, por favor nos informe: 1) MÃƒÆ’Ã‚Â©todo de pagamento utilizado, 2) Data do pagamento, 3) Valor pago. Com essas informaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes poderemos verificar e ajudar vocÃƒÆ’Ã‚Âª.',
  'Solicitar informaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes sobre pagamento'
);

-- PolÃƒÆ’Ã‚Â­tica de Cancelamento
INSERT INTO support_quick_replies (title, shortcut, category, message, description) VALUES
(
  'PolÃƒÆ’Ã‚Â­tica de Cancelamento',
  NULL,
  'pedidos',
  'Nossa polÃƒÆ’Ã‚Â­tica de cancelamento permite cancelar pedidos que ainda nÃƒÆ’Ã‚Â£o entraram em produÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o. Pedidos em produÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o ou jÃƒÆ’Ã‚Â¡ enviados nÃƒÆ’Ã‚Â£o podem ser cancelados, mas vocÃƒÆ’Ã‚Âª pode solicitar devoluÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o apÃƒÆ’Ã‚Â³s recebimento. Deseja prosseguir com o cancelamento?',
  'Explicar polÃƒÆ’Ã‚Â­tica de cancelamento'
);

-- Troca de Personagem
INSERT INTO support_quick_replies (title, shortcut, category, message, description) VALUES
(
  'Troca de Personagem',
  NULL,
  'pedidos',
  'VocÃƒÆ’Ã‚Âª pode solicitar troca de personagem antes do inÃƒÆ’Ã‚Â­cio da produÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o. ApÃƒÆ’Ã‚Â³s iniciada a produÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o, a troca nÃƒÆ’Ã‚Â£o ÃƒÆ’Ã‚Â© mais possÃƒÆ’Ã‚Â­vel. Qual personagem vocÃƒÆ’Ã‚Âª gostaria de receber no lugar?',
  'Informar sobre possibilidade de troca'
);

-- =====================================================
-- COMENTÃƒÆ’Ã‚ÂRIOS FINAIS
-- =====================================================

COMMENT ON TABLE support_conversations IS 'Conversas de suporte entre clientes e admins';
COMMENT ON TABLE support_messages IS 'Mensagens individuais de cada conversa';
COMMENT ON TABLE support_quick_replies IS 'Respostas rÃƒÆ’Ã‚Â¡pidas prÃƒÆ’Ã‚Â©-configuradas para admins';

COMMENT ON COLUMN support_conversations.status IS 'new: nova conversa | waiting_admin: aguardando resposta admin | waiting_customer: aguardando resposta cliente | resolved: resolvida | closed: fechada';
COMMENT ON COLUMN support_messages.is_internal IS 'Notas internas visÃƒÆ’Ã‚Â­veis apenas para admins';
COMMENT ON COLUMN support_quick_replies.shortcut IS 'Atalho de teclado (ex: Ctrl+1, Ctrl+2)';
