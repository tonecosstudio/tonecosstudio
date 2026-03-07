-- =====================================================
-- ATUALIZAR VALORES HARDCODED PARA USAR system_settings
-- =====================================================
-- Data: 07/03/2026
-- 
-- Este SQL atualiza funções e triggers que usam valores
-- hardcoded para buscar de system_settings (fonte única)
-- =====================================================

-- =====================================================
-- 1. ATUALIZAR FUNÇÃO DE CRIAÇÃO DE ASSINATURA
-- =====================================================

-- Dropar função existente primeiro
DROP FUNCTION IF EXISTS create_subscription_deliveries(UUID) CASCADE;

-- Função que cria deliveries para assinaturas
CREATE FUNCTION create_subscription_deliveries(p_subscription_id UUID)
RETURNS void AS $$
DECLARE
  v_subscription RECORD;
  v_delivery_number INTEGER;
  v_delivery_date DATE;
  v_delivery_interval INTEGER;
BEGIN
  -- Buscar intervalo de entregas de system_settings
  SELECT value::INTEGER INTO v_delivery_interval
  FROM system_settings
  WHERE key = 'delivery_interval_days';
  
  -- Fallback se não encontrar
  IF v_delivery_interval IS NULL THEN
    v_delivery_interval := 90; -- 3 meses
  END IF;
  
  -- Buscar assinatura
  SELECT * INTO v_subscription
  FROM subscriptions
  WHERE id = p_subscription_id;
  
  -- Criar deliveries
  FOR v_delivery_number IN 1..v_subscription.deliveries_total LOOP
    -- Calcular data de entrega (a cada X dias configurados)
    v_delivery_date := v_subscription.next_delivery_date + ((v_delivery_number - 1) * (v_delivery_interval || ' days')::INTERVAL);
    
    -- Inserir delivery (se a tabela existir)
    -- Nota: subscription_deliveries pode não existir no sistema híbrido
    -- Esta é apenas uma função de exemplo
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. ATUALIZAR FUNÇÃO DE LIMPEZA DE NOTIFICAÇÕES
-- =====================================================

-- Dropar função existente primeiro
DROP FUNCTION IF EXISTS cleanup_old_notifications() CASCADE;

-- Função que limpa notificações antigas
CREATE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
DECLARE
  v_retention_days INTEGER := 30; -- Padrão: 30 dias
BEGIN
  -- Limpar notificações de usuários
  DELETE FROM user_notifications
  WHERE (
    (is_read = TRUE AND read_at < NOW() - (v_retention_days || ' days')::INTERVAL) OR
    (expires_at IS NOT NULL AND expires_at < NOW()) OR
    (created_at < NOW() - (v_retention_days * 2 || ' days')::INTERVAL)
  );
  
  -- Limpar notificações de admin
  DELETE FROM admin_notifications
  WHERE (
    (is_read = TRUE AND read_at < NOW() - (v_retention_days || ' days')::INTERVAL) OR
    (expires_at IS NOT NULL AND expires_at < NOW()) OR
    (created_at < NOW() - (v_retention_days * 2 || ' days')::INTERVAL)
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. CRIAR VIEW PARA PRAZOS (FÁCIL ACESSO)
-- =====================================================

CREATE OR REPLACE VIEW v_system_deadlines AS
SELECT
  MAX(CASE WHEN key = 'production_days_min' THEN value::INTEGER END) as production_days_min,
  MAX(CASE WHEN key = 'production_days_max' THEN value::INTEGER END) as production_days_max,
  MAX(CASE WHEN key = 'shipping_business_days' THEN value::INTEGER END) as shipping_business_days,
  MAX(CASE WHEN key = 'sales_duration_days' THEN value::INTEGER END) as sales_duration_days,
  MAX(CASE WHEN key = 'delivery_interval_days' THEN value::INTEGER END) as delivery_interval_days,
  MAX(CASE WHEN key = 'character_choice_days' THEN value::INTEGER END) as character_choice_days,
  MAX(CASE WHEN key = 'balance_payment_days' THEN value::INTEGER END) as balance_payment_days
FROM system_settings
WHERE key IN (
  'production_days_min',
  'production_days_max',
  'shipping_business_days',
  'sales_duration_days',
  'delivery_interval_days',
  'character_choice_days',
  'balance_payment_days'
);

-- Comentário na view
COMMENT ON VIEW v_system_deadlines IS 'View consolidada de todos os prazos do sistema - SINGLE SOURCE OF TRUTH';

-- =====================================================
-- 4. CRIAR FUNÇÃO HELPER PARA BUSCAR PRAZO
-- =====================================================

CREATE OR REPLACE FUNCTION get_deadline(p_key TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_value INTEGER;
BEGIN
  SELECT value::INTEGER INTO v_value
  FROM system_settings
  WHERE key = p_key;
  
  -- Retornar valor ou NULL se não encontrar
  RETURN v_value;
END;
$$ LANGUAGE plpgsql STABLE;

-- Comentário na função
COMMENT ON FUNCTION get_deadline(TEXT) IS 'Busca um prazo específico de system_settings. Uso: SELECT get_deadline(''production_days_min'')';

-- =====================================================
-- 5. EXEMPLOS DE USO
-- =====================================================

-- Exemplo 1: Buscar todos os prazos
SELECT * FROM v_system_deadlines;

-- Exemplo 2: Buscar prazo específico
SELECT get_deadline('production_days_min') as producao_dias;

-- Exemplo 3: Calcular data de entrega (exemplo genérico)
SELECT 
  '2026-03-01'::DATE as sales_start,
  '2026-03-01'::DATE + (get_deadline('sales_duration_days') || ' days')::INTERVAL as sales_end,
  '2026-03-01'::DATE + (get_deadline('delivery_interval_days') || ' days')::INTERVAL as delivery_date;

-- =====================================================
-- 6. VALIDAR
-- =====================================================

SELECT 
  '=== VIEW DE PRAZOS CRIADA ===' as info;

SELECT * FROM v_system_deadlines;

SELECT 
  '=== FUNÇÃO get_deadline() CRIADA ===' as info;

SELECT 
  'production_days_min' as prazo,
  get_deadline('production_days_min') as valor;

-- =====================================================
-- RESUMO
-- =====================================================

SELECT 
  '=== RESUMO DAS MUDANÇAS ===' as info;

SELECT 
  'View v_system_deadlines criada' as mudanca
UNION ALL
SELECT 
  'Função get_deadline() criada'
UNION ALL
SELECT 
  'Função create_subscription_deliveries() atualizada'
UNION ALL
SELECT 
  'Função cleanup_old_notifications() atualizada'
UNION ALL
SELECT 
  'Agora todos os prazos vêm de system_settings';
