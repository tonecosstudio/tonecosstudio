-- Script para testar o trigger de criação de perfil
-- Execute este script no SQL Editor do Supabase Dashboard

-- 1. Verificar se o trigger existe
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_profile_sync';

-- 2. Verificar se a função existe
SELECT 
  proname as function_name,
  prosrc as function_source
FROM pg_proc
WHERE proname = 'handle_user_profile';

-- 3. Verificar a estrutura da tabela profiles
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Testar manualmente a criação de um perfil
-- (Isso simula o que o trigger deveria fazer)
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_email TEXT := 'test@example.com';
BEGIN
  -- Tentar inserir um perfil de teste
  BEGIN
    INSERT INTO public.profiles (
      id, 
      email, 
      address, 
      preferences_text, 
      preference_tags,
      created_at, 
      updated_at
    )
    VALUES (
      test_user_id, 
      test_email, 
      NULL, 
      NULL, 
      NULL,
      NOW(), 
      NOW()
    );
    
    RAISE NOTICE 'Perfil de teste criado com sucesso para ID: %', test_user_id;
    
    -- Limpar o teste
    DELETE FROM public.profiles WHERE id = test_user_id;
    RAISE NOTICE 'Perfil de teste removido';
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERRO ao criar perfil de teste: %', SQLERRM;
  END;
END $$;

-- 5. Verificar se há algum constraint ou policy que possa estar bloqueando
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass;

-- 6. Verificar RLS policies na tabela profiles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles';
