-- =====================================================
-- Migration: Set Super Admin
-- Description: Promover washingtonmsdj@gmail.com a super_admin
-- =====================================================

-- Função para promover usuário a super_admin por email
CREATE OR REPLACE FUNCTION promote_to_super_admin(user_email TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET role = 'super_admin'
  WHERE email = user_email;
  
  -- Se o perfil não existir ainda, criar com role super_admin
  IF NOT FOUND THEN
    -- Buscar o user_id do auth.users
    INSERT INTO profiles (id, email, role)
    SELECT id, email, 'super_admin'
    FROM auth.users
    WHERE email = user_email
    ON CONFLICT (id) DO UPDATE SET role = 'super_admin';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Promover washingtonmsdj@gmail.com a super_admin
-- Nota: Só funcionará depois que o usuário fizer login pela primeira vez
DO $$
BEGIN
  -- Tentar promover se o usuário já existe
  PERFORM promote_to_super_admin('washingtonmsdj@gmail.com');
END $$;

COMMENT ON FUNCTION promote_to_super_admin IS 'Promove um usuário a super_admin por email';
