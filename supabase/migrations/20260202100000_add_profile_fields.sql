-- Adicionar campos de dados pessoais e financeiros ao profiles

-- Dados Pessoais
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS whatsapp TEXT,
ADD COLUMN IF NOT EXISTS cpf TEXT,
ADD COLUMN IF NOT EXISTS birth_date DATE;

-- PreferÃƒÂªncias de NotificaÃƒÂ§ÃƒÂ£o
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS order_updates BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS marketing_emails BOOLEAN DEFAULT false;

-- Progresso do Perfil
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS profile_completion INTEGER DEFAULT 0;

-- ÃƒÂndices
CREATE INDEX IF NOT EXISTS idx_profiles_cpf ON profiles(cpf) WHERE cpf IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_whatsapp ON profiles(whatsapp) WHERE whatsapp IS NOT NULL;

-- FunÃƒÂ§ÃƒÂ£o para calcular completude do perfil
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

-- Atualizar completude de perfis existentes
UPDATE profiles SET updated_at = now();
