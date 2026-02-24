-- Correção: Add manual payment links system (safe version)
-- Purpose: Apply only missing parts
-- Date: 2026-02-14

-- Add payment link fields to quotes table (IF NOT EXISTS)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'quotes' AND column_name = 'payment_link') THEN
    ALTER TABLE quotes ADD COLUMN payment_link TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'quotes' AND column_name = 'pix_key') THEN
    ALTER TABLE quotes ADD COLUMN pix_key TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'quotes' AND column_name = 'payment_instructions') THEN
    ALTER TABLE quotes ADD COLUMN payment_instructions TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'quotes' AND column_name = 'payment_link_sent_at') THEN
    ALTER TABLE quotes ADD COLUMN payment_link_sent_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'quotes' AND column_name = 'customer_paid_notification_at') THEN
    ALTER TABLE quotes ADD COLUMN customer_paid_notification_at TIMESTAMPTZ;
  END IF;
END $$;

-- Create payment_links table (IF NOT EXISTS)
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

-- Indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_payment_links_quote ON payment_links(quote_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_type ON payment_links(payment_type);
CREATE INDEX IF NOT EXISTS idx_quotes_payment_link_sent ON quotes(payment_link_sent_at);

-- RLS for payment_links
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own payment links" ON payment_links;
DROP POLICY IF EXISTS "Users can update their own payment links" ON payment_links;
DROP POLICY IF EXISTS "Admins can manage all payment links" ON payment_links;

-- Create policies
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
    'Link de Pagamento Disponível',
    'Seu link de pagamento está pronto! Valor: R$ ' || NEW.amount::TEXT,
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
COMMENT ON COLUMN payment_links.customer_confirmed_at IS 'When customer clicked "Já Paguei"';
COMMENT ON COLUMN payment_links.admin_confirmed_at IS 'When admin confirmed payment received';
