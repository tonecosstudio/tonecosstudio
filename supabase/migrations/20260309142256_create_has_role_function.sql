-- =====================================================
-- Migration: Create has_role Function
-- Description: Função para verificar se usuário tem determinada role
-- =====================================================

-- Função para verificar se o usuário atual tem uma role específica
CREATE OR REPLACE FUNCTION public.has_role(check_role user_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = check_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função alternativa com parâmetros diferentes (compatibilidade com código antigo)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = _user_id AND role = _role::user_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se o usuário é admin (admin ou super_admin)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se o usuário é super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter a role do usuário atual
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

COMMENT ON FUNCTION has_role IS 'Verifica se o usuário atual tem uma role específica';
COMMENT ON FUNCTION is_admin IS 'Verifica se o usuário atual é admin ou super_admin';
COMMENT ON FUNCTION is_super_admin IS 'Verifica se o usuário atual é super_admin';
COMMENT ON FUNCTION get_user_role IS 'Retorna a role do usuário atual';
