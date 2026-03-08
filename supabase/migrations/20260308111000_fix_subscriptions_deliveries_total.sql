-- ============================================================================
-- Migration: Fix Subscriptions Deliveries Total
-- Description: Corrige deliveries_total baseado no plan_type
-- Date: 2026-03-08 11:10:00
-- ============================================================================

-- Atualizar deliveries_total baseado no plan_type
UPDATE subscriptions
SET deliveries_total = CASE plan_type
  WHEN 'trimestral' THEN 3
  WHEN 'semestral' THEN 6
  WHEN 'anual' THEN 12
  ELSE 3 -- padrão
END
WHERE deliveries_total IS NULL OR deliveries_total = 0 OR deliveries_total::text = '';

-- Atualizar next_delivery_date se estiver NULL
UPDATE subscriptions
SET next_delivery_date = created_at + INTERVAL '7 days'
WHERE next_delivery_date IS NULL
AND status = 'active';

-- Log do resultado
DO $$
DECLARE
  v_updated INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_updated 
  FROM subscriptions 
  WHERE status = 'active' AND deliveries_total > 0;
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Assinaturas ativas com deliveries_total corrigido: %', v_updated;
  RAISE NOTICE '==============================================';
END $$;

-- Agora criar entregas para assinaturas ativas
DO $$
DECLARE
  v_sub RECORD;
  v_count INTEGER;
  v_total_created INTEGER := 0;
BEGIN
  FOR v_sub IN 
    SELECT s.id, s.plan_type, s.deliveries_total
    FROM subscriptions s
    LEFT JOIN subscription_deliveries sd ON sd.subscription_id = s.id
    WHERE s.status = 'active'
    AND s.deliveries_total > 0
    AND sd.id IS NULL
  LOOP
    BEGIN
      v_count := create_subscription_deliveries(v_sub.id);
      v_total_created := v_total_created + v_count;
      RAISE NOTICE 'Criadas % entregas para assinatura % (plan: %, total: %)', 
        v_count, v_sub.id, v_sub.plan_type, v_sub.deliveries_total;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Erro ao criar entregas para assinatura %: %', v_sub.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Total de entregas criadas: %', v_total_created;
  RAISE NOTICE '==============================================';
END $$;

-- Ativar primeira entrega de cada assinatura
UPDATE subscription_deliveries
SET 
  status = 'pending',
  updated_at = NOW()
WHERE delivery_number = 1
AND status = 'scheduled';

-- Resultado final
DO $$
DECLARE
  v_deliveries INTEGER;
  v_pending INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_deliveries FROM subscription_deliveries;
  SELECT COUNT(*) INTO v_pending FROM subscription_deliveries WHERE status = 'pending';
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'RESULTADO FINAL';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Total de entregas: %', v_deliveries;
  RAISE NOTICE 'Entregas pendentes: %', v_pending;
  RAISE NOTICE '==============================================';
END $$;
