-- Migration: Add manual payment links system
-- Purpose: Allow admin to send payment links manually to customers
-- Date: 2026-02-14

-- Add payment link fields to quotes table
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS payment_link TEXT,
ADD COLUMN IF NOT EXISTS pix_key TEXT,
ADD COLUMN IF NOT EXISTS payment_instructions TEXT,
ADD COLUMN IF NOT EXISTS payment_link_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS customer_paid_notification_at TIMESTAMPTZ;

-- Create payment_links table for history
CREATE TABLE IF NOT EXISTS payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  
  -- Payment Info
  payment_type TEXT NOT NULL CHECK (payment_type IN ('voucher', 'deposit', 'final', 'full')),
  amount NUMERIC(10,2) NOT NULL,
  
  -- Link Details
  payment_link TEXT,
  pix_key TEXT,
  instructions TEXT,
  
  -- Status
  sent_at TIMESTAMPTZ DEFAULT now(),
  viewed_at TIMESTAMPTZ,
  customer_confirmed_at TIMESTAMPTZ,
  admin_confirmed_at TIMESTAMPTZ,
  
  -- Metadata
  sent_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_links_quote ON payment_links(quote_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_type ON payment_links(payment_type);
CREATE INDEX IF NOT EXISTS idx_quotes_payment_link_sent ON quotes(payment_link_sent_at);

-- RLS for payment_links
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;

-- Users can view their own payment links
CREATE POLICY "Users can view their own payment links"
  ON payment_links FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes 
      WHERE quotes.id = payment_links.quote_id 
      AND quotes.user_id = auth.uid()
    )
  );

-- Users can update their own payment links (mark as viewed/confirmed)
CREATE POLICY "Users can update their own payment links"
  ON payment_links FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes 
      WHERE quotes.id = payment_links.quote_id 
      AND quotes.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotes 
      WHERE quotes.id = payment_links.quote_id 
      AND quotes.user_id = auth.uid()
    )
  );

-- Admins can manage all payment links
CREATE POLICY "Admins can manage all payment links"
  ON payment_links FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- Function to create notification when payment link is sent
CREATE OR REPLACE FUNCTION notify_payment_link_sent()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notification for user
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    link
  )
  SELECT 
    quotes.user_id,
    'Link de Pagamento DisponÃƒÂ­vel',
    'Seu link de pagamento estÃƒÂ¡ pronto! Valor: R$ ' || NEW.amount::TEXT,
    'payment',
    '/orcamento/acompanhar/' || NEW.quote_id
  FROM quotes
  WHERE quotes.id = NEW.quote_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to send notification
DROP TRIGGER IF EXISTS trigger_notify_payment_link_sent ON payment_links;
CREATE TRIGGER trigger_notify_payment_link_sent
  AFTER INSERT ON payment_links
  FOR EACH ROW
  EXECUTE FUNCTION notify_payment_link_sent();

-- Comments
COMMENT ON TABLE payment_links IS 'Manual payment links sent by admin to customers';
COMMENT ON COLUMN payment_links.payment_type IS 'Type of payment: voucher (R$100), deposit (sinal), final (restante), full (completo)';
COMMENT ON COLUMN payment_links.customer_confirmed_at IS 'When customer clicked "JÃƒÂ¡ Paguei"';
COMMENT ON COLUMN payment_links.admin_confirmed_at IS 'When admin confirmed payment received';
