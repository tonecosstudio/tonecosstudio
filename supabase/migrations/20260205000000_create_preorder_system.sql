-- Migration: Sistema de PrÃƒÂ©-venda com Sinal
-- Purpose: Permitir que clientes paguem sinal e depois o restante
-- Date: 2026-02-05

-- ============================================
-- PARTE 1: Adicionar campos em quotes
-- ============================================

-- Adicionar campos de pagamento
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'deposit_paid', 'fully_paid', 'cancelled')),
ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS full_payment_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS is_preorder BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ready_for_final_payment BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS final_payment_notified_at TIMESTAMPTZ;

-- ÃƒÂndices para performance
CREATE INDEX IF NOT EXISTS idx_quotes_payment_status ON quotes(payment_status);
CREATE INDEX IF NOT EXISTS idx_quotes_is_preorder ON quotes(is_preorder);
CREATE INDEX IF NOT EXISTS idx_quotes_ready_for_final_payment ON quotes(ready_for_final_payment);

-- ============================================
-- PARTE 2: Tabela de TransaÃƒÂ§ÃƒÂµes
-- ============================================

CREATE TABLE IF NOT EXISTS quote_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  
  -- Tipo de Pagamento
  payment_type TEXT NOT NULL CHECK (payment_type IN ('deposit', 'final', 'full')),
  
  -- Valores
  amount NUMERIC(10,2) NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  
  -- MÃƒÂ©todo
  payment_method TEXT CHECK (payment_method IN ('pix', 'credit_card', 'debit_card', 'bank_transfer')),
  
  -- Dados do Pagamento
  transaction_id TEXT,
  payment_proof_url TEXT,
  
  -- Metadados
  metadata JSONB,
  notes TEXT,
  
  -- Timestamps
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ÃƒÂndices
CREATE INDEX IF NOT EXISTS idx_payments_quote ON quote_payments(quote_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON quote_payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_type ON quote_payments(payment_type);

-- ============================================
-- PARTE 3: Tabela de ConfiguraÃƒÂ§ÃƒÂµes de PrÃƒÂ©-venda
-- ============================================

CREATE TABLE IF NOT EXISTS preorder_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ConfiguraÃƒÂ§ÃƒÂµes Globais
  is_enabled BOOLEAN DEFAULT true,
  default_deposit_percentage NUMERIC(5,2) DEFAULT 25.00, -- 25%
  default_deposit_fixed NUMERIC(10,2) DEFAULT 100.00, -- R$ 100
  deposit_type TEXT DEFAULT 'percentage' CHECK (deposit_type IN ('percentage', 'fixed')),
  
  -- Prazos
  deposit_payment_deadline_days INTEGER DEFAULT 3, -- 3 dias para pagar sinal
  final_payment_deadline_days INTEGER DEFAULT 7, -- 7 dias para pagar restante
  
  -- Mensagens
  deposit_notification_message TEXT,
  final_payment_notification_message TEXT,
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir configuraÃƒÂ§ÃƒÂ£o padrÃƒÂ£o
INSERT INTO preorder_settings (
  is_enabled,
  default_deposit_percentage,
  default_deposit_fixed,
  deposit_type,
  deposit_notification_message,
  final_payment_notification_message
) VALUES (
  true,
  25.00,
  100.00,
  'fixed',
  'Seu pedido foi confirmado! Pague o sinal de {deposit_amount} para iniciar a produÃƒÂ§ÃƒÂ£o.',
  'Seu pedido estÃƒÂ¡ pronto! Pague o restante de {remaining_amount} para liberarmos o envio.'
) ON CONFLICT DO NOTHING;

-- ============================================
-- PARTE 4: RLS Policies
-- ============================================

-- Pagamentos: UsuÃƒÂ¡rios veem apenas seus prÃƒÂ³prios
ALTER TABLE quote_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payments"
  ON quote_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes 
      WHERE quotes.id = quote_payments.quote_id 
      AND quotes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own payments"
  ON quote_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotes 
      WHERE quotes.id = quote_payments.quote_id 
      AND quotes.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all payments"
  ON quote_payments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- ConfiguraÃƒÂ§ÃƒÂµes: Apenas admins
ALTER TABLE preorder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view preorder settings"
  ON preorder_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage preorder settings"
  ON preorder_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- ============================================
-- PARTE 5: FunÃƒÂ§ÃƒÂµes Auxiliares
-- ============================================

-- FunÃƒÂ§ÃƒÂ£o: Calcular valores de prÃƒÂ©-venda
CREATE OR REPLACE FUNCTION calculate_preorder_amounts(
  p_total_amount NUMERIC,
  p_deposit_type TEXT DEFAULT 'fixed',
  p_deposit_value NUMERIC DEFAULT 100.00
)
RETURNS TABLE (
  deposit_amount NUMERIC,
  remaining_amount NUMERIC
) AS $$
BEGIN
  IF p_deposit_type = 'percentage' THEN
    RETURN QUERY SELECT 
      ROUND(p_total_amount * (p_deposit_value / 100), 2) as deposit_amount,
      ROUND(p_total_amount - (p_total_amount * (p_deposit_value / 100)), 2) as remaining_amount;
  ELSE
    RETURN QUERY SELECT 
      p_deposit_value as deposit_amount,
      ROUND(p_total_amount - p_deposit_value, 2) as remaining_amount;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- FunÃƒÂ§ÃƒÂ£o: Atualizar status de pagamento
CREATE OR REPLACE FUNCTION update_quote_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Se pagamento do sinal foi completado
  IF NEW.payment_type = 'deposit' AND NEW.status = 'completed' THEN
    UPDATE quotes 
    SET 
      payment_status = 'deposit_paid',
      deposit_paid_at = NEW.paid_at
    WHERE id = NEW.quote_id;
  END IF;
  
  -- Se pagamento final foi completado
  IF NEW.payment_type = 'final' AND NEW.status = 'completed' THEN
    UPDATE quotes 
    SET 
      payment_status = 'fully_paid',
      full_payment_at = NEW.paid_at
    WHERE id = NEW.quote_id;
  END IF;
  
  -- Se pagamento completo foi feito
  IF NEW.payment_type = 'full' AND NEW.status = 'completed' THEN
    UPDATE quotes 
    SET 
      payment_status = 'fully_paid',
      deposit_paid_at = NEW.paid_at,
      full_payment_at = NEW.paid_at
    WHERE id = NEW.quote_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS trigger_update_quote_payment_status ON quote_payments;
CREATE TRIGGER trigger_update_quote_payment_status
  AFTER INSERT OR UPDATE ON quote_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_quote_payment_status();

-- ============================================
-- PARTE 6: ComentÃƒÂ¡rios
-- ============================================

COMMENT ON TABLE quote_payments IS 'TransaÃƒÂ§ÃƒÂµes de pagamento dos orÃƒÂ§amentos';
COMMENT ON TABLE preorder_settings IS 'ConfiguraÃƒÂ§ÃƒÂµes do sistema de prÃƒÂ©-venda';
COMMENT ON COLUMN quotes.is_preorder IS 'Se true, requer pagamento de sinal';
COMMENT ON COLUMN quotes.payment_status IS 'Status: pending, deposit_paid, fully_paid, cancelled';
COMMENT ON COLUMN quotes.ready_for_final_payment IS 'Se true, cliente pode pagar o restante';
COMMENT ON COLUMN quote_payments.payment_type IS 'Tipo: deposit (sinal), final (restante), full (completo)';

