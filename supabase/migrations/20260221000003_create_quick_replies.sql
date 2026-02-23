-- Migration: Create quick_replies table
-- Description: Table for storing quick reply templates for support chat
-- Requirements: 10.1

CREATE TABLE quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_quick_replies_category ON quick_replies(category);
CREATE INDEX idx_quick_replies_active ON quick_replies(is_active);
CREATE INDEX idx_quick_replies_order ON quick_replies(display_order);

-- Enable Row Level Security
ALTER TABLE quick_replies ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do everything
CREATE POLICY "Admins can manage quick replies"
  ON quick_replies
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy: All authenticated users can read active quick replies
CREATE POLICY "Authenticated users can read active quick replies"
  ON quick_replies
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND is_active = true
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_quick_replies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_quick_replies_updated_at
  BEFORE UPDATE ON quick_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_quick_replies_updated_at();

-- Insert some default quick replies (created_by will be NULL for seed data)
INSERT INTO quick_replies (category, title, message, display_order) VALUES
  ('saudacao', 'Boas-vindas', 'Olá! Bem-vindo ao suporte da Ordax. Como posso ajudá-lo hoje?', 1),
  ('pedido', 'Status do pedido', 'Vou verificar o status do seu pedido agora mesmo. Um momento, por favor.', 2),
  ('pedido', 'Pedido em produção', 'Seu pedido está em produção! Estamos trabalhando com muito carinho na sua peça. Em breve enviaremos o código de rastreamento.', 3),
  ('pagamento', 'Confirmar pagamento', 'Recebi a confirmação do seu pagamento! Seu pedido já está sendo processado.', 4),
  ('pagamento', 'Aguardando pagamento', 'Ainda não identificamos o pagamento do seu pedido. Você pode enviar o comprovante para agilizarmos?', 5),
  ('rastreamento', 'Código de rastreamento', 'Seu pedido foi enviado! O código de rastreamento é: [INSERIR CÓDIGO]. Você pode acompanhar em: https://rastreamento.correios.com.br', 6),
  ('orcamento', 'Orçamento enviado', 'Enviei o orçamento para o seu email! Qualquer dúvida, estou à disposição.', 7),
  ('orcamento', 'Aguardando aprovação', 'Você já teve a chance de revisar o orçamento que enviei? Posso esclarecer alguma dúvida?', 8),
  ('duvida', 'Prazo de entrega', 'O prazo de produção é de 15 a 20 dias úteis após a confirmação do pagamento. Após o envio, o prazo dos Correios varia de acordo com sua região.', 9),
  ('duvida', 'Formas de pagamento', 'Aceitamos PIX (5% de desconto), cartão de crédito e boleto bancário. Qual forma você prefere?', 10),
  ('despedida', 'Encerramento', 'Fico feliz em ter ajudado! Se precisar de mais alguma coisa, é só chamar. Tenha um ótimo dia! 😊', 11),
  ('despedida', 'Agradecimento', 'Muito obrigado pela sua compra! Esperamos que você adore sua peça. Qualquer coisa, estamos aqui!', 12);

COMMENT ON TABLE quick_replies IS 'Stores quick reply templates for support chat system';
COMMENT ON COLUMN quick_replies.category IS 'Category for organizing quick replies (e.g., saudacao, pedido, pagamento, orcamento, duvida, despedida)';
COMMENT ON COLUMN quick_replies.title IS 'Short title/name for the quick reply';
COMMENT ON COLUMN quick_replies.message IS 'The actual message text to be inserted';
COMMENT ON COLUMN quick_replies.display_order IS 'Order for displaying quick replies in the UI';
COMMENT ON COLUMN quick_replies.is_active IS 'Whether this quick reply is active and should be shown';
