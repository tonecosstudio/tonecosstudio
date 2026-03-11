-- =====================================================
-- Migration: Fix Admin Payment Methods Relationship
-- Description: Garante que o relacionamento entre manual_payments e admin_payment_methods está correto
-- =====================================================

-- =====================================================
-- Verificar e corrigir FK se necessário
-- =====================================================

-- Verificar se a FK existe
DO $$
BEGIN
  -- Se a FK não existe, criar
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'manual_payments_payment_method_id_fkey'
    AND table_name = 'manual_payments'
  ) THEN
    ALTER TABLE manual_payments
    ADD CONSTRAINT manual_payments_payment_method_id_fkey
    FOREIGN KEY (payment_method_id)
    REFERENCES admin_payment_methods(id)
    ON DELETE SET NULL;
    
    RAISE NOTICE 'FK manual_payments_payment_method_id_fkey created';
  ELSE
    RAISE NOTICE 'FK manual_payments_payment_method_id_fkey already exists';
  END IF;
END $$;

-- Garantir que o índice existe
CREATE INDEX IF NOT EXISTS idx_manual_payments_payment_method_id 
ON manual_payments(payment_method_id);

-- =====================================================
-- Garantir que admin_payment_methods tem dados
-- =====================================================

-- Adicionar constraint unique em name se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'admin_payment_methods_name_key'
    AND table_name = 'admin_payment_methods'
  ) THEN
    ALTER TABLE admin_payment_methods
    ADD CONSTRAINT admin_payment_methods_name_key UNIQUE (name);
    
    RAISE NOTICE 'Unique constraint on name created';
  END IF;
END $$;

-- Inserir métodos de pagamento se não existirem
INSERT INTO admin_payment_methods (name, type, instructions, display_order)
VALUES
  ('PIX', 'pix', 'Transferência via PIX', 1),
  ('Transferência Bancária', 'bank_transfer', 'Transferência bancária tradicional', 2),
  ('Boleto', 'boleto', 'Pagamento via boleto bancário', 3),
  ('Link de Pagamento', 'payment_link', 'Link de pagamento online', 4)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- Reload Schema Cache
-- =====================================================

NOTIFY pgrst, 'reload schema';

-- =====================================================
-- Verificação
-- =====================================================

DO $$
DECLARE
  table_exists BOOLEAN;
  fk_exists BOOLEAN;
  payment_methods_count INTEGER;
BEGIN
  -- Verificar se tabela existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'admin_payment_methods'
  ) INTO table_exists;
  
  -- Verificar se FK existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name LIKE '%payment_method_id%'
    AND table_name = 'manual_payments'
  ) INTO fk_exists;
  
  -- Contar métodos de pagamento
  SELECT COUNT(*) INTO payment_methods_count
  FROM admin_payment_methods;
  
  IF table_exists AND fk_exists AND payment_methods_count > 0 THEN
    RAISE NOTICE '✅ admin_payment_methods table exists, FK exists, % payment methods configured', payment_methods_count;
  ELSE
    RAISE EXCEPTION '❌ Issues found: table_exists=%, fk_exists=%, payment_methods=%',
      table_exists, fk_exists, payment_methods_count;
  END IF;
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON CONSTRAINT manual_payments_payment_method_id_fkey ON manual_payments 
IS 'FK para admin_payment_methods - método de pagamento usado';

