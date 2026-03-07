-- ============================================================================
-- Migration: Fix Profile Sync with Full Name
-- Description: Corrige trigger para sincronizar full_name de auth.users para profiles
-- Issue: Trigger atual só sincroniza email, não sincroniza nome do usuário
-- Date: 2026-05-13
-- ============================================================================

-- ============================================================================
-- PROBLEMA IDENTIFICADO:
-- ============================================================================
-- 1. Trigger handle_user_profile() só sincroniza email
-- 2. Campo full_name não é populado automaticamente
-- 3. raw_user_meta_data->>'name' não é extraído
-- 4. Profiles ficam com "Sem nome" no dashboard
-- ============================================================================

-- ============================================================================
-- SOLUÇÃO: Recriar trigger para sincronizar email E full_name
-- ============================================================================

-- 1. Adicionar coluna full_name se não existir
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT;

-- 2. Recriar função do trigger com sincronização completa
CREATE OR REPLACE FUNCTION public.handle_user_profile()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert or update profile with email AND full_name sync
  INSERT INTO public.profiles (
    id, 
    email,
    full_name,
    address, 
    preferences_text, 
    preference_tags,
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      SPLIT_PART(NEW.email, '@', 1)
    ),
    NULL, 
    NULL, 
    NULL,
    NOW(), 
    NOW()
  )
  ON CONFLICT (id) 
  DO UPDATE SET 
    email = NEW.email,
    full_name = COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      profiles.full_name,  -- Manter nome existente se não houver novo
      SPLIT_PART(NEW.email, '@', 1)
    ),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_user_profile() IS 
  'Trigger function to create/update user profiles and sync email + full_name from auth.users';

-- ============================================================================
-- SINCRONIZAR DADOS EXISTENTES
-- ============================================================================

-- Atualizar todos os profiles existentes com dados de auth.users
UPDATE profiles p
SET 
  email = COALESCE(p.email, u.email),
  full_name = COALESCE(
    p.full_name,
    u.raw_user_meta_data->>'name',
    u.raw_user_meta_data->>'full_name',
    SPLIT_PART(u.email, '@', 1)
  ),
  updated_at = NOW()
FROM auth.users u
WHERE p.id = u.id
AND (p.email IS NULL OR p.full_name IS NULL);

-- ============================================================================
-- GARANTIR QUE TODOS OS USUÁRIOS TÊM PROFILES
-- ============================================================================

-- Criar profiles para usuários que não têm
INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'name',
    au.raw_user_meta_data->>'full_name',
    SPLIT_PART(au.email, '@', 1)
  ),
  COALESCE(au.created_at, NOW()),
  NOW()
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = au.id)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================

DO $$
DECLARE
  v_users_count INTEGER;
  v_profiles_count INTEGER;
  v_profiles_without_name INTEGER;
BEGIN
  -- Contar usuários
  SELECT COUNT(*) INTO v_users_count FROM auth.users;
  
  -- Contar profiles
  SELECT COUNT(*) INTO v_profiles_count FROM profiles;
  
  -- Contar profiles sem nome
  SELECT COUNT(*) INTO v_profiles_without_name 
  FROM profiles 
  WHERE full_name IS NULL OR full_name = '';
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICAÇÃO DE SINCRONIZAÇÃO';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Total de usuários (auth.users): %', v_users_count;
  RAISE NOTICE 'Total de profiles: %', v_profiles_count;
  RAISE NOTICE 'Profiles sem nome: %', v_profiles_without_name;
  RAISE NOTICE '';
  
  IF v_users_count = v_profiles_count THEN
    RAISE NOTICE '✅ Todos os usuários têm profiles';
  ELSE
    RAISE WARNING '⚠️ Faltam % profiles', v_users_count - v_profiles_count;
  END IF;
  
  IF v_profiles_without_name = 0 THEN
    RAISE NOTICE '✅ Todos os profiles têm nome';
  ELSE
    RAISE WARNING '⚠️ % profiles sem nome', v_profiles_without_name;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- LOGS DE SUCESSO
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRAÇÃO CONCLUÍDA';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Trigger atualizado para sincronizar email + full_name';
  RAISE NOTICE '✅ Profiles existentes sincronizados';
  RAISE NOTICE '✅ Profiles faltantes criados';
  RAISE NOTICE '';
  RAISE NOTICE 'Sistema agora funciona end-to-end:';
  RAISE NOTICE '  1. Novo usuário criado → Profile criado automaticamente';
  RAISE NOTICE '  2. Email sincronizado automaticamente';
  RAISE NOTICE '  3. Nome sincronizado automaticamente';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
