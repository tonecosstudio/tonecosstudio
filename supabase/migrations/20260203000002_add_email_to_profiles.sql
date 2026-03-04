-- Adicionar campo email na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Criar funÃƒÂ§ÃƒÂ£o para sincronizar email do auth.users para profiles
CREATE OR REPLACE FUNCTION public.sync_user_email()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Atualizar email no profile quando usuÃƒÂ¡rio ÃƒÂ© criado ou atualizado
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NOW(), NOW())
  ON CONFLICT (id) 
  DO UPDATE SET 
    email = NEW.email,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Criar trigger para sincronizar email automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created_or_updated ON auth.users;
CREATE TRIGGER on_auth_user_created_or_updated
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_email();

-- Popular emails existentes
INSERT INTO public.profiles (id, email, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(p.created_at, NOW()),
  NOW()
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
ON CONFLICT (id) 
DO UPDATE SET 
  email = EXCLUDED.email,
  updated_at = NOW();

COMMENT ON COLUMN public.profiles.email IS 'Email sincronizado de auth.users';
