-- ============================================================================
-- Migration: Create Coin System
-- Description: Sistema completo de coins para compra de personagens
-- Spec: contextual-pricing-system (RN006, RN007)
-- Author: System
-- Date: 2026-05-12
-- ============================================================================

-- ============================================================================
-- TABELA: user_coins
-- Descrição: Saldo de coins de cada usuário
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_coins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_earned INTEGER NOT NULL DEFAULT 0 CHECK (total_earned >= 0),
  total_spent INTEGER NOT NULL DEFAULT 0 CHECK (total_spent >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Invariante: balance = total_earned - total_spent
  CONSTRAINT chk_balance_consistency CHECK (balance = total_earned - total_spent)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_coins_balance ON user_coins(balance);
CREATE INDEX IF NOT EXISTS idx_user_coins_updated ON user_coins(updated_at DESC);

-- Comentários explicativos
COMMENT ON TABLE user_coins IS 
  'Saldo de coins de cada usuário - moeda virtual para compra de personagens';

COMMENT ON COLUMN user_coins.balance IS 
  'Saldo atual disponível (total_earned - total_spent)';

COMMENT ON COLUMN user_coins.total_earned IS 
  'Total de coins ganhos (compras + bônus + créditos de assinatura)';

COMMENT ON COLUMN user_coins.total_spent IS 
  'Total de coins gastos em compras de personagens';

-- ============================================================================
-- TABELA: coin_transactions
-- Descrição: Histórico completo de transações de coins
-- ============================================================================

CREATE TABLE IF NOT EXISTS coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'purchase',              -- Compra de pacote de coins
    'spend',                 -- Gasto em personagem
    'refund',                -- Reembolso
    'bonus',                 -- Bônus/presente
    'subscription_credit',   -- Crédito de assinatura mensal
    'admin_adjustment'       -- Ajuste manual do admin
  )),
  reference_id UUID,         -- ID do pedido/compra/assinatura relacionado
  reference_type TEXT,       -- Tipo da referência (character, package, subscription, etc)
  description TEXT NOT NULL,
  metadata JSONB,            -- Dados adicionais (ex: package details, character info)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Validações
  CONSTRAINT chk_amount_not_zero CHECK (amount != 0),
  CONSTRAINT chk_positive_for_earn CHECK (
    transaction_type IN ('purchase', 'bonus', 'subscription_credit', 'refund') 
    AND amount > 0
    OR transaction_type IN ('spend', 'admin_adjustment')
  )
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_coin_transactions_user ON coin_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_type ON coin_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_created ON coin_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_reference ON coin_transactions(reference_id);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_user_created ON coin_transactions(user_id, created_at DESC);

-- Comentários explicativos
COMMENT ON TABLE coin_transactions IS 
  'Histórico completo de todas as transações de coins (débitos e créditos)';

COMMENT ON COLUMN coin_transactions.amount IS 
  'Quantidade de coins (positivo = ganho, negativo = gasto)';

COMMENT ON COLUMN coin_transactions.transaction_type IS 
  'Tipo de transação: purchase, spend, refund, bonus, subscription_credit, admin_adjustment';

COMMENT ON COLUMN coin_transactions.reference_id IS 
  'ID da entidade relacionada (character_id, package_id, subscription_id, etc)';

COMMENT ON COLUMN coin_transactions.reference_type IS 
  'Tipo da referência para facilitar queries (character, package, subscription)';

COMMENT ON COLUMN coin_transactions.metadata IS 
  'Dados adicionais em JSON (ex: detalhes do pacote, info do personagem)';

-- ============================================================================
-- TABELA: coin_packages
-- Descrição: Pacotes de coins disponíveis para compra
-- ============================================================================

CREATE TABLE IF NOT EXISTS coin_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  bonus INTEGER NOT NULL DEFAULT 0 CHECK (bonus >= 0),
  price_brl DECIMAL(10,2) NOT NULL CHECK (price_brl > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_popular BOOLEAN NOT NULL DEFAULT false,
  is_best_value BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_coin_packages_active ON coin_packages(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_coin_packages_sort ON coin_packages(sort_order);

-- Comentários explicativos
COMMENT ON TABLE coin_packages IS 
  'Pacotes de coins disponíveis para compra com preços em BRL';

COMMENT ON COLUMN coin_packages.amount IS 
  'Quantidade base de coins do pacote';

COMMENT ON COLUMN coin_packages.bonus IS 
  'Coins bônus adicionais (total = amount + bonus)';

COMMENT ON COLUMN coin_packages.price_brl IS 
  'Preço em reais (BRL)';

COMMENT ON COLUMN coin_packages.is_popular IS 
  'Badge "Popular" na interface';

COMMENT ON COLUMN coin_packages.is_best_value IS 
  'Badge "Melhor Valor" na interface';

COMMENT ON COLUMN coin_packages.sort_order IS 
  'Ordem de exibição (menor = primeiro)';

-- ============================================================================
-- DADOS INICIAIS: Pacotes de Coins
-- ============================================================================

INSERT INTO coin_packages (name, amount, bonus, price_brl, is_popular, is_best_value, sort_order) VALUES
  ('Starter', 1000, 0, 10.00, false, false, 1),
  ('Basic', 2500, 500, 20.00, true, false, 2),
  ('Premium', 5000, 1500, 35.00, false, true, 3),
  ('Mega', 10000, 4000, 60.00, false, false, 4)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- RLS POLICIES: user_coins
-- ============================================================================

ALTER TABLE user_coins ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver apenas seu próprio saldo
CREATE POLICY "Users can view own coins balance"
  ON user_coins FOR SELECT
  USING (auth.uid() = user_id);

-- Admins podem ver todos os saldos
CREATE POLICY "Admins can view all coins balances"
  ON user_coins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Apenas sistema pode inserir/atualizar (via funções)
CREATE POLICY "Only system can modify coins"
  ON user_coins FOR ALL
  USING (false)
  WITH CHECK (false);

-- ============================================================================
-- RLS POLICIES: coin_transactions
-- ============================================================================

ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver apenas suas próprias transações
CREATE POLICY "Users can view own transactions"
  ON coin_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Admins podem ver todas as transações
CREATE POLICY "Admins can view all transactions"
  ON coin_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Apenas sistema pode inserir (via funções)
CREATE POLICY "Only system can insert transactions"
  ON coin_transactions FOR INSERT
  WITH CHECK (false);

-- ============================================================================
-- RLS POLICIES: coin_packages
-- ============================================================================

ALTER TABLE coin_packages ENABLE ROW LEVEL SECURITY;

-- Todos podem ver pacotes ativos
CREATE POLICY "Anyone can view active packages"
  ON coin_packages FOR SELECT
  USING (is_active = true);

-- Admins podem gerenciar pacotes
CREATE POLICY "Admins can manage packages"
  ON coin_packages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- ============================================================================
-- TRIGGER: Atualizar updated_at automaticamente
-- ============================================================================

CREATE OR REPLACE FUNCTION update_user_coins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_coins_updated_at
  BEFORE UPDATE ON user_coins
  FOR EACH ROW
  EXECUTE FUNCTION update_user_coins_updated_at();

CREATE TRIGGER trigger_update_coin_packages_updated_at
  BEFORE UPDATE ON coin_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_user_coins_updated_at();

-- ============================================================================
-- FUNÇÃO: Criar registro de coins para novo usuário
-- ============================================================================

CREATE OR REPLACE FUNCTION create_user_coins_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_coins (user_id, balance, total_earned, total_spent)
  VALUES (NEW.id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar coins automaticamente ao criar usuário
CREATE TRIGGER trigger_create_user_coins_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_coins_on_signup();

COMMENT ON FUNCTION create_user_coins_on_signup IS 
  'Cria registro de coins automaticamente quando novo usuário é criado';

-- ============================================================================
-- SUCESSO
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Coin system tables created successfully';
  RAISE NOTICE '✅ RLS policies configured';
  RAISE NOTICE '✅ Initial coin packages inserted';
  RAISE NOTICE '✅ Triggers configured';
END $$;
