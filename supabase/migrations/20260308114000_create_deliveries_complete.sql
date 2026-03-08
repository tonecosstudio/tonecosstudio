-- ============================================================================
-- Migration: Create Deliveries Complete
-- Description: Cria entregas para assinaturas ativas (versão completa e correta)
-- Date: 2026-03-08 11:40:00
-- ============================================================================

-- PASSO 1: Corrigir deliveries_total
UPDATE subscriptions
SET deliveries_total = CASE plan_type
  WHEN 'trimestral' THEN 3
  WHEN 'semestral' THEN 6
  WHEN 'anual' THEN 12
  ELSE 3
END
WHERE deliveries_total IS NULL OR deliveries_total <= 0;

-- PASSO 2: Garantir next_delivery_date
UPDATE subscriptions
SET next_delivery_date = COALESCE(next_delivery_date, created_at + INTERVAL '7 days')
WHERE status = 'active';

-- PASSO 3: Criar entregas manualmente
DO $$
DECLARE
  v_sub RECORD;
  v_delivery_number INTEGER;
  v_delivery_date TIMESTAMPTZ;
  v_total_created INTEGER := 0;
BEGIN
  FOR v_sub IN 
    SELECT s.id, s.plan_type, s.deliveries_total, s.next_delivery_date
    FROM subscriptions s
    LEFT JOIN subscription_deliveries sd ON sd.subscription_id = s.id
    WHERE s.status = 'active'
    AND s.deliveries_total > 0
    AND s.next_delivery_date IS NOT NULL
    AND sd.id IS NULL
  LOOP
    -- Criar cada entrega
    FOR v_delivery_number IN 1..v_sub.deliveries_total LOOP
      v_delivery_date := v_sub.next_delivery_date + ((v_delivery_number - 1) * INTERVAL '30 days');
      
      INSERT INTO subscription_deliveries (
        subscription_id,
        delivery_number,
        status,
        expected_delivery_date,
        created_at,
        updated_at
      )
      VALUES (
        v_sub.id,
        v_delivery_number,
        'scheduled',
        v_delivery_date,
        NOW(),
        NOW()
      )
      ON CONFLICT (subscription_id, delivery_number) DO NOTHING;
      
      v_total_created := v_total_created + 1;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Total de entregas criadas: %', v_total_created;
END $$;

-- PASSO 4: Ativar primeira entrega (scheduled → revealed)
UPDATE subscription_deliveries
SET 
  status = 'revealed',
  updated_at = NOW()
WHERE delivery_number = 1
AND status = 'scheduled';

-- PASSO 5: Resultado final
DO $$
DECLARE
  v_total INTEGER;
  v_revealed INTEGER;
  v_scheduled INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total FROM subscription_deliveries;
  SELECT COUNT(*) INTO v_revealed FROM subscription_deliveries WHERE status = 'revealed';
  SELECT COUNT(*) INTO v_scheduled FROM subscription_deliveries WHERE status = 'scheduled';
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'ENTREGAS CRIADAS COM SUCESSO!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Total: %', v_total;
  RAISE NOTICE 'Reveladas (delivery_number = 1): %', v_revealed;
  RAISE NOTICE 'Agendadas (delivery_number > 1): %', v_scheduled;
  RAISE NOTICE '==============================================';
END $$;
