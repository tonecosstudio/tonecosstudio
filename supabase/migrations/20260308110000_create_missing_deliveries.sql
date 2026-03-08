-- ============================================================================
-- Migration: Create Missing Deliveries
-- Description: Cria entregas para assinaturas ativas que não têm entregas
-- Date: 2026-03-08 11:00:00
-- ============================================================================

-- Função temporária para criar entregas se não existirem
DO $$
DECLARE
  v_sub RECORD;
  v_count INTEGER;
  v_total_created INTEGER := 0;
BEGIN
  -- Para cada assinatura ativa sem entregas
  FOR v_sub IN 
    SELECT s.id, s.plan_type
    FROM subscriptions s
    LEFT JOIN subscription_deliveries sd ON sd.subscription_id = s.id
    WHERE s.status = 'active'
    AND sd.id IS NULL
  LOOP
    -- Criar entregas usando a função existente
    BEGIN
      v_count := create_subscription_deliveries(v_sub.id);
      v_total_created := v_total_created + v_count;
      RAISE NOTICE 'Criadas % entregas para assinatura %', v_count, v_sub.id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Erro ao criar entregas para assinatura %: %', v_sub.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Total de entregas criadas: %', v_total_created;
END $$;

-- Ativar primeira entrega de cada assinatura (mudar de 'scheduled' para 'pending')
UPDATE subscription_deliveries
SET 
  status = 'pending',
  updated_at = NOW()
WHERE delivery_number = 1
AND status = 'scheduled';

-- Log do resultado
DO $$
DECLARE
  v_deliveries_count INTEGER;
  v_subscriptions_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_deliveries_count FROM subscription_deliveries;
  SELECT COUNT(*) INTO v_subscriptions_count FROM subscriptions WHERE status = 'active';
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'RESULTADO DA MIGRATION';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Total de entregas no sistema: %', v_deliveries_count;
  RAISE NOTICE 'Total de assinaturas ativas: %', v_subscriptions_count;
  RAISE NOTICE '==============================================';
END $$;
