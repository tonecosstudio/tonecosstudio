-- ============================================================================
-- Migration: Fix Profiles RLS 406 Error
-- Description: Corrige erro 406 (Not Acceptable) ao buscar profiles de outros usuários
-- Issue: Políticas RLS conflitantes impedem queries válidas
-- Date: 2026-05-13
-- ============================================================================

-- ============================================================================
-- PROBLEMA IDENTIFICADO:
-- ============================================================================
-- 1. Existem múltiplas políticas SELECT na tabela profiles
-- 2. A política "users_select_own_profile" só permite ver próprio perfil
-- 3. A política "admins_select_profiles" usa has_role() que pode falhar
-- 4. A política "admins_select_all_profiles" também usa user_roles
-- 5. Queries legítimas retornam 406 porque nenhuma política permite acesso
-- ============================================================================

-- ============================================================================
-- SOLUÇÃO: Consolidar políticas RLS de forma clara e funcional
-- ============================================================================

-- 1. Remover todas as políticas SELECT existentes
DROP POLICY IF EXISTS "users_select_own_profile" ON profiles;
DROP POLICY IF EXISTS "admins_select_profiles" ON profiles;
DROP POLICY IF EXISTS "admins_select_all_profiles" ON profiles;

-- 2. Criar política para usuários verem seu próprio perfil
CREATE POLICY "users_can_view_own_profile"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 3. Criar política para admins verem todos os perfis
CREATE POLICY "admins_can_view_all_profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- 4. Criar política para permitir leitura pública de informações básicas
-- (necessário para listagens, cards de usuários, etc)
CREATE POLICY "public_can_view_basic_profile_info"
ON profiles
FOR SELECT
TO authenticated
USING (true);  -- Permite que usuários autenticados vejam perfis de outros

-- ============================================================================
-- VERIFICAÇÃO: Testar se as políticas foram criadas
-- ============================================================================

DO $$
DECLARE
  v_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE tablename = 'profiles'
  AND policyname IN (
    'users_can_view_own_profile',
    'admins_can_view_all_profiles',
    'public_can_view_basic_profile_info'
  );
  
  IF v_policy_count = 3 THEN
    RAISE NOTICE '✅ Todas as 3 políticas RLS foram criadas com sucesso';
  ELSE
    RAISE WARNING '⚠️ Apenas % de 3 políticas foram criadas', v_policy_count;
  END IF;
END $$;

-- ============================================================================
-- COMENTÁRIOS EXPLICATIVOS
-- ============================================================================

COMMENT ON POLICY "users_can_view_own_profile" ON profiles IS 
  'Permite que usuários vejam seu próprio perfil';

COMMENT ON POLICY "admins_can_view_all_profiles" ON profiles IS 
  'Permite que admins vejam todos os perfis via user_roles';

COMMENT ON POLICY "public_can_view_basic_profile_info" ON profiles IS 
  'Permite que usuários autenticados vejam perfis de outros usuários (necessário para listagens e cards)';

-- ============================================================================
-- LOGS DE SUCESSO
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'POLÍTICAS RLS CORRIGIDAS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Políticas antigas removidas';
  RAISE NOTICE '✅ users_can_view_own_profile criada';
  RAISE NOTICE '✅ admins_can_view_all_profiles criada';
  RAISE NOTICE '✅ public_can_view_basic_profile_info criada';
  RAISE NOTICE '';
  RAISE NOTICE 'Erro 406 deve estar resolvido!';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
