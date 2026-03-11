-- =====================================================
-- Migration: Add Missing Manual Payments Columns
-- Description: Adiciona colunas faltantes em manual_payments para compatibilidade com frontend
-- =====================================================

-- =====================================================
-- Adicionar colunas faltantes em manual_payments
-- =====================================================

-- reference_number (renomear reference_id ou adicionar novo)
ALTER TABLE manual_payments ADD COLUMN IF NOT EXISTS reference_number TEXT;

-- Copiar dados de reference_id para reference_number se existir
UPDATE manual_payments SET reference_number = reference_id WHERE reference_number IS NULL AND reference_id IS NOT NULL;

-- quote_id e subscription_id para vincular pagamentos
ALTER TABLE manual_payments ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL;
ALTER TABLE manual_payments ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL;

-- currency para moeda do pagamento
ALTER TABLE manual_payments ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'BRL';

-- payment_type para tipo de pagamento
ALTER TABLE manual_payments ADD COLUMN IF NOT EXISTS payment_type TEXT;

-- rejection_reason para motivo de rejeição
ALTER TABLE manual_payments ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- approved_at e approved_by para rastreamento de aprovação
ALTER TABLE manual_payments ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE manual_payments ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_manual_payments_quote_id ON manual_payments(quote_id);
CREATE INDEX IF NOT EXISTS idx_manual_payments_subscription_id ON manual_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_manual_payments_approved_by ON manual_payments(approved_by);
CREATE INDEX IF NOT EXISTS idx_manual_payments_reference_number ON manual_payments(reference_number);

-- =====================================================
-- Reload Schema Cache
-- =====================================================

NOTIFY pgrst, 'reload schema';

-- =====================================================
-- Verificação
-- =====================================================

DO $$
DECLARE
  column_count INTEGER;
BEGIN
  -- Contar colunas existentes
  SELECT COUNT(*)
  INTO column_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
  AND table_name = 'manual_payments';
  
  RAISE NOTICE '✅ manual_payments has % columns', column_count;
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN manual_payments.reference_number IS 'Número de referência do pagamento (visível para o usuário)';
COMMENT ON COLUMN manual_payments.quote_id IS 'Orçamento relacionado ao pagamento';
COMMENT ON COLUMN manual_payments.subscription_id IS 'Assinatura relacionada ao pagamento';
COMMENT ON COLUMN manual_payments.currency IS 'Moeda do pagamento (padrão: BRL)';
COMMENT ON COLUMN manual_payments.payment_type IS 'Tipo de pagamento (deposit, full, installment, etc)';
COMMENT ON COLUMN manual_payments.rejection_reason IS 'Motivo da rejeição do pagamento';
COMMENT ON COLUMN manual_payments.approved_at IS 'Data e hora da aprovação';
COMMENT ON COLUMN manual_payments.approved_by IS 'Admin que aprovou o pagamento';

