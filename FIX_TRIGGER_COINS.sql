-- ============================================================================
-- FIX: Atualizar trigger para contar apenas escolhas confirmadas
-- ============================================================================

-- Recriar função do trigger
CREATE OR REPLACE FUNCTION update_subscription_coins_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_total_spent INTEGER;
BEGIN
  -- Calcular total gasto APENAS de escolhas confirmadas ou em produção
  -- Escolhas "pending" não gastam coins até serem confirmadas
  SELECT COALESCE(SUM(coins_spent), 0)
  INTO v_total_spent
  FROM subscription_monthly_selections
  WHERE subscription_id = COALESCE(NEW.subscription_id, OLD.subscription_id)
  AND status IN ('confirmed', 'in_production', 'shipped', 'delivered');
  
  -- Atualizar saldo
  UPDATE subscriptions
  SET 
    coins_balance = coins_initial - v_total_spent,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.subscription_id, OLD.subscription_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Comentário atualizado
COMMENT ON FUNCTION update_subscription_coins_balance IS 
  'Atualiza saldo de coins automaticamente quando escolhas são confirmadas.
   Apenas escolhas com status confirmed, in_production, shipped ou delivered gastam coins.
   Escolhas pending não afetam o saldo até serem confirmadas.';

-- ============================================================================
-- FIM DO FIX
-- ============================================================================
