-- =====================================================
-- Migration: Create payment_methods Table
-- Description: Métodos de pagamento salvos pelos usuários
-- =====================================================

-- =====================================================
-- PAYMENT_METHODS (Métodos de pagamento dos usuários)
-- =====================================================
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit_card', 'debit_card', 'pix', 'bank_transfer')),
  nickname TEXT,
  is_default BOOLEAN DEFAULT false NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  
  -- Dados do cartão (criptografados no frontend)
  card_last_four TEXT,
  card_brand TEXT,
  card_holder_name TEXT,
  card_expiry_month INTEGER,
  card_expiry_year INTEGER,
  
  -- Dados PIX
  pix_key TEXT,
  pix_key_type TEXT CHECK (pix_key_type IN ('cpf', 'cnpj', 'email', 'phone', 'random')),
  
  -- Dados bancários
  bank_name TEXT,
  bank_code TEXT,
  account_type TEXT CHECK (account_type IN ('checking', 'savings')),
  account_number TEXT,
  account_holder_name TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices para performance
CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX idx_payment_methods_is_default ON payment_methods(is_default) WHERE is_default = true;
CREATE INDEX idx_payment_methods_is_active ON payment_methods(is_active) WHERE is_active = true;
CREATE INDEX idx_payment_methods_type ON payment_methods(type);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Usuários veem apenas seus próprios métodos
CREATE POLICY "payment_methods_select_own"
  ON payment_methods FOR SELECT
  USING (auth.uid() = user_id);

-- Usuários podem inserir seus próprios métodos
CREATE POLICY "payment_methods_insert_own"
  ON payment_methods FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar seus próprios métodos
CREATE POLICY "payment_methods_update_own"
  ON payment_methods FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem deletar seus próprios métodos
CREATE POLICY "payment_methods_delete_own"
  ON payment_methods FOR DELETE
  USING (auth.uid() = user_id);

-- Admins podem ver todos os métodos
CREATE POLICY "payment_methods_select_admin"
  ON payment_methods FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- TRIGGER
-- =====================================================

CREATE TRIGGER set_updated_at_payment_methods
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para garantir apenas um método padrão por usuário
CREATE OR REPLACE FUNCTION ensure_single_default_payment_method()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se está marcando como padrão, desmarcar todos os outros do mesmo usuário
  IF NEW.is_default = true THEN
    UPDATE payment_methods
    SET is_default = false,
        updated_at = NOW()
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER ensure_single_default_payment_method_trigger
  BEFORE INSERT OR UPDATE OF is_default ON payment_methods
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_single_default_payment_method();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE payment_methods IS 'Métodos de pagamento salvos pelos usuários';
COMMENT ON COLUMN payment_methods.type IS 'Tipo: credit_card, debit_card, pix, bank_transfer';
COMMENT ON COLUMN payment_methods.nickname IS 'Apelido do método (ex: Cartão Principal)';
COMMENT ON COLUMN payment_methods.is_default IS 'Método de pagamento padrão do usuário';
COMMENT ON COLUMN payment_methods.card_last_four IS 'Últimos 4 dígitos do cartão';
COMMENT ON COLUMN payment_methods.pix_key IS 'Chave PIX';
COMMENT ON COLUMN payment_methods.pix_key_type IS 'Tipo da chave PIX';

-- Recarregar schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
