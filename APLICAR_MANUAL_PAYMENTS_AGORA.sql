-- =====================================================
-- FIX MANUAL PAYMENTS - APLICAR AGORA
-- =====================================================
-- Copie e cole este SQL no Supabase Dashboard:
-- https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new
-- =====================================================

-- STEP 1: Tornar payment_method_id opcional
ALTER TABLE manual_payments 
  ALTER COLUMN payment_method_id DROP NOT NULL;

-- STEP 2: Atualizar constraint de payment_type
ALTER TABLE manual_payments 
  DROP CONSTRAINT IF EXISTS manual_payments_payment_type_check;

ALTER TABLE manual_payments 
  ADD CONSTRAINT manual_payments_payment_type_check 
  CHECK (payment_type IN ('one_time', 'recurring', 'subscription'));

-- STEP 3: Adicionar comentários
COMMENT ON COLUMN manual_payments.payment_method_id IS 
  'Método de pagamento configurado pelo admin. Opcional - pode ser definido posteriormente.';

COMMENT ON COLUMN manual_payments.payment_type IS 
  'one_time: pagamento único (quote) | recurring: pagamento recorrente | subscription: assinatura';

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================
-- Execute após aplicar para confirmar:

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'manual_payments'
AND column_name IN ('payment_method_id', 'payment_type')
ORDER BY column_name;

-- Resultado esperado:
-- payment_method_id | uuid | YES | NULL
-- payment_type      | text | NO  | NULL

-- =====================================================
-- TESTE
-- =====================================================
-- Após aplicar, teste criar uma assinatura.
-- O erro 400 deve estar resolvido.
