-- =====================================================
-- Migration: Create Coin Exchange Rate
-- Description: Taxa de câmbio entre moedas e reais
-- =====================================================

-- =====================================================
-- COIN_EXCHANGE_RATE - Taxa de câmbio
-- =====================================================
CREATE TABLE IF NOT EXISTS coin_exchange_rate (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coins_per_real DECIMAL(10,4) NOT NULL CHECK (coins_per_real > 0),
  real_per_coin DECIMAL(10,4) NOT NULL CHECK (real_per_coin > 0),
  is_active BOOLEAN DEFAULT true,
  effective_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX idx_coin_exchange_rate_active ON coin_exchange_rate(is_active);
CREATE INDEX idx_coin_exchange_rate_effective ON coin_exchange_rate(effective_date DESC);

-- RLS
ALTER TABLE coin_exchange_rate ENABLE ROW LEVEL SECURITY;

-- Todos podem ver taxa ativa
CREATE POLICY "Anyone can view active exchange rate"
  ON coin_exchange_rate FOR SELECT
  USING (is_active = true);

-- Admins podem ver todas
CREATE POLICY "Admins can view all exchange rates"
  ON coin_exchange_rate FOR SELECT
  USING (public.current_user_role() IN ('admin', 'super_admin'));

-- Apenas admins podem modificar
CREATE POLICY "Admins can manage exchange rates"
  ON coin_exchange_rate FOR ALL
  USING (public.current_user_role() IN ('admin', 'super_admin'))
  WITH CHECK (public.current_user_role() IN ('admin', 'super_admin'));

-- Trigger para updated_at
CREATE TRIGGER set_updated_at_coin_exchange_rate
  BEFORE UPDATE ON coin_exchange_rate
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- Dados iniciais - Taxa padrão 1:1
-- =====================================================
INSERT INTO coin_exchange_rate (coins_per_real, real_per_coin, is_active)
VALUES (1.0000, 1.0000, true);

-- =====================================================
-- Função para obter taxa de câmbio ativa
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_active_exchange_rate()
RETURNS TABLE(
  coins_per_real DECIMAL(10,4),
  real_per_coin DECIMAL(10,4)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cer.coins_per_real,
    cer.real_per_coin
  FROM coin_exchange_rate cer
  WHERE cer.is_active = true
  ORDER BY cer.effective_date DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_active_exchange_rate() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_exchange_rate() TO anon;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE coin_exchange_rate IS 'Taxa de câmbio entre moedas virtuais e reais';
COMMENT ON COLUMN coin_exchange_rate.coins_per_real IS 'Quantas moedas equivalem a R$ 1,00';
COMMENT ON COLUMN coin_exchange_rate.real_per_coin IS 'Quantos reais equivalem a 1 moeda';
COMMENT ON FUNCTION public.get_active_exchange_rate IS 'Retorna a taxa de câmbio ativa atual';
