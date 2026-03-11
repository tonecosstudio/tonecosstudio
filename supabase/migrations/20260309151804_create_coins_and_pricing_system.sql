-- =====================================================
-- Migration: Create Coins and Pricing System
-- Description: Sistema de moedas virtuais e precificação
-- =====================================================

-- =====================================================
-- 0. Fix cycle_status enum - adicionar 'active'
-- =====================================================
ALTER TYPE cycle_status ADD VALUE IF NOT EXISTS 'active';

-- =====================================================
-- 1. USER_COINS - Saldo de moedas dos usuários
-- =====================================================
CREATE TABLE IF NOT EXISTS user_coins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  balance INTEGER DEFAULT 0 NOT NULL CHECK (balance >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX idx_user_coins_user ON user_coins(user_id);
CREATE INDEX idx_user_coins_balance ON user_coins(balance DESC);

-- RLS
ALTER TABLE user_coins ENABLE ROW LEVEL SECURITY;

-- Usuários veem próprio saldo
CREATE POLICY "Users can view own coins"
  ON user_coins FOR SELECT
  USING (auth.uid() = user_id);

-- Admins veem todos
CREATE POLICY "Admins can view all coins"
  ON user_coins FOR SELECT
  USING (public.current_user_role() IN ('admin', 'super_admin'));

-- Sistema pode inserir/atualizar (via triggers/functions)
CREATE POLICY "System can manage coins"
  ON user_coins FOR ALL
  USING (public.current_user_role() IN ('admin', 'super_admin'))
  WITH CHECK (public.current_user_role() IN ('admin', 'super_admin'));

-- =====================================================
-- 2. COIN_PACKAGES - Pacotes de moedas para venda
-- =====================================================
CREATE TABLE IF NOT EXISTS coin_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  coins_amount INTEGER NOT NULL CHECK (coins_amount > 0),
  price_brl DECIMAL(10,2) NOT NULL CHECK (price_brl > 0),
  bonus_coins INTEGER DEFAULT 0 CHECK (bonus_coins >= 0),
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX idx_coin_packages_active ON coin_packages(is_active);
CREATE INDEX idx_coin_packages_order ON coin_packages(display_order);

-- RLS
ALTER TABLE coin_packages ENABLE ROW LEVEL SECURITY;

-- Todos podem ver pacotes ativos
CREATE POLICY "Anyone can view active packages"
  ON coin_packages FOR SELECT
  USING (is_active = true);

-- Admins podem ver todos
CREATE POLICY "Admins can view all packages"
  ON coin_packages FOR SELECT
  USING (public.current_user_role() IN ('admin', 'super_admin'));

-- Apenas admins podem modificar
CREATE POLICY "Admins can manage packages"
  ON coin_packages FOR ALL
  USING (public.current_user_role() IN ('admin', 'super_admin'))
  WITH CHECK (public.current_user_role() IN ('admin', 'super_admin'));

-- =====================================================
-- 3. COIN_TRANSACTIONS - Histórico de transações
-- =====================================================
CREATE TYPE transaction_type AS ENUM (
  'purchase',      -- Compra de pacote
  'spend',         -- Gasto em personagem
  'refund',        -- Reembolso
  'bonus',         -- Bônus administrativo
  'adjustment'     -- Ajuste manual
);

CREATE TABLE IF NOT EXISTS coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  transaction_type transaction_type NOT NULL,
  description TEXT,
  reference_id UUID,  -- ID de referência (quote, purchase, etc)
  balance_after INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX idx_coin_transactions_user ON coin_transactions(user_id);
CREATE INDEX idx_coin_transactions_type ON coin_transactions(transaction_type);
CREATE INDEX idx_coin_transactions_created ON coin_transactions(created_at DESC);
CREATE INDEX idx_coin_transactions_reference ON coin_transactions(reference_id);

-- RLS
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;

-- Usuários veem próprias transações
CREATE POLICY "Users can view own transactions"
  ON coin_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Admins veem todas
CREATE POLICY "Admins can view all transactions"
  ON coin_transactions FOR SELECT
  USING (public.current_user_role() IN ('admin', 'super_admin'));

-- Apenas sistema pode inserir (via functions)
CREATE POLICY "System can insert transactions"
  ON coin_transactions FOR INSERT
  WITH CHECK (public.current_user_role() IN ('admin', 'super_admin'));

-- =====================================================
-- 4. PRICING_TIERS - Níveis de precificação
-- =====================================================
CREATE TABLE IF NOT EXISTS pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  price_coins INTEGER NOT NULL CHECK (price_coins > 0),
  price_brl DECIMAL(10,2) NOT NULL CHECK (price_brl > 0),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX idx_pricing_tiers_active ON pricing_tiers(is_active);
CREATE INDEX idx_pricing_tiers_order ON pricing_tiers(display_order);

-- RLS
ALTER TABLE pricing_tiers ENABLE ROW LEVEL SECURITY;

-- Todos podem ver tiers ativos
CREATE POLICY "Anyone can view active tiers"
  ON pricing_tiers FOR SELECT
  USING (is_active = true);

-- Admins podem ver todos
CREATE POLICY "Admins can view all tiers"
  ON pricing_tiers FOR SELECT
  USING (public.current_user_role() IN ('admin', 'super_admin'));

-- Apenas admins podem modificar
CREATE POLICY "Admins can manage tiers"
  ON pricing_tiers FOR ALL
  USING (public.current_user_role() IN ('admin', 'super_admin'))
  WITH CHECK (public.current_user_role() IN ('admin', 'super_admin'));

-- =====================================================
-- 5. Triggers para updated_at
-- =====================================================
CREATE TRIGGER set_updated_at_user_coins
  BEFORE UPDATE ON user_coins
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_coin_packages
  BEFORE UPDATE ON coin_packages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_pricing_tiers
  BEFORE UPDATE ON pricing_tiers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- 6. Função para criar saldo inicial
-- =====================================================
CREATE OR REPLACE FUNCTION public.create_user_coins()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_coins (user_id, balance)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar saldo ao criar perfil
CREATE TRIGGER on_profile_created_create_coins
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_user_coins();

-- =====================================================
-- 7. Dados iniciais - Pacotes de moedas
-- =====================================================
INSERT INTO coin_packages (name, display_name, coins_amount, price_brl, bonus_coins, display_order)
VALUES
  ('starter', 'Pacote Iniciante', 100, 50.00, 0, 1),
  ('basic', 'Pacote Básico', 250, 100.00, 25, 2),
  ('premium', 'Pacote Premium', 600, 200.00, 100, 3),
  ('mega', 'Pacote Mega', 1500, 450.00, 300, 4)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 8. Dados iniciais - Pricing Tiers
-- =====================================================
INSERT INTO pricing_tiers (name, display_name, price_coins, price_brl, description, display_order)
VALUES
  ('standard', 'Padrão', 150, 150.00, 'Personagem padrão', 1),
  ('premium', 'Premium', 200, 200.00, 'Personagem premium com detalhes extras', 2),
  ('deluxe', 'Deluxe', 250, 250.00, 'Personagem deluxe com acabamento especial', 3),
  ('exclusive', 'Exclusivo', 350, 350.00, 'Personagem exclusivo de edição limitada', 4)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE user_coins IS 'Saldo de moedas virtuais dos usuários';
COMMENT ON TABLE coin_packages IS 'Pacotes de moedas disponíveis para compra';
COMMENT ON TABLE coin_transactions IS 'Histórico de todas as transações de moedas';
COMMENT ON TABLE pricing_tiers IS 'Níveis de precificação para personagens';

COMMENT ON COLUMN user_coins.balance IS 'Saldo atual de moedas (não pode ser negativo)';
COMMENT ON COLUMN coin_packages.bonus_coins IS 'Moedas bônus incluídas no pacote';
COMMENT ON COLUMN coin_transactions.amount IS 'Quantidade de moedas (positivo = crédito, negativo = débito)';
COMMENT ON COLUMN coin_transactions.balance_after IS 'Saldo após a transação';
