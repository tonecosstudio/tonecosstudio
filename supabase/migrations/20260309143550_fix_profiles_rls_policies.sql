-- =====================================================
-- Migration: Fix Profiles RLS Policies
-- Description: Corrigir políticas RLS que estão causando erro 500
-- =====================================================

-- Remover todas as políticas existentes
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON profiles;

-- Criar políticas RLS simplificadas e seguras

-- 1. SELECT: Usuários podem ver seu próprio perfil OU admins podem ver todos
CREATE POLICY "profiles_select_policy"
  ON profiles FOR SELECT
  USING (
    auth.uid() = id 
    OR 
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'super_admin')
    )
  );

-- 2. INSERT: Permitir criação de perfis (via trigger)
CREATE POLICY "profiles_insert_policy"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 3. UPDATE: Usuários podem atualizar seu próprio perfil (sem mudar role)
--    OU admins podem atualizar qualquer perfil
CREATE POLICY "profiles_update_policy"
  ON profiles FOR UPDATE
  USING (
    auth.uid() = id
    OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    -- Se é o próprio usuário, não pode mudar a role
    (auth.uid() = id AND role = (SELECT role FROM profiles WHERE id = auth.uid()))
    OR
    -- Se é admin, pode fazer qualquer mudança
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'super_admin')
    )
  );

-- 4. DELETE: Apenas super_admins podem deletar perfis
CREATE POLICY "profiles_delete_policy"
  ON profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role = 'super_admin'
    )
  );

-- Atualizar função has_role para aceitar admin e super_admin
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Se está procurando por 'admin', aceita tanto 'admin' quanto 'super_admin'
  IF _role = 'admin' THEN
    RETURN EXISTS (
      SELECT 1 FROM profiles
      WHERE id = _user_id AND role IN ('admin', 'super_admin')
    );
  ELSE
    -- Para outras roles, verifica exatamente
    RETURN EXISTS (
      SELECT 1 FROM profiles
      WHERE id = _user_id AND role = _role::user_role
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON POLICY "profiles_select_policy" ON profiles IS 'Usuários veem próprio perfil, admins veem todos';
COMMENT ON POLICY "profiles_insert_policy" ON profiles IS 'Permite criação de perfil via trigger';
COMMENT ON POLICY "profiles_update_policy" ON profiles IS 'Usuários atualizam próprio perfil, admins atualizam todos';
COMMENT ON POLICY "profiles_delete_policy" ON profiles IS 'Apenas super_admins podem deletar';
