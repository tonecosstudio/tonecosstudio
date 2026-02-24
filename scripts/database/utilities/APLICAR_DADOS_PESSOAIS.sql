-- ============================================
-- APLICAR NO SUPABASE SQL EDITOR
-- ============================================
-- Adiciona campos de dados pessoais, financeiros e UX

-- ============================================
-- 1. DADOS PESSOAIS E NOTIFICAÇÕES
-- ============================================

-- Dados Pessoais
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS whatsapp TEXT,
ADD COLUMN IF NOT EXISTS cpf TEXT,
ADD COLUMN IF NOT EXISTS birth_date DATE;

-- Preferências de Notificação
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS order_updates BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS marketing_emails BOOLEAN DEFAULT false;

-- Progresso do Perfil
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS profile_completion INTEGER DEFAULT 0;

-- Índices
CREATE INDEX IF NOT EXISTS idx_profiles_cpf ON profiles(cpf) WHERE cpf IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_whatsapp ON profiles(whatsapp) WHERE whatsapp IS NOT NULL;

-- Função para calcular completude do perfil
CREATE OR REPLACE FUNCTION calculate_profile_completion(profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
  completion INTEGER := 0;
  profile_record RECORD;
BEGIN
  SELECT * INTO profile_record FROM profiles WHERE id = profile_id;
  
  IF profile_record IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Cada campo vale pontos
  IF profile_record.full_name IS NOT NULL AND profile_record.full_name != '' THEN
    completion := completion + 10;
  END IF;
  
  IF profile_record.phone IS NOT NULL AND profile_record.phone != '' THEN
    completion := completion + 10;
  END IF;
  
  IF profile_record.whatsapp IS NOT NULL AND profile_record.whatsapp != '' THEN
    completion := completion + 5;
  END IF;
  
  IF profile_record.cpf IS NOT NULL AND profile_record.cpf != '' THEN
    completion := completion + 10;
  END IF;
  
  IF profile_record.birth_date IS NOT NULL THEN
    completion := completion + 10;
  END IF;
  
  IF profile_record.address IS NOT NULL THEN
    completion := completion + 15;
  END IF;
  
  IF profile_record.preferences_text IS NOT NULL AND profile_record.preferences_text != '' THEN
    completion := completion + 10;
  END IF;
  
  IF profile_record.preference_tags IS NOT NULL AND array_length(profile_record.preference_tags, 1) > 0 THEN
    completion := completion + 10;
  END IF;
  
  IF profile_record.username IS NOT NULL AND profile_record.username != '' THEN
    completion := completion + 10;
  END IF;
  
  IF profile_record.bio IS NOT NULL AND profile_record.bio != '' THEN
    completion := completion + 10;
  END IF;
  
  IF profile_record.avatar_url IS NOT NULL AND profile_record.avatar_url != '' THEN
    completion := completion + 5;
  END IF;
  
  RETURN completion;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar automaticamente a completude
CREATE OR REPLACE FUNCTION update_profile_completion()
RETURNS TRIGGER AS $$
BEGIN
  NEW.profile_completion := calculate_profile_completion(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_profile_completion ON profiles;
CREATE TRIGGER trigger_update_profile_completion
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_completion();

-- ============================================
-- 2. MÉTODOS DE PAGAMENTO
-- ============================================

CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  type TEXT NOT NULL CHECK (type IN ('credit_card', 'debit_card', 'pix', 'boleto')),
  
  -- Para cartões
  card_brand TEXT,
  card_last4 TEXT,
  card_holder_name TEXT,
  card_expiry_month INTEGER,
  card_expiry_year INTEGER,
  
  -- Para PIX
  pix_key TEXT,
  pix_key_type TEXT,
  
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, card_last4, card_expiry_month, card_expiry_year)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_default ON payment_methods(user_id, is_default) WHERE is_default = true;

-- RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own_payment_methods" ON payment_methods;
CREATE POLICY "users_select_own_payment_methods"
  ON payment_methods FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_insert_own_payment_methods" ON payment_methods;
CREATE POLICY "users_insert_own_payment_methods"
  ON payment_methods FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_update_own_payment_methods" ON payment_methods;
CREATE POLICY "users_update_own_payment_methods"
  ON payment_methods FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_delete_own_payment_methods" ON payment_methods;
CREATE POLICY "users_delete_own_payment_methods"
  ON payment_methods FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

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

-- Função para garantir apenas um método padrão por usuário
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

-- ============================================
-- 3. ATUALIZAR COMPLETUDE DOS PERFIS EXISTENTES
-- ============================================

UPDATE profiles SET updated_at = now();

-- ============================================
-- CONCLUÍDO!
-- ============================================
