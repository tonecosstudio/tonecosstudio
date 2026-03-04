-- DESABILITAR TODOS OS TRIGGERS EM auth.users QUE PODEM ESTAR CAUSANDO ERRO

-- 1. Remover trigger de profile (múltiplas versões)
DROP TRIGGER IF EXISTS on_auth_user_profile_sync ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_or_updated ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Remover trigger de notificações
DROP TRIGGER IF EXISTS on_auth_user_created_notification_preferences ON auth.users;

-- 3. Remover trigger de grupos
DROP TRIGGER IF EXISTS trigger_add_new_user_to_welcome_group ON auth.users;

-- 4. Remover funções problemáticas
DROP FUNCTION IF EXISTS public.handle_user_profile() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.sync_user_email() CASCADE;
DROP FUNCTION IF EXISTS public.create_default_notification_preferences() CASCADE;
DROP FUNCTION IF EXISTS public.add_new_user_to_welcome_group() CASCADE;

-- 5. Garantir permissões corretas
GRANT ALL ON public.profiles TO postgres, service_role, authenticated, anon;
GRANT ALL ON public.notification_preferences TO postgres, service_role, authenticated, anon;

-- 6. Desabilitar RLS temporariamente
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences DISABLE ROW LEVEL SECURITY;

-- 7. Criar políticas permissivas para service_role
DROP POLICY IF EXISTS "Service role full access profiles" ON public.profiles;
CREATE POLICY "Service role full access profiles" ON public.profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access notifications" ON public.notification_preferences;
CREATE POLICY "Service role full access notifications" ON public.notification_preferences
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 8. Reabilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- 9. Verificar que todos os triggers foram removidos
SELECT 
  'Triggers removidos' as status,
  COUNT(*) as remaining_triggers
FROM information_schema.triggers
WHERE event_object_table = 'users'
AND event_object_schema = 'auth';

-- 10. Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✓ Todos os triggers removidos';
  RAISE NOTICE '✓ Permissões configuradas';
  RAISE NOTICE '✓ Agora tente criar um usuário via OAuth';
END;
$$;
