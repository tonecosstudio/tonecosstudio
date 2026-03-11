-- =====================================================
-- Migration: Add Missing Profile Columns and Functions
-- Description: Adicionar colunas faltantes e funções admin
-- =====================================================

-- =====================================================
-- 1. Adicionar colunas faltantes na tabela profiles
-- =====================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS collector_level INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pieces_owned INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_spent DECIMAL(10,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_completion INTEGER DEFAULT 0;

-- Criar índices para as novas colunas
CREATE INDEX IF NOT EXISTS idx_profiles_collector_level ON profiles(collector_level);
CREATE INDEX IF NOT EXISTS idx_profiles_total_spent ON profiles(total_spent DESC);

-- =====================================================
-- 2. Função para listar usuários (admin)
-- =====================================================
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE(
  id UUID,
  email TEXT,
  full_name TEXT,
  display_name TEXT,
  role user_role,
  collector_level INTEGER,
  pieces_owned INTEGER,
  total_spent DECIMAL(10,2),
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Verificar se o usuário é admin
  IF public.current_user_role() NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem listar usuários';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.display_name,
    p.role,
    p.collector_level,
    p.pieces_owned,
    p.total_spent,
    p.created_at
  FROM profiles p
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. Função para atualizar estatísticas do perfil
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_profile_stats(
  profile_id UUID,
  new_pieces_owned INTEGER DEFAULT NULL,
  new_total_spent DECIMAL(10,2) DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET 
    pieces_owned = COALESCE(new_pieces_owned, pieces_owned),
    total_spent = COALESCE(new_total_spent, total_spent),
    collector_level = CASE
      WHEN COALESCE(new_pieces_owned, pieces_owned) >= 50 THEN 5
      WHEN COALESCE(new_pieces_owned, pieces_owned) >= 30 THEN 4
      WHEN COALESCE(new_pieces_owned, pieces_owned) >= 15 THEN 3
      WHEN COALESCE(new_pieces_owned, pieces_owned) >= 5 THEN 2
      ELSE 1
    END,
    updated_at = NOW()
  WHERE id = profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. Função para calcular completude do perfil
-- =====================================================
CREATE OR REPLACE FUNCTION public.calculate_profile_completion(profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
  completion INTEGER := 0;
  profile_record RECORD;
BEGIN
  SELECT * INTO profile_record FROM profiles WHERE id = profile_id;
  
  IF profile_record IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Email sempre existe (20%)
  completion := completion + 20;
  
  -- Nome completo (20%)
  IF profile_record.full_name IS NOT NULL AND profile_record.full_name != '' THEN
    completion := completion + 20;
  END IF;
  
  -- Display name (20%)
  IF profile_record.display_name IS NOT NULL AND profile_record.display_name != '' THEN
    completion := completion + 20;
  END IF;
  
  -- Tem peças (20%)
  IF profile_record.pieces_owned > 0 THEN
    completion := completion + 20;
  END IF;
  
  -- Já gastou algo (20%)
  IF profile_record.total_spent > 0 THEN
    completion := completion + 20;
  END IF;
  
  -- Atualizar o campo
  UPDATE profiles SET profile_completion = completion WHERE id = profile_id;
  
  RETURN completion;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. Trigger para atualizar profile_completion automaticamente
-- =====================================================
CREATE OR REPLACE FUNCTION public.trigger_update_profile_completion()
RETURNS TRIGGER AS $$
BEGIN
  NEW.profile_completion := (
    SELECT public.calculate_profile_completion(NEW.id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profile_completion ON profiles;
CREATE TRIGGER update_profile_completion
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_profile_completion();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON COLUMN profiles.display_name IS 'Nome de exibição do usuário';
COMMENT ON COLUMN profiles.collector_level IS 'Nível do colecionador (1-5) baseado em peças possuídas';
COMMENT ON COLUMN profiles.pieces_owned IS 'Quantidade total de peças que o usuário possui';
COMMENT ON COLUMN profiles.total_spent IS 'Valor total gasto pelo usuário';
COMMENT ON COLUMN profiles.profile_completion IS 'Percentual de completude do perfil (0-100)';

COMMENT ON FUNCTION public.admin_list_users IS 'Lista todos os usuários (apenas admins)';
COMMENT ON FUNCTION public.update_profile_stats IS 'Atualiza estatísticas do perfil do usuário';
COMMENT ON FUNCTION public.calculate_profile_completion IS 'Calcula o percentual de completude do perfil';
