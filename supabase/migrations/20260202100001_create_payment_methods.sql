-- Sistema de MÃƒÂ©todos de Pagamento

CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  type TEXT NOT NULL CHECK (type IN ('credit_card', 'debit_card', 'pix', 'boleto')),
  
  -- Para cartÃƒÂµes
  card_brand TEXT, -- visa, mastercard, etc
  card_last4 TEXT, -- ÃƒÂºltimos 4 dÃƒÂ­gitos
  card_holder_name TEXT,
  card_expiry_month INTEGER,
  card_expiry_year INTEGER,
  
  -- Para PIX
  pix_key TEXT,
  pix_key_type TEXT, -- cpf, email, phone, random
  
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, card_last4, card_expiry_month, card_expiry_year)
);

-- ÃƒÂndices
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_default ON payment_methods(user_id, is_default) WHERE is_default = true;

-- RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- UsuÃƒÂ¡rios podem ver apenas seus prÃƒÂ³prios mÃƒÂ©todos
DROP POLICY IF EXISTS "users_select_own_payment_methods" ON payment_methods;
CREATE POLICY "users_select_own_payment_methods"
  ON payment_methods FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- UsuÃƒÂ¡rios podem inserir seus prÃƒÂ³prios mÃƒÂ©todos
DROP POLICY IF EXISTS "users_insert_own_payment_methods" ON payment_methods;
CREATE POLICY "users_insert_own_payment_methods"
  ON payment_methods FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UsuÃƒÂ¡rios podem atualizar seus prÃƒÂ³prios mÃƒÂ©todos
DROP POLICY IF EXISTS "users_update_own_payment_methods" ON payment_methods;
CREATE POLICY "users_update_own_payment_methods"
  ON payment_methods FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- UsuÃƒÂ¡rios podem deletar seus prÃƒÂ³prios mÃƒÂ©todos
DROP POLICY IF EXISTS "users_delete_own_payment_methods" ON payment_methods;
CREATE POLICY "users_delete_own_payment_methods"
  ON payment_methods FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Admins podem ver todos
DROP POLICY IF EXISTS "admins_select_payment_methods" ON payment_methods;
CREATE POLICY "admins_select_payment_methods"
  ON payment_methods FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- Trigger para updated_at
DROP TRIGGER IF EXISTS trigger_payment_methods_updated_at ON payment_methods;
CREATE TRIGGER trigger_payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- FunÃƒÂ§ÃƒÂ£o para garantir apenas um mÃƒÂ©todo padrÃƒÂ£o por usuÃƒÂ¡rio
CREATE OR REPLACE FUNCTION ensure_single_default_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE payment_methods 
    SET is_default = false 
    WHERE user_id = NEW.user_id 
    AND id != NEW.id 
    AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ensure_single_default_payment ON payment_methods;
CREATE TRIGGER trigger_ensure_single_default_payment
  BEFORE INSERT OR UPDATE ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_payment();
