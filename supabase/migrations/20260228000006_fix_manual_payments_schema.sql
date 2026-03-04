-- =====================================================
-- Migration: Fix Manual Payments Schema
-- Description: Torna payment_method_id opcional e ajusta payment_type
-- Date: 2026-02-28
-- Issue: POST /manual_payments retorna 400 (Bad Request)
-- Root Cause: payment_method_id ÃƒÂ© NOT NULL mas nÃƒÂ£o ÃƒÂ© enviado
-- =====================================================

-- PART 1: Tornar payment_method_id nullable
ALTER TABLE manual_payments
  ALTER COLUMN payment_method_id DROP NOT NULL;

-- PART 2: Atualizar constraint de payment_type para incluir 'subscription'
ALTER TABLE manual_payments DROP CONSTRAINT IF EXISTS manual_payments_payment_type_check;
ALTER TABLE manual_payments ADD CONSTRAINT manual_payments_payment_type_check 
  CHECK (payment_type IN ('one_time', 'recurring', 'subscription'));

-- PART 3: Adicionar comentÃƒÂ¡rio
COMMENT ON COLUMN manual_payments.payment_method_id IS 'MÃƒÂ©todo de pagamento configurado pelo admin. Opcional - pode ser definido posteriormente.';
COMMENT ON COLUMN manual_payments.payment_type IS 'one_time: pagamento ÃƒÂºnico (quote) | recurring: pagamento recorrente | subscription: assinatura';

-- PART 4: VerificaÃƒÂ§ÃƒÂ£o
DO $$
DECLARE
  v_payment_method_nullable boolean;
BEGIN
  SELECT is_nullable = 'YES' INTO v_payment_method_nullable
  FROM information_schema.columns
  WHERE table_name = 'manual_payments'
  AND column_name = 'payment_method_id';
  
  IF NOT v_payment_method_nullable THEN
    RAISE EXCEPTION 'Falha na migration: payment_method_id ainda ÃƒÂ© NOT NULL';
  END IF;
  
  RAISE NOTICE 'Ã¢Å“â€¦ Migration aplicada com sucesso!';
  RAISE NOTICE '   - payment_method_id agora ÃƒÂ© NULLABLE';
  RAISE NOTICE '   - payment_type aceita "subscription"';
END $$;
