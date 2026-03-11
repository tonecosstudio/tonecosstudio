-- =====================================================
-- Migration: Create Quick Replies Table
-- Description: Tabela para respostas rápidas do sistema de suporte
-- =====================================================

-- =====================================================
-- QUICK_REPLIES (Respostas rápidas)
-- =====================================================
CREATE TABLE quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT DEFAULT 'geral' NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  shortcut TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  display_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices para performance
CREATE INDEX idx_quick_replies_category ON quick_replies(category);
CREATE INDEX idx_quick_replies_is_active ON quick_replies(is_active);
CREATE INDEX idx_quick_replies_display_order ON quick_replies(display_order);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE quick_replies ENABLE ROW LEVEL SECURITY;

-- Todos podem ler respostas ativas
CREATE POLICY "quick_replies_select_active"
  ON quick_replies FOR SELECT
  USING (is_active = true);

-- Admins podem ver todas
CREATE POLICY "quick_replies_select_admin"
  ON quick_replies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Apenas admins podem modificar
CREATE POLICY "quick_replies_modify_admin"
  ON quick_replies FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- TRIGGER
-- =====================================================

CREATE TRIGGER set_updated_at_quick_replies
  BEFORE UPDATE ON quick_replies
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- DADOS INICIAIS
-- =====================================================

INSERT INTO quick_replies (category, title, message, shortcut, display_order) VALUES
  ('saudacao', 'Boas-vindas', 'Olá! Bem-vindo ao suporte da Ordax. Como posso ajudá-lo hoje?', 'Ctrl+1', 1),
  ('saudacao', 'Bom dia', 'Bom dia! Estou aqui para ajudá-lo. Em que posso ser útil?', 'Ctrl+2', 2),
  ('pedido', 'Status do Pedido', 'Vou verificar o status do seu pedido. Por favor, me informe o número do pedido.', 'Ctrl+3', 3),
  ('pedido', 'Prazo de Entrega', 'O prazo de entrega padrão é de 30-45 dias após a confirmação do pagamento.', 'Ctrl+4', 4),
  ('pagamento', 'Formas de Pagamento', 'Aceitamos pagamento via PIX, transferência bancária e cartão de crédito.', 'Ctrl+5', 5),
  ('pagamento', 'Confirmar Pagamento', 'Recebi a confirmação do seu pagamento. Seu pedido será processado em breve.', 'Ctrl+6', 6),
  ('tecnico', 'Problema Técnico', 'Entendo que está enfrentando um problema técnico. Vou encaminhar para nossa equipe especializada.', 'Ctrl+7', 7),
  ('despedida', 'Encerramento', 'Foi um prazer ajudá-lo! Se precisar de mais alguma coisa, estamos à disposição.', 'Ctrl+8', 8),
  ('despedida', 'Até logo', 'Até logo! Tenha um ótimo dia!', 'Ctrl+9', 9);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE quick_replies IS 'Respostas rápidas para o sistema de suporte';
COMMENT ON COLUMN quick_replies.category IS 'Categoria da resposta (saudacao, pedido, pagamento, tecnico, despedida)';
COMMENT ON COLUMN quick_replies.shortcut IS 'Atalho de teclado para ativar a resposta (ex: Ctrl+1)';
COMMENT ON COLUMN quick_replies.display_order IS 'Ordem de exibição das respostas';

-- Recarregar schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
