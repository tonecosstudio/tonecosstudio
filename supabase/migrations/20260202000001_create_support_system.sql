-- =====================================================
-- SUPPORT SYSTEM - Sistema de Suporte com Chat Assíncrono
-- =====================================================
-- Criado em: 02 de Fevereiro de 2026
-- Descrição: Sistema de suporte com chat assíncrono (prazo de 48h)
-- =====================================================

-- =====================================================
-- 0. FUNÇÃO AUXILIAR - update_updated_at_column
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
  
  -- Informações da conversa
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'waiting_admin', 'waiting_customer', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Atribuição
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

-- Índices para performance
CREATE INDEX idx_support_conversations_user ON support_conversations(user_id);
CREATE INDEX idx_support_conversations_status ON support_conversations(status);
CREATE INDEX idx_support_conversations_assigned ON support_conversations(assigned_to);
CREATE INDEX idx_support_conversations_last_message ON support_conversations(last_message_at DESC);

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
  
  -- Conteúdo
  message TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false, -- Nota interna (só admin vê)
  
  -- Anexos
  attachments TEXT[] DEFAULT '{}',
  
  -- Metadados
  read_by_customer BOOLEAN NOT NULL DEFAULT false,
  read_by_admin BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_support_messages_conversation ON support_messages(conversation_id, created_at);
CREATE INDEX idx_support_messages_sender ON support_messages(sender_id);
CREATE INDEX idx_support_messages_unread_customer ON support_messages(conversation_id) 
  WHERE is_internal = false AND read_by_customer = false;
CREATE INDEX idx_support_messages_unread_admin ON support_messages(conversation_id) 
  WHERE is_internal = false AND read_by_admin = false;

-- =====================================================
-- 3. SUPPORT_QUICK_REPLIES - Respostas Rápidas
-- =====================================================
CREATE TABLE IF NOT EXISTS support_quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação
  title TEXT NOT NULL,
  shortcut TEXT UNIQUE, -- Ex: 'Ctrl+1', 'Ctrl+2'
  category TEXT NOT NULL DEFAULT 'geral' CHECK (category IN ('geral', 'pedidos', 'pagamentos', 'producao', 'envio')),
  
  -- Conteúdo
  message TEXT NOT NULL,
  description TEXT,
  
  -- Controle
  is_active BOOLEAN NOT NULL DEFAULT true,
  usage_count INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_support_quick_replies_active ON support_quick_replies(is_active);
CREATE INDEX idx_support_quick_replies_category ON support_quick_replies(category);
CREATE INDEX idx_support_quick_replies_shortcut ON support_quick_replies(shortcut) WHERE shortcut IS NOT NULL;

-- Trigger para updated_at
CREATE TRIGGER update_support_quick_replies_updated_at
  BEFORE UPDATE ON support_quick_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. RLS POLICIES - Segurança
-- =====================================================

-- Support Conversations: Cliente vê apenas suas conversas
ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem suas próprias conversas"
  ON support_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar conversas"
  ON support_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins veem todas as conversas"
  ON support_conversations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Support Messages: Cliente vê mensagens de suas conversas (exceto internas)
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem mensagens de suas conversas"
  ON support_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_conversations
      WHERE support_conversations.id = support_messages.conversation_id
      AND support_conversations.user_id = auth.uid()
    )
    AND is_internal = false
  );

CREATE POLICY "Usuários podem enviar mensagens em suas conversas"
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

CREATE POLICY "Admins podem gerenciar respostas rápidas"
  ON support_quick_replies FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- 5. FUNÇÕES AUXILIARES
-- =====================================================

-- Função para atualizar last_message_at na conversa
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

-- Função para marcar primeira resposta do admin
CREATE OR REPLACE FUNCTION mark_first_admin_response()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_conversation_user_id UUID;
BEGIN
  -- Verifica se sender é admin
  SELECT has_role(NEW.sender_id, 'admin'::app_role) INTO v_is_admin;
  
  -- Busca user_id da conversa
  SELECT user_id INTO v_conversation_user_id
  FROM support_conversations
  WHERE id = NEW.conversation_id;
  
  -- Se é admin e não é o dono da conversa
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

-- Função para incrementar contador de uso de resposta rápida
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
-- 6. DADOS INICIAIS - Respostas Rápidas
-- =====================================================

-- Resposta para Cliente Antigo na Ordax
INSERT INTO support_quick_replies (title, shortcut, category, message, description) VALUES
(
  'Cliente Antigo - Resposta Neutra',
  'Ctrl+1',
  'pedidos',
  'Olá [Nome], recebemos sua mensagem. Todos os contatos e pedidos antigos estão sendo analisados internamente. No momento, não podemos abrir novos compromissos nem informar prazos de entregas passadas. Agradecemos sua compreensão e paciência enquanto registramos sua situação.',
  'Mensagem neutra e defensiva para clientes antigos'
);

-- Resposta para Reclamação Pública
INSERT INTO support_quick_replies (title, shortcut, category, message, description) VALUES
(
  'Resposta Pública - Reclamação',
  'Ctrl+2',
  'geral',
  'Olá, registramos seu contato e situação para análise interna. Estamos trabalhando na organização das produções e agradecemos sua compreensão.',
  'Resposta padrão para reclamações públicas em feed/comentários'
);

-- Confirmação de Recebimento
INSERT INTO support_quick_replies (title, shortcut, category, message, description) VALUES
(
  'Confirmação de Recebimento',
  'Ctrl+3',
  'geral',
  'Olá! Recebemos sua mensagem e vamos analisar sua solicitação. Nossa equipe retornará em até 48 horas úteis. Agradecemos sua paciência!',
  'Confirmação automática de recebimento de mensagem'
);

-- Status de Produção
INSERT INTO support_quick_replies (title, shortcut, category, message, description) VALUES
(
  'Status de Produção',
  'Ctrl+4',
  'producao',
  'Olá! Seu pedido está em produção. Você pode acompanhar o progresso na área "Meus Pedidos" da plataforma. Enviaremos atualizações por email conforme avançamos nas etapas.',
  'Informar status de produção ao cliente'
);

-- Rastreamento de Envio
INSERT INTO support_quick_replies (title, shortcut, category, message, description) VALUES
(
  'Rastreamento de Envio',
  'Ctrl+5',
  'envio',
  'Olá! Seu pedido foi enviado. Código de rastreamento: [CÓDIGO]. Você pode acompanhar a entrega em: [LINK]. Prazo estimado: [PRAZO] dias úteis.',
  'Informar código de rastreamento ao cliente'
);

-- Dúvida sobre Pagamento
INSERT INTO support_quick_replies (title, shortcut, category, message, description) VALUES
(
  'Dúvida sobre Pagamento',
  'Ctrl+6',
  'pagamentos',
  'Olá! Para questões sobre pagamento, por favor nos informe: 1) Método de pagamento utilizado, 2) Data do pagamento, 3) Valor pago. Com essas informações poderemos verificar e ajudar você.',
  'Solicitar informações sobre pagamento'
);

-- Política de Cancelamento
INSERT INTO support_quick_replies (title, shortcut, category, message, description) VALUES
(
  'Política de Cancelamento',
  NULL,
  'pedidos',
  'Nossa política de cancelamento permite cancelar pedidos que ainda não entraram em produção. Pedidos em produção ou já enviados não podem ser cancelados, mas você pode solicitar devolução após recebimento. Deseja prosseguir com o cancelamento?',
  'Explicar política de cancelamento'
);

-- Troca de Personagem
INSERT INTO support_quick_replies (title, shortcut, category, message, description) VALUES
(
  'Troca de Personagem',
  NULL,
  'pedidos',
  'Você pode solicitar troca de personagem antes do início da produção. Após iniciada a produção, a troca não é mais possível. Qual personagem você gostaria de receber no lugar?',
  'Informar sobre possibilidade de troca'
);

-- =====================================================
-- COMENTÁRIOS FINAIS
-- =====================================================

COMMENT ON TABLE support_conversations IS 'Conversas de suporte entre clientes e admins';
COMMENT ON TABLE support_messages IS 'Mensagens individuais de cada conversa';
COMMENT ON TABLE support_quick_replies IS 'Respostas rápidas pré-configuradas para admins';

COMMENT ON COLUMN support_conversations.status IS 'new: nova conversa | waiting_admin: aguardando resposta admin | waiting_customer: aguardando resposta cliente | resolved: resolvida | closed: fechada';
COMMENT ON COLUMN support_messages.is_internal IS 'Notas internas visíveis apenas para admins';
COMMENT ON COLUMN support_quick_replies.shortcut IS 'Atalho de teclado (ex: Ctrl+1, Ctrl+2)';
