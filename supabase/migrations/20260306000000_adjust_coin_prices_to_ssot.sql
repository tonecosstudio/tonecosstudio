-- ============================================================================
-- Migration: Adjust Coin Prices to Match SSOT (Admin Page)
-- Description: Atualiza preços de coins para valores corretos (200-450)
-- Reason: Valores anteriores (800-1800) estavam 4x maiores que o esperado
-- SSOT: /admin/coins (AdminCoinsSystem.tsx)
-- Date: 2026-03-06
-- ============================================================================

-- ============================================================================
-- BACKUP: Salvar valores antigos para referência
-- ============================================================================

DO $
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'AJUSTE DE PREÇOS DO SISTEMA DE COINS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Valores ANTIGOS (incorretos):';
  RAISE NOTICE '- Coleção Ativa: 800 coins';
  RAISE NOTICE '- Coleção Secundária: 1200 coins';
  RAISE NOTICE '- Catálogo Geral: 1400 coins';
  RAISE NOTICE '- Premium: 1800 coins';
  RAISE NOTICE '';
  RAISE NOTICE 'Valores NOVOS (corretos - SSOT):';
  RAISE NOTICE '- Coleção Ativa: 200 coins';
  RAISE NOTICE '- Coleção Secundária: 240 coins';
  RAISE NOTICE '- Catálogo Geral: 300 coins';
  RAISE NOTICE '- Premium: 450 coins';
  RAISE NOTICE '';
END $;

-- ============================================================================
-- PASSO 1: Atualizar Preços Base (collection_base_pricing)
-- ============================================================================

-- Nova Lógica Simplificada:
-- BASE DE REFERÊNCIA: Coleção Ativa = 200 coins (fixo)
-- Todos os outros tipos têm ACRÉSCIMO sobre a base:
--
-- - Coleção Ativa: 200 coins (base fixa - referência)
-- - Coleção Secundária: 200 × 1.2 = 240 coins (+20%)
-- - Catálogo Geral: 200 × 1.5 = 300 coins (+50%)
-- - Premium: 200 × 2.25 = 450 coins (+125%)

UPDATE collection_base_pricing
SET 
  base_price_coins = CASE 
    WHEN collection_type_id = (
      SELECT id FROM collection_types WHERE name = 'subscription'
    ) THEN 200  -- Base fixa para subscription (referência)
    WHEN collection_type_id = (
      SELECT id FROM collection_types WHERE name = 'standard_catalog'
    ) THEN 300  -- Base × 1.5
    WHEN collection_type_id = (
      SELECT id FROM collection_types WHERE name = 'premium_catalog'
    ) THEN 450  -- Base × 2.25
    ELSE base_price_coins
  END,
  updated_at = NOW()
WHERE collection_type_id IN (
  SELECT id FROM collection_types 
  WHERE name IN ('subscription', 'standard_catalog', 'premium_catalog')
);

-- ============================================================================
-- PASSO 2: Atualizar Multiplicadores (pricing_context_multipliers)
-- ============================================================================

-- Nova Lógica Simplificada:
-- BASE: 200 coins (Coleção Ativa - referência)
-- 
-- Multiplicadores:
-- - Coleção Escolhida: 1.0 (sem desconto, base fixa 200)
-- - Coleção Não Escolhida: 1.2 (200 × 1.2 = 240)
-- - Sem Assinatura: 1.5 (200 × 1.5 = 300)

UPDATE pricing_context_multipliers
SET 
  chosen_collection_discount_percentage = 0,  -- Sem desconto, base fixa
  multiplier = CASE user_context
    WHEN 'subscribed_chosen' THEN 1.0  -- Base fixa 200
    WHEN 'subscribed_not_chosen' THEN 1.2  -- +20%
    WHEN 'no_subscription' THEN 1.5  -- +50%
    ELSE multiplier
  END,
  description = CASE user_context
    WHEN 'subscribed_chosen' THEN 'Base fixa de 200 coins (referência - sem desconto)'
    WHEN 'subscribed_not_chosen' THEN 'Acréscimo de 20% sobre a base (200 × 1.2 = 240 coins)'
    WHEN 'no_subscription' THEN 'Acréscimo de 50% sobre a base (200 × 1.5 = 300 coins)'
    ELSE description
  END,
  updated_at = NOW();

-- ============================================================================
-- PASSO 3: Ajustar Lógica de Cálculo (Comentário Explicativo)
-- ============================================================================

-- NOVA LÓGICA SIMPLIFICADA:
-- BASE DE REFERÊNCIA: Coleção Ativa = 200 coins (fixo)
-- 
-- 1. Coleção Escolhida (subscribed_chosen):
--    Base: 200 coins (fixo - referência)
--    Multiplicador: 1.0
--    Cálculo: 200 × 1.0 = 200 coins ✓
--
-- 2. Coleção Não Escolhida (subscribed_not_chosen):
--    Base: 200 coins
--    Multiplicador: 1.2 (+20%)
--    Cálculo: 200 × 1.2 = 240 coins ✓
--
-- 3. Sem Assinatura (no_subscription):
--    Base: 200 coins
--    Multiplicador: 1.5 (+50%)
--    Cálculo: 200 × 1.5 = 300 coins ✓
--
-- 4. Catálogo Geral (standard_catalog):
--    Base: 300 coins (fixo)
--    Multiplicador: 1.5 em relação à base
--    Cálculo: 200 × 1.5 = 300 coins ✓
--
-- 5. Premium (premium_catalog):
--    Base: 450 coins (fixo)
--    Multiplicador: 2.25 em relação à base
--    Cálculo: 200 × 2.25 = 450 coins ✓

-- ============================================================================
-- PASSO 4: Criar Tabela de Preços Base por Contexto (Nova Abordagem)
-- ============================================================================

-- Tabela simplificada: todos os contextos usam a mesma base (200 coins)
CREATE TABLE IF NOT EXISTS collection_pricing_by_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_type_id UUID NOT NULL REFERENCES collection_types(id) ON DELETE CASCADE,
  user_context TEXT NOT NULL CHECK (user_context IN (
    'subscribed_chosen',
    'subscribed_not_chosen',
    'no_subscription'
  )),
  base_price_coins INTEGER NOT NULL CHECK (base_price_coins > 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collection_type_id, user_context)
);

-- Inserir valores: TODOS usam base 200 (referência)
INSERT INTO collection_pricing_by_context (collection_type_id, user_context, base_price_coins)
SELECT 
  ct.id,
  context.user_context,
  200  -- Base fixa para todos os contextos
FROM collection_types ct
CROSS JOIN (
  VALUES 
    ('subscribed_chosen'),      -- 200 × 1.0 = 200
    ('subscribed_not_chosen'),  -- 200 × 1.2 = 240
    ('no_subscription')         -- 200 × 1.5 = 300
) AS context(user_context)
WHERE ct.name = 'subscription'
ON CONFLICT (collection_type_id, user_context) 
DO UPDATE SET 
  base_price_coins = 200,  -- Garantir base 200
  updated_at = NOW();

-- Índices
CREATE INDEX IF NOT EXISTS idx_pricing_by_context_type ON collection_pricing_by_context(collection_type_id);
CREATE INDEX IF NOT EXISTS idx_pricing_by_context_context ON collection_pricing_by_context(user_context);
CREATE INDEX IF NOT EXISTS idx_pricing_by_context_active ON collection_pricing_by_context(is_active);

-- RLS
ALTER TABLE collection_pricing_by_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active pricing by context"
  ON collection_pricing_by_context FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage pricing by context"
  ON collection_pricing_by_context FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

COMMENT ON TABLE collection_pricing_by_context IS 
  'Preços base por contexto de usuário. BASE DE REFERÊNCIA: 200 coins (Coleção Ativa).
   Todos os contextos usam a mesma base, diferença está nos multiplicadores.';

-- ============================================================================
-- PASSO 5: Atualizar Função get_collection_price
-- ============================================================================

CREATE OR REPLACE FUNCTION get_collection_price(
  p_collection_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  v_collection_type_name TEXT;
  v_base_price_coins INTEGER;
  v_has_subscription BOOLEAN;
  v_is_chosen BOOLEAN;
  v_discount_percentage INTEGER;
  v_multiplier DECIMAL(4,2);
  v_final_price INTEGER;
  v_context_base_price INTEGER;
BEGIN
  -- 1. Buscar tipo da coleção
  SELECT ct.name
  INTO v_collection_type_name
  FROM collections c
  JOIN collection_types ct ON c.collection_type_id = ct.id
  WHERE c.id = p_collection_id;
  
  IF v_collection_type_name IS NULL THEN
    RAISE EXCEPTION 'Collection not found: %', p_collection_id;
  END IF;
  
  -- 2. CATÁLOGOS: Preço fixo (ignora contexto)
  IF v_collection_type_name IN ('standard_catalog', 'premium_catalog') THEN
    SELECT cbp.base_price_coins INTO v_base_price_coins
    FROM collection_base_pricing cbp
    JOIN collection_types ct ON cbp.collection_type_id = ct.id
    WHERE ct.name = v_collection_type_name
    AND cbp.is_active = true;
    
    RETURN v_base_price_coins;
  END IF;
  
  -- 3. SUBSCRIPTION: Verificar contexto do usuário
  IF p_user_id IS NULL THEN
    v_has_subscription := false;
  ELSE
    SELECT EXISTS(
      SELECT 1 FROM subscriptions
      WHERE user_id = p_user_id AND status = 'active'
    ) INTO v_has_subscription;
  END IF;
  
  -- 4. SEM ASSINATURA
  IF NOT v_has_subscription THEN
    -- Buscar base específica para no_subscription
    SELECT base_price_coins INTO v_context_base_price
    FROM collection_pricing_by_context cpbc
    JOIN collection_types ct ON cpbc.collection_type_id = ct.id
    WHERE ct.name = 'subscription'
    AND cpbc.user_context = 'no_subscription'
    AND cpbc.is_active = true;
    
    -- Aplicar multiplicador
    SELECT multiplier INTO v_multiplier
    FROM pricing_context_multipliers
    WHERE user_context = 'no_subscription'
    AND is_active = true;
    
    v_final_price := ROUND(v_context_base_price * v_multiplier);
    RETURN v_final_price;
  END IF;
  
  -- 5. COM ASSINATURA: Verificar se é coleção escolhida
  SELECT EXISTS(
    SELECT 1 
    FROM subscription_collections sc
    JOIN subscriptions s ON s.id = sc.subscription_id
    WHERE s.user_id = p_user_id
    AND s.status = 'active'
    AND sc.collection_id = p_collection_id
  ) INTO v_is_chosen;
  
  IF v_is_chosen THEN
    -- COLEÇÃO ESCOLHIDA: Base 200 × 1.0 = 200
    SELECT base_price_coins INTO v_context_base_price
    FROM collection_pricing_by_context cpbc
    JOIN collection_types ct ON cpbc.collection_type_id = ct.id
    WHERE ct.name = 'subscription'
    AND cpbc.user_context = 'subscribed_chosen'
    AND cpbc.is_active = true;
    
    SELECT multiplier INTO v_multiplier
    FROM pricing_context_multipliers
    WHERE user_context = 'subscribed_chosen'
    AND is_active = true;
    
    -- Aplicar multiplicador (1.0 = sem alteração)
    v_final_price := ROUND(v_context_base_price * v_multiplier);
    RETURN v_final_price;
  ELSE
    -- COLEÇÃO NÃO ESCOLHIDA: Base 200 × 1.2 = 240
    SELECT base_price_coins INTO v_context_base_price
    FROM collection_pricing_by_context cpbc
    JOIN collection_types ct ON cpbc.collection_type_id = ct.id
    WHERE ct.name = 'subscription'
    AND cpbc.user_context = 'subscribed_not_chosen'
    AND cpbc.is_active = true;
    
    SELECT multiplier INTO v_multiplier
    FROM pricing_context_multipliers
    WHERE user_context = 'subscribed_not_chosen'
    AND is_active = true;
    
    v_final_price := ROUND(v_context_base_price * v_multiplier);
    RETURN v_final_price;
  END IF;
END;
$function$;

COMMENT ON FUNCTION get_collection_price IS 
  'Calcula preço contextual de uma coleção em COINS (LÓGICA SIMPLIFICADA).
   BASE DE REFERÊNCIA: 200 coins (Coleção Ativa).
   Usa tabela collection_pricing_by_context (base 200) + multiplicadores.
   
   Preços finais:
   - Coleção Ativa (escolhida): 200 coins (base × 1.0)
   - Coleção Secundária (não escolhida): 240 coins (base × 1.2)
   - Sem Assinatura: 300 coins (base × 1.5)
   - Catálogo Geral: 300 coins (fixo)
   - Premium: 450 coins (fixo)';

-- ============================================================================
-- PASSO 6: Validar Cálculos
-- ============================================================================

DO $
DECLARE
  v_subscription_type_id UUID;
  v_test_user_id UUID := gen_random_uuid();
  v_test_collection_id UUID;
  v_price INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VALIDAÇÃO DOS NOVOS PREÇOS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- Buscar IDs necessários
  SELECT id INTO v_subscription_type_id FROM collection_types WHERE name = 'subscription';
  SELECT id INTO v_test_collection_id FROM collections WHERE collection_type_id = v_subscription_type_id LIMIT 1;
  
  IF v_test_collection_id IS NOT NULL THEN
    -- Teste 1: Sem assinatura
    v_price := get_collection_price(v_test_collection_id, NULL);
    RAISE NOTICE 'Teste 1 - Sem Assinatura: % coins (esperado: 300)', v_price;
    
    -- Teste 2: Com assinatura (simulado - não escolhida)
    v_price := get_collection_price(v_test_collection_id, v_test_user_id);
    RAISE NOTICE 'Teste 2 - Não Escolhida: % coins (esperado: 240)', v_price;
    
    RAISE NOTICE '';
    RAISE NOTICE 'NOTA: Para testar "Coleção Escolhida", é necessário criar';
    RAISE NOTICE 'uma assinatura real com subscription_collections.';
  ELSE
    RAISE NOTICE 'Nenhuma coleção de subscription encontrada para teste.';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRAÇÃO CONCLUÍDA COM SUCESSO!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Próximos passos:';
  RAISE NOTICE '1. Verificar página /admin/coins';
  RAISE NOTICE '2. Validar cálculos em ambiente de teste';
  RAISE NOTICE '3. Atualizar documentação';
  RAISE NOTICE '';
END $;

