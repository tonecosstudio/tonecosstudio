-- SOLUÇÃO ALTERNATIVA: Desabilitar trigger problemático e usar outra abordagem

-- Passo 1: Desabilitar o trigger que está causando erro
DROP TRIGGER IF EXISTS on_auth_user_profile_sync ON auth.users;

-- Passo 2: Remover a função problemática
DROP FUNCTION IF EXISTS public.handle_user_profile() CASCADE;

-- Passo 3: Garantir que a tabela profiles tem as permissões corretas
GRANT ALL ON public.profiles TO postgres, service_role, authenticated, anon;

-- Passo 4: Desabilitar RLS temporariamente para service_role
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Passo 5: Criar política que permite service_role fazer tudo
CREATE POLICY "Service role can do everything" ON public.profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Passo 6: Reabilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Passo 7: Verificar configuração
SELECT 
  'Trigger removido' as status,
  (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_profile_sync') as trigger_count,
  (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name = 'handle_user_profile') as function_count,
  (SELECT rowsecurity FROM pg_tables WHERE tablename = 'profiles' AND schemaname = 'public') as rls_enabled;

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✓ Trigger desabilitado';
  RAISE NOTICE '✓ Permissões configuradas';
  RAISE NOTICE '✓ Agora o profile será criado pelo código da aplicação';
END;
$$;
