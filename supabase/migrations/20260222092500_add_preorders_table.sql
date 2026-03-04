-- Criar tabela de pedidos (preorders) para templates dinÃƒÂ¢micos

CREATE TABLE IF NOT EXISTS preorders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  tracking_code TEXT,
  total_price DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ÃƒÂndices
CREATE INDEX IF NOT EXISTS idx_preorders_user_id ON preorders(user_id);
CREATE INDEX IF NOT EXISTS idx_preorders_status ON preorders(status);
CREATE INDEX IF NOT EXISTS idx_preorders_created_at ON preorders(created_at DESC);

-- RLS
ALTER TABLE preorders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preorders"
  ON preorders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all preorders"
  ON preorders FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert preorders"
  ON preorders FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update preorders"
  ON preorders FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger para updated_at
CREATE TRIGGER update_preorders_updated_at
  BEFORE UPDATE ON preorders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ComentÃƒÂ¡rio
COMMENT ON TABLE preorders IS 'Tabela de pedidos/prÃƒÂ©-vendas dos clientes';
COMMENT ON COLUMN preorders.status IS 'Status do pedido: pending, confirmed, in_production, ready, shipped, delivered, cancelled';
