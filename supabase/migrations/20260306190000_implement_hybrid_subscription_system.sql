-- ============================================================================
-- Migration: Implement Hybrid Subscription System
-- Description: Sistema híbrido de assinatura com coins e escolha mensal
-- Date: 2026-03-06 19:00:00
-- ============================================================================

-- ============================================================================
-- PASSO 1: Criar tabela de lançamentos mensais
-- ============================================================================

CREATE TABLE IF NOT EXISTS collection_monthly_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES collection_characters(id) ON DELETE CASCADE,
  release_month TEXT NOT NULL, -- '2026-03'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Garantir que cada coleção tenha apenas 1 personagem por mês
  UNIQUE(collection_id, release_month)
);

-- Índices para performance
CREATE INDEX idx_monthly_releases_month ON collection_monthly_releases(release_month) WHERE is_active = true;
CREATE INDEX idx_monthly_releases_collection ON collection_monthly_releases(collection_id) WHERE is_active = true;

COMMENT ON TABLE collection_monthly_releases IS 
  'Lançamentos mensais de personagens por coleção.
   Cada coleção tem 1 personagem disponível por mês.';

-- ============================================================================
-- PASSO 2: Atualizar tabela subscriptions
-- ============================================================================

-- Adicionar colunas do sistema híbrido
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS active_collection_id UUID REFERENCES collections(id),
ADD COLUMN IF NOT EXISTS coins_balance INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS coins_initial INTEGER DEFAULT 0;

-- Adicionar comentários
COMMENT ON COLUMN subscriptions.active_collection_id IS 
  'Coleção ativa/prioritária do assinante.
   Personagens desta coleção custam 200 coins (preço prioritário).';

COMMENT ON COLUMN subscriptions.coins_balance IS 
  'Saldo atual de coins do assinante.
   Atualizado automaticamente a cada escolha.';

COMMENT ON COLUMN subscriptions.coins_initial IS 
  'Saldo inicial de coins recebido na assinatura.
   Trimestral: 600, Semestral: 1300, Anual: 2800.';

-- ============================================================================
-- PASSO 3: Criar tabela de escolhas mensais
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_monthly_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES collection_characters(id) ON DELETE RESTRICT,
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE RESTRICT,
  delivery_month TEXT NOT NULL, -- '2026-03'
  coins_spent INTEGER NOT NULL,
  is_auto_selected BOOLEAN DEFAULT false,
  selected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'pending', -- pending, confirmed, in_production, shipped, delivered
  
  -- Garantir que cada assinatura tenha apenas 1 escolha por mês
  UNIQUE(subscription_id, delivery_month)
);

-- Índices para performance
CREATE INDEX idx_monthly_selections_subscription ON subscription_monthly_selections(subscription_id);
CREATE INDEX idx_monthly_selections_month ON subscription_monthly_selections(delivery_month);
CREATE INDEX idx_monthly_selections_status ON subscription_monthly_selections(status);

COMMENT ON TABLE subscription_monthly_selections IS 
  'Escolhas mensais de personagens pelos assinantes.
   Cada assinante escolhe 1 personagem por mês.';

-- ============================================================================
-- PASSO 4: Função para calcular preço contextual
-- ============================================================================

CREATE OR REPLACE FUNCTION get_contextual_character_price(
  p_character_id UUID,
  p_active_collection_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_character_collection_id UUID;
  v_character_type TEXT;
  v_price INTEGER;
BEGIN
  -- Buscar coleção do personagem
  SELECT collection_id, character_type 
  INTO v_character_collection_id, v_character_type
  FROM collection_characters
  WHERE id = p_character_id;
  
  -- Se personagem é da coleção ativa
  IF v_character_collection_id = p_active_collection_id THEN
    RETURN 200; -- Preço prioritário
  END IF;
  
  -- Se não, usar preços contextuais baseados no tipo
  -- Buscar da tabela character_pricing
  SELECT 
    CASE 
      WHEN v_character_type = 'premium' THEN price_coins
      ELSE 
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM collections 
            WHERE id = v_character_collection_id 
            AND is_secondary = true
          ) THEN 240 -- Coleção secundária
          ELSE 300 -- Catálogo geral
        END
    END INTO v_price
  FROM character_pricing
  WHERE character_type = v_character_type
  LIMIT 1;
  
  -- Se não encontrou, usar padrão
  IF v_price IS NULL THEN
    IF v_character_type = 'premium' THEN
      v_price := 450;
    ELSE
      v_price := 300;
    END IF;
  END IF;
  
  RETURN v_price;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_contextual_character_price IS 
  'Calcula preço contextual de um personagem baseado na coleção ativa.
   Coleção ativa: 200 coins
   Coleção secundária: 240 coins
   Catálogo geral: 300 coins
   Premium: 450 coins';

-- ============================================================================
-- PASSO 5: Função para atualizar saldo automaticamente
-- ============================================================================

CREATE OR REPLACE FUNCTION update_subscription_coins_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_total_spent INTEGER;
BEGIN
  -- Calcular total gasto
  SELECT COALESCE(SUM(coins_spent), 0)
  INTO v_total_spent
  FROM subscription_monthly_selections
  WHERE subscription_id = COALESCE(NEW.subscription_id, OLD.subscription_id);
  
  -- Atualizar saldo
  UPDATE subscriptions
  SET 
    coins_balance = coins_initial - v_total_spent,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.subscription_id, OLD.subscription_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS trg_update_coins_balance ON subscription_monthly_selections;
CREATE TRIGGER trg_update_coins_balance
AFTER INSERT OR UPDATE OR DELETE ON subscription_monthly_selections
FOR EACH ROW EXECUTE FUNCTION update_subscription_coins_balance();

COMMENT ON FUNCTION update_subscription_coins_balance IS 
  'Atualiza saldo de coins automaticamente quando escolhas são feitas.
   Trigger executado em INSERT, UPDATE e DELETE.';

-- ============================================================================
-- PASSO 6: Função para escolha automática
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_select_characters_for_subscription(
  p_subscription_id UUID
)
RETURNS TABLE(
  month TEXT,
  character_id UUID,
  character_name TEXT,
  coins_spent INTEGER
) AS $$
DECLARE
  v_active_collection_id UUID;
  v_plan_type TEXT;
  v_months_count INTEGER;
  v_start_month TEXT;
  v_current_month TEXT;
  v_character RECORD;
  v_month_counter INTEGER := 0;
BEGIN
  -- Buscar dados da assinatura
  SELECT 
    active_collection_id,
    plan_type,
    TO_CHAR(created_at, 'YYYY-MM')
  INTO 
    v_active_collection_id,
    v_plan_type,
    v_start_month
  FROM subscriptions
  WHERE id = p_subscription_id;
  
  -- Determinar quantidade de meses
  v_months_count := CASE v_plan_type
    WHEN 'trimestral' THEN 3
    WHEN 'semestral' THEN 6
    WHEN 'anual' THEN 12
    ELSE 3
  END;
  
  -- Para cada mês da assinatura
  FOR v_month_counter IN 0..(v_months_count - 1) LOOP
    -- Calcular mês
    v_current_month := TO_CHAR(
      TO_DATE(v_start_month, 'YYYY-MM') + (v_month_counter || ' months')::INTERVAL,
      'YYYY-MM'
    );
    
    -- Verificar se já existe escolha para este mês
    IF NOT EXISTS (
      SELECT 1 FROM subscription_monthly_selections
      WHERE subscription_id = p_subscription_id
      AND delivery_month = v_current_month
    ) THEN
      -- Buscar personagem do mês da coleção ativa
      SELECT 
        cmr.character_id,
        cc.name,
        200 as price -- Preço da coleção ativa
      INTO v_character
      FROM collection_monthly_releases cmr
      JOIN collection_characters cc ON cc.id = cmr.character_id
      WHERE cmr.collection_id = v_active_collection_id
        AND cmr.release_month = v_current_month
        AND cmr.is_active = true
      LIMIT 1;
      
      -- Se encontrou personagem, criar escolha automática
      IF v_character.character_id IS NOT NULL THEN
        INSERT INTO subscription_monthly_selections (
          subscription_id,
          character_id,
          collection_id,
          delivery_month,
          coins_spent,
          is_auto_selected,
          status
        ) VALUES (
          p_subscription_id,
          v_character.character_id,
          v_active_collection_id,
          v_current_month,
          v_character.price,
          true,
          'pending'
        );
        
        -- Retornar resultado
        month := v_current_month;
        character_id := v_character.character_id;
        character_name := v_character.name;
        coins_spent := v_character.price;
        RETURN NEXT;
      END IF;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_select_characters_for_subscription IS 
  'Seleciona automaticamente personagens da coleção ativa para meses sem escolha.
   Usado quando cliente não escolhe até o prazo limite (dia 15).';

-- ============================================================================
-- PASSO 7: Função para simular impacto de escolha
-- ============================================================================

CREATE OR REPLACE FUNCTION simulate_character_selection_impact(
  p_subscription_id UUID,
  p_character_id UUID,
  p_delivery_month TEXT
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_current_balance INTEGER;
  v_active_collection_id UUID;
  v_character_price INTEGER;
  v_new_balance INTEGER;
  v_months_remaining INTEGER;
  v_min_price_next_month INTEGER := 200;
  v_will_be_insufficient BOOLEAN;
BEGIN
  -- Buscar dados da assinatura
  SELECT coins_balance, active_collection_id
  INTO v_current_balance, v_active_collection_id
  FROM subscriptions
  WHERE id = p_subscription_id;
  
  -- Calcular preço do personagem
  v_character_price := get_contextual_character_price(
    p_character_id,
    v_active_collection_id
  );
  
  -- Calcular novo saldo
  v_new_balance := v_current_balance - v_character_price;
  
  -- Calcular meses restantes
  SELECT COUNT(*)
  INTO v_months_remaining
  FROM generate_series(
    TO_DATE(p_delivery_month, 'YYYY-MM') + INTERVAL '1 month',
    (SELECT created_at + 
      CASE plan_type
        WHEN 'trimestral' THEN INTERVAL '3 months'
        WHEN 'semestral' THEN INTERVAL '6 months'
        WHEN 'anual' THEN INTERVAL '12 months'
      END
    FROM subscriptions WHERE id = p_subscription_id),
    INTERVAL '1 month'
  );
  
  -- Verificar se saldo será insuficiente
  v_will_be_insufficient := v_new_balance < (v_min_price_next_month * v_months_remaining);
  
  -- Montar resultado
  v_result := json_build_object(
    'current_balance', v_current_balance,
    'character_price', v_character_price,
    'new_balance', v_new_balance,
    'months_remaining', v_months_remaining,
    'min_price_next_month', v_min_price_next_month,
    'will_be_insufficient', v_will_be_insufficient,
    'coins_needed', CASE 
      WHEN v_will_be_insufficient 
      THEN (v_min_price_next_month * v_months_remaining) - v_new_balance
      ELSE 0
    END,
    'is_active_collection', EXISTS(
      SELECT 1 FROM collection_characters
      WHERE id = p_character_id
      AND collection_id = v_active_collection_id
    )
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION simulate_character_selection_impact IS 
  'Simula impacto de uma escolha de personagem no saldo.
   Retorna JSON com análise completa para alertas.';

-- ============================================================================
-- PASSO 8: RLS Policies
-- ============================================================================

-- collection_monthly_releases (público para leitura)
ALTER TABLE collection_monthly_releases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lançamentos mensais são públicos"
  ON collection_monthly_releases FOR SELECT
  USING (is_active = true);

CREATE POLICY "Apenas admins podem gerenciar lançamentos"
  ON collection_monthly_releases FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- subscription_monthly_selections (usuário vê apenas suas escolhas)
ALTER TABLE subscription_monthly_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê apenas suas escolhas"
  ON subscription_monthly_selections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM subscriptions
      WHERE id = subscription_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Usuário pode criar suas escolhas"
  ON subscription_monthly_selections FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM subscriptions
      WHERE id = subscription_id
      AND user_id = auth.uid()
      AND status = 'active'
    )
  );

CREATE POLICY "Usuário pode atualizar suas escolhas"
  ON subscription_monthly_selections FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM subscriptions
      WHERE id = subscription_id
      AND user_id = auth.uid()
      AND status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM subscriptions
      WHERE id = subscription_id
      AND user_id = auth.uid()
      AND status = 'active'
    )
  );

CREATE POLICY "Admins podem ver todas as escolhas"
  ON subscription_monthly_selections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================================================
-- PASSO 9: Views úteis
-- ============================================================================

-- View de escolhas com detalhes
CREATE OR REPLACE VIEW subscription_selections_detailed AS
SELECT 
  sms.id,
  sms.subscription_id,
  sms.delivery_month,
  sms.coins_spent,
  sms.is_auto_selected,
  sms.status,
  sms.selected_at,
  
  -- Dados do personagem
  cc.id as character_id,
  cc.name as character_name,
  cc.description as character_description,
  cc.image_url as character_image_url,
  
  -- Dados da coleção
  col.id as collection_id,
  col.name as collection_name,
  col.slug as collection_slug,
  
  -- Dados da assinatura
  s.user_id,
  s.active_collection_id,
  s.coins_balance,
  s.plan_type,
  
  -- Indicadores
  (col.id = s.active_collection_id) as is_active_collection,
  (sms.coins_spent > 200) as paid_extra
  
FROM subscription_monthly_selections sms
JOIN collection_characters cc ON cc.id = sms.character_id
JOIN collections col ON col.id = sms.collection_id
JOIN subscriptions s ON s.id = sms.subscription_id;

COMMENT ON VIEW subscription_selections_detailed IS 
  'View consolidada com todos os detalhes das escolhas mensais.';

-- ============================================================================
-- PASSO 10: Dados iniciais de exemplo (opcional)
-- ============================================================================

-- Inserir lançamentos mensais de exemplo para as próximas 12 meses
-- (Admin deve configurar isso via interface)

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================
