-- =====================================================
-- Migration: Add Missing Payment Status Values
-- Description: Adiciona valores faltantes ao enum payment_status
-- =====================================================

-- =====================================================
-- Adicionar novos valores ao enum payment_status
-- =====================================================

-- Adicionar 'under_review' se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'under_review'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_status')
  ) THEN
    ALTER TYPE payment_status ADD VALUE 'under_review';
    RAISE NOTICE 'Added under_review to payment_status enum';
  END IF;
END $$;

-- Adicionar 'requires_info' se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'requires_info'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_status')
  ) THEN
    ALTER TYPE payment_status ADD VALUE 'requires_info';
    RAISE NOTICE 'Added requires_info to payment_status enum';
  END IF;
END $$;

-- Adicionar 'approved' se não existir (pode ser útil)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'approved'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_status')
  ) THEN
    ALTER TYPE payment_status ADD VALUE 'approved';
    RAISE NOTICE 'Added approved to payment_status enum';
  END IF;
END $$;

-- Adicionar 'rejected' se não existir (pode ser útil)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'rejected'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_status')
  ) THEN
    ALTER TYPE payment_status ADD VALUE 'rejected';
    RAISE NOTICE 'Added rejected to payment_status enum';
  END IF;
END $$;

-- =====================================================
-- Reload Schema Cache
-- =====================================================

NOTIFY pgrst, 'reload schema';

-- =====================================================
-- Verificação
-- =====================================================

DO $$
DECLARE
  enum_values TEXT[];
BEGIN
  -- Listar todos os valores do enum
  SELECT array_agg(enumlabel ORDER BY enumsortorder)
  INTO enum_values
  FROM pg_enum
  WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_status');
  
  RAISE NOTICE '✅ payment_status enum values: %', enum_values;
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TYPE payment_status IS 'Status de pagamento: pending, paid, failed, refunded, under_review, requires_info, approved, rejected';

