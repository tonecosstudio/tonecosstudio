-- ============================================================================
-- Migration: Implement CDC-Compliant Refund Calculation
-- Description: Sistema de cancelamento com reembolso baseado no CDC
--              Reembolso = Valor Pago - (Personagens Recebidos × Valor Avulso)
-- Date: 2026-03-06 20:00:00
-- ============================================================================

-- ============================================================================
-- PASSO 1: Adicionar campos de controle de cancelamento
-- ============================================================================

ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancellation_type TEXT CHECK (cancellation_type IN ('with_refund', 'no_renewal')),
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS refund_processed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS refund_transaction_id TEXT;

COMMENT ON COLUMN subscriptions.cancelled_at IS 
  'Data e hora do cancelamento da assinatura';

COMMENT ON COLUMN subscriptions.cancellation_type IS 
  'Tipo de cancelamento: with_refund (com reembolso) ou no_renewal (sem renovação)';

COMMENT ON COLUMN subscriptions.refund_amount IS 
  'Valor do reembolso calculado segundo CDC (valor pago - personagens recebidos)';

COMMENT ON COLUMN subscriptions.refund_processed_at IS 
  'Data e hora do processamento do reembolso';

COMMENT ON COLUMN subscriptions.refund_transaction_id IS 
  'ID da transação de reembolso no gateway de pagamento';

-- ============================================================================
-- PASSO 2: Função para calcular reembolso segundo CDC
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_cdc_refund(
  p_subscription_id UUID
)
RETURNS TABLE(
  refund_amount DECIMAL(10,2),
  amount_paid DECIMAL(10,2),
  characters_delivered INTEGER,
  total_standalone_value DECIMAL(10,2),
  breakdown JSONB
) AS $$
DECLARE
  v_subscription RECORD;
  v_plan RECORD;
  v_character RECORD;
  v_total_standalone DECIMAL(10,2) := 0;
  v_characters_count INTEGER := 0;
  v_breakdown JSONB := '[]'::JSONB;
BEGIN
  -- Buscar dados da assinatura
  SELECT 
    s.id,
    s.plan_type,
    s.status,
    s.created_at
  INTO v_subscription
  FROM subscriptions s
  WHERE s.id = p_subscription_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription % not found', p_subscription_id;
  END IF;
  
  IF v_subscription.status != 'active' THEN
    RAISE EXCEPTION 'Subscription % is not active (status: %)', p_subscription_id, v_subscription.status;
  END IF;
  
  -- Buscar valor pago do plano
  SELECT 
    plan_type,
    price_full as price
  INTO v_plan
  FROM subscription_plans
  WHERE plan_type = v_subscription.plan_type
  AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan type % not found', v_subscription.plan_type;
  END IF;
  
  -- Buscar personagens já entregues (status = 'delivered')
  FOR v_character IN
    SELECT 
      sms.id,
      sms.character_id,
      sms.delivery_month,
      cc.name as character_name,
      cc.character_type,
      COALESCE(csp.price_full, 
        CASE 
          WHEN cc.character_type = 'premium' THEN 900.00
          ELSE 500.00
        END
      ) as standalone_price
    FROM subscription_monthly_selections sms
    JOIN collection_characters cc ON cc.id = sms.character_id
    LEFT JOIN character_standalone_pricing csp 
      ON csp.character_type = cc.character_type 
      AND csp.is_active = true
    WHERE sms.subscription_id = p_subscription_id
      AND sms.status = 'delivered'
    ORDER BY sms.delivery_month
  LOOP
    v_characters_count := v_characters_count + 1;
    v_total_standalone := v_total_standalone + v_character.standalone_price;
    
    -- Adicionar ao breakdown
    v_breakdown := v_breakdown || jsonb_build_object(
      'character_id', v_character.character_id,
      'character_name', v_character.character_name,
      'character_type', v_character.character_type,
      'delivery_month', v_character.delivery_month,
      'standalone_price', v_character.standalone_price
    );
  END LOOP;
  
  -- Calcular reembolso: Valor Pago - Total de Valores Avulsos
  -- Se o resultado for negativo, reembolso = 0 (cliente não deve nada)
  RETURN QUERY SELECT
    GREATEST(0, v_plan.price - v_total_standalone) as refund_amount,
    v_plan.price as amount_paid,
    v_characters_count as characters_delivered,
    v_total_standalone as total_standalone_value,
    v_breakdown as breakdown;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_cdc_refund IS 
  'Calcula reembolso segundo Código de Defesa do Consumidor.
   Fórmula: Reembolso = Valor Pago - (Personagens Entregues × Valor Avulso)
   
   Exemplo:
   - Cliente pagou: R$ 2.400 (plano anual)
   - Recebeu 3 personagens standard: 3 × R$ 500 = R$ 1.500
   - Reembolso: R$ 2.400 - R$ 1.500 = R$ 900
   
   Se o valor calculado for negativo (cliente recebeu mais do que pagou),
   retorna 0 (sem reembolso, mas também sem cobrança adicional).';

-- ============================================================================
-- PASSO 3: Procedure para processar cancelamento com reembolso
-- ============================================================================

CREATE OR REPLACE FUNCTION process_subscription_cancellation_with_refund(
  p_subscription_id UUID,
  p_refund_transaction_id TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  refund_amount DECIMAL(10,2),
  characters_delivered INTEGER,
  breakdown JSONB
) AS $$
DECLARE
  v_refund_calc RECORD;
  v_cancelled_at TIMESTAMPTZ := NOW();
BEGIN
  -- Calcular reembolso
  SELECT * INTO v_refund_calc
  FROM calculate_cdc_refund(p_subscription_id);
  
  -- Atualizar assinatura
  UPDATE subscriptions
  SET 
    status = 'cancelled',
    cancelled_at = v_cancelled_at,
    cancellation_type = 'with_refund',
    refund_amount = v_refund_calc.refund_amount,
    refund_processed_at = CASE 
      WHEN p_refund_transaction_id IS NOT NULL THEN v_cancelled_at
      ELSE NULL
    END,
    refund_transaction_id = p_refund_transaction_id,
    updated_at = v_cancelled_at
  WHERE id = p_subscription_id;
  
  -- Retornar resultado
  RETURN QUERY SELECT
    true as success,
    format(
      'Assinatura cancelada. Reembolso: R$ %.2f (Valor pago: R$ %.2f - %s personagens entregues: R$ %.2f)',
      v_refund_calc.refund_amount,
      v_refund_calc.amount_paid,
      v_refund_calc.characters_delivered,
      v_refund_calc.total_standalone_value
    ) as message,
    v_refund_calc.refund_amount,
    v_refund_calc.characters_delivered,
    v_refund_calc.breakdown;
    
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT
      false as success,
      format('Erro ao processar cancelamento: %s', SQLERRM) as message,
      0::DECIMAL(10,2) as refund_amount,
      0 as characters_delivered,
      '[]'::JSONB as breakdown;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION process_subscription_cancellation_with_refund IS 
  'Processa cancelamento de assinatura com reembolso segundo CDC.
   
   Parâmetros:
   - p_subscription_id: ID da assinatura a cancelar
   - p_refund_transaction_id: ID da transação de reembolso (opcional, fornecido após processamento no gateway)
   
   Retorna:
   - success: true se cancelamento foi processado
   - message: mensagem descritiva do resultado
   - refund_amount: valor do reembolso
   - characters_delivered: quantidade de personagens entregues
   - breakdown: detalhamento dos personagens e valores';

-- ============================================================================
-- PASSO 4: View para auditoria de cancelamentos
-- ============================================================================

CREATE OR REPLACE VIEW subscription_cancellations_audit AS
SELECT 
  s.id as subscription_id,
  s.user_id,
  p.email,
  p.full_name,
  s.plan_type,
  sp.price_full as plan_price,
  s.status,
  s.cancelled_at,
  s.cancellation_type,
  s.refund_amount,
  s.refund_processed_at,
  s.refund_transaction_id,
  
  -- Contagem de personagens
  (
    SELECT COUNT(*)
    FROM subscription_monthly_selections sms
    WHERE sms.subscription_id = s.id
    AND sms.status = 'delivered'
  ) as characters_delivered,
  
  -- Total de valores avulsos (simplificado - usa preço padrão)
  (
    SELECT COUNT(*) * 50000 -- R$ 500 em centavos
    FROM subscription_monthly_selections sms
    WHERE sms.subscription_id = s.id
    AND sms.status = 'delivered'
  ) as total_standalone_value,
  
  s.created_at as subscription_created_at,
  s.updated_at as subscription_updated_at
  
FROM subscriptions s
JOIN profiles p ON p.id = s.user_id
JOIN subscription_plans sp ON sp.plan_type = s.plan_type AND sp.is_active = true
WHERE s.cancelled_at IS NOT NULL
ORDER BY s.cancelled_at DESC;

COMMENT ON VIEW subscription_cancellations_audit IS 
  'View de auditoria de cancelamentos de assinaturas.
   Mostra todos os cancelamentos com detalhes de reembolso e personagens entregues.';

-- ============================================================================
-- PASSO 5: RLS Policies
-- ============================================================================

-- Usuários podem ver apenas seus próprios cancelamentos
CREATE POLICY "Usuários veem apenas seus cancelamentos"
  ON subscriptions FOR SELECT
  USING (
    user_id = auth.uid()
    AND cancelled_at IS NOT NULL
  );

-- Admins podem ver todos os cancelamentos
-- (policy já existe para admins verem todas as subscriptions)

-- ============================================================================
-- PASSO 6: Índices para performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_subscriptions_cancelled_at 
  ON subscriptions(cancelled_at) 
  WHERE cancelled_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_cancellation_type 
  ON subscriptions(cancellation_type) 
  WHERE cancellation_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_refund_processed 
  ON subscriptions(refund_processed_at) 
  WHERE refund_processed_at IS NOT NULL;

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================
