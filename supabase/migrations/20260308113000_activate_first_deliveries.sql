-- ============================================================================
-- Migration: Activate First Deliveries
-- Description: Ativa primeira entrega de cada assinatura (scheduled → revealed)
-- Date: 2026-03-08 11:30:00
-- ============================================================================

-- Ativar primeira entrega de cada assinatura
-- Status válidos: 'scheduled', 'revealed', 'in_production', 'shipped', 'delivered'
UPDATE subscription_deliveries
SET 
  status = 'revealed',
  updated_at = NOW()
WHERE delivery_number = 1
AND status = 'scheduled';

-- Resultado final
DO $$
DECLARE
  v_deliveries INTEGER;
  v_revealed INTEGER;
  v_scheduled INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_deliveries FROM subscription_deliveries;
  SELECT COUNT(*) INTO v_revealed FROM subscription_deliveries WHERE status = 'revealed';
  SELECT COUNT(*) INTO v_scheduled FROM subscription_deliveries WHERE status = 'scheduled';
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'RESULTADO FINAL - ENTREGAS CRIADAS';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Total de entregas: %', v_deliveries;
  RAISE NOTICE 'Entregas reveladas (primeira de cada assinatura): %', v_revealed;
  RAISE NOTICE 'Entregas agendadas (futuras): %', v_scheduled;
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Agora a pagina /admin/pedidos deve mostrar as assinaturas!';
  RAISE NOTICE '==============================================';
END $$;
