-- Migration: Create quick_replies table
-- Description: Table for storing quick reply templates for support chat
-- Requirements: 10.1

CREATE TABLE IF NOT EXISTS quick_replies (
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
CREATE INDEX IF NOT EXISTS idx_quick_replies_category ON quick_replies(category);
CREATE INDEX IF NOT EXISTS idx_quick_replies_active ON quick_replies(is_active);
CREATE INDEX IF NOT EXISTS idx_quick_replies_order ON quick_replies(display_order);

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
  ('saudacao', 'Boas-vindas', 'OlÃƒÆ’Ã‚Â¡! Bem-vindo ao suporte da Ordax. Como posso ajudÃƒÆ’Ã‚Â¡-lo hoje?', 1),
  ('pedido', 'Status do pedido', 'Vou verificar o status do seu pedido agora mesmo. Um momento, por favor.', 2),
  ('pedido', 'Pedido em produÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o', 'Seu pedido estÃƒÆ’Ã‚Â¡ em produÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o! Estamos trabalhando com muito carinho na sua peÃƒÆ’Ã‚Â§a. Em breve enviaremos o cÃƒÆ’Ã‚Â³digo de rastreamento.', 3),
  ('pagamento', 'Confirmar pagamento', 'Recebi a confirmaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do seu pagamento! Seu pedido jÃƒÆ’Ã‚Â¡ estÃƒÆ’Ã‚Â¡ sendo processado.', 4),
  ('pagamento', 'Aguardando pagamento', 'Ainda nÃƒÆ’Ã‚Â£o identificamos o pagamento do seu pedido. VocÃƒÆ’Ã‚Âª pode enviar o comprovante para agilizarmos?', 5),
  ('rastreamento', 'CÃƒÆ’Ã‚Â³digo de rastreamento', 'Seu pedido foi enviado! O cÃƒÆ’Ã‚Â³digo de rastreamento ÃƒÆ’Ã‚Â©: [INSERIR CÃƒÆ’Ã¢â‚¬Å“DIGO]. VocÃƒÆ’Ã‚Âª pode acompanhar em: https://rastreamento.correios.com.br', 6),
  ('orcamento', 'OrÃƒÆ’Ã‚Â§amento enviado', 'Enviei o orÃƒÆ’Ã‚Â§amento para o seu email! Qualquer dÃƒÆ’Ã‚Âºvida, estou ÃƒÆ’Ã‚Â  disposiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o.', 7),
  ('orcamento', 'Aguardando aprovaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o', 'VocÃƒÆ’Ã‚Âª jÃƒÆ’Ã‚Â¡ teve a chance de revisar o orÃƒÆ’Ã‚Â§amento que enviei? Posso esclarecer alguma dÃƒÆ’Ã‚Âºvida?', 8),
  ('duvida', 'Prazo de entrega', 'O prazo de produÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o ÃƒÆ’Ã‚Â© de 15 a 20 dias ÃƒÆ’Ã‚Âºteis apÃƒÆ’Ã‚Â³s a confirmaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do pagamento. ApÃƒÆ’Ã‚Â³s o envio, o prazo dos Correios varia de acordo com sua regiÃƒÆ’Ã‚Â£o.', 9),
  ('duvida', 'Formas de pagamento', 'Aceitamos PIX (5% de desconto), cartÃƒÆ’Ã‚Â£o de crÃƒÆ’Ã‚Â©dito e boleto bancÃƒÆ’Ã‚Â¡rio. Qual forma vocÃƒÆ’Ã‚Âª prefere?', 10),
  ('despedida', 'Encerramento', 'Fico feliz em ter ajudado! Se precisar de mais alguma coisa, ÃƒÆ’Ã‚Â© sÃƒÆ’Ã‚Â³ chamar. Tenha um ÃƒÆ’Ã‚Â³timo dia! ÃƒÂ°Ã…Â¸Ã‹Å“Ã…Â ', 11),
  ('despedida', 'Agradecimento', 'Muito obrigado pela sua compra! Esperamos que vocÃƒÆ’Ã‚Âª adore sua peÃƒÆ’Ã‚Â§a. Qualquer coisa, estamos aqui!', 12);

COMMENT ON TABLE quick_replies IS 'Stores quick reply templates for support chat system';
COMMENT ON COLUMN quick_replies.category IS 'Category for organizing quick replies (e.g., saudacao, pedido, pagamento, orcamento, duvida, despedida)';
COMMENT ON COLUMN quick_replies.title IS 'Short title/name for the quick reply';
COMMENT ON COLUMN quick_replies.message IS 'The actual message text to be inserted';
COMMENT ON COLUMN quick_replies.display_order IS 'Order for displaying quick replies in the UI';
COMMENT ON COLUMN quick_replies.is_active IS 'Whether this quick reply is active and should be shown';
