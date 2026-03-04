-- =====================================================
-- EXECUTE ESTE SQL NO SUPABASE SQL EDITOR
-- =====================================================
-- URL: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new
--
-- INSTRUÇÕES:
-- 1. Copie TODO este arquivo
-- 2. Cole no SQL Editor do Supabase
-- 3. Clique em "Run" (ou pressione Ctrl+Enter)
-- 4. Aguarde a mensagem de sucesso
-- 5. Teste o OAuth novamente
-- =====================================================

-- Passo 1: Remover trigger e função existentes (se houver)
DROP TRIGGER IF EXISTS on_auth_user_profile_sync ON auth.users;
DROP FUNCTION IF EXISTS public.handle_user_profile() CASCADE;

-- Passo 2: Criar função com RLS bypass
CREATE OR REPLACE FUNCTION public.handle_user_profile()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  -- Bypass RLS usando service_role
  PERFORM set_config('role', 'service_role', true);
  
  -- Inserir ou atualizar profile
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET 
    email = NEW.email,
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log erro mas não falha a criação do usuário
    RAISE WARNING 'Error in handle_user_profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Passo 3: Garantir permissões
GRANT EXECUTE ON FUNCTION public.handle_user_profile() TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.profiles TO postgres, service_role;

-- Passo 4: Criar trigger
CREATE TRIGGER on_auth_user_profile_sync
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_profile();

-- Passo 5: Criar profiles para usuários existentes (se houver)
INSERT INTO public.profiles (id, email, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.created_at, NOW()),
  NOW()
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = au.id)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = NOW();

-- Passo 6: Verificar se tudo foi criado corretamente
DO $$
DECLARE
  trigger_count INTEGER;
  function_count INTEGER;
BEGIN
  -- Verificar trigger
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE trigger_name = 'on_auth_user_profile_sync'
  AND event_object_table = 'users'
  AND event_object_schema = 'auth';
  
  -- Verificar função
  SELECT COUNT(*) INTO function_count
  FROM information_schema.routines
  WHERE routine_name = 'handle_user_profile'
  AND routine_schema = 'public';
  
  IF trigger_count = 0 THEN
    RAISE EXCEPTION 'ERRO: Trigger não foi criado!';
  END IF;
  
  IF function_count = 0 THEN
    RAISE EXCEPTION 'ERRO: Função não foi criada!';
  END IF;
  
  RAISE NOTICE '✓ Trigger criado com sucesso';
  RAISE NOTICE '✓ Função criada com sucesso';
  RAISE NOTICE '✓ OAuth fix aplicado - pronto para testar!';
END;
$$;

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
-- Se você viu as mensagens de sucesso acima, pode testar o OAuth!
-- Acesse: http://localhost:8080/login
-- Clique em "Continuar com Google"
-- =====================================================
