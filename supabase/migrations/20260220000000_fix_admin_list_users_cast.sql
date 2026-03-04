-- Fix admin_list_users function to properly cast app_role enum to text
-- This fixes the "COALESCE could not convert type text[] to app_role[]" error

CREATE OR REPLACE FUNCTION admin_list_users()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  confirmed_at timestamptz,
  email_confirmed_at timestamptz,
  phone text,
  full_name text,
  profile_phone text,
  whatsapp text,
  cpf text,
  profile_completion integer,
  roles text[]
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  calling_user_id uuid;
  is_admin boolean;
BEGIN
  -- Pegar ID do usuÃƒÂ¡rio que estÃƒÂ¡ chamando
  calling_user_id := auth.uid();
  
  -- Verificar se o usuÃƒÂ¡rio estÃƒÂ¡ autenticado
  IF calling_user_id IS NULL THEN
    RAISE EXCEPTION 'NÃƒÂ£o autenticado';
  END IF;
  
  -- Verificar se ÃƒÂ© admin
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = calling_user_id AND role = 'admin'
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Acesso negado. Apenas admins podem listar usuÃƒÂ¡rios.';
  END IF;
  
  -- Retornar usuÃƒÂ¡rios com dados combinados
  RETURN QUERY
  SELECT 
    au.id,
    au.email::text,
    au.created_at,
    au.last_sign_in_at,
    au.confirmed_at,
    au.email_confirmed_at,
    au.phone::text,
    p.full_name,
    p.phone as profile_phone,
    p.whatsapp,
    p.cpf,
    p.profile_completion,
    COALESCE(
      ARRAY_AGG(ur.role::text) FILTER (WHERE ur.role IS NOT NULL),
      ARRAY[]::text[]
    ) as roles
  FROM auth.users au
  LEFT JOIN profiles p ON p.id = au.id
  LEFT JOIN user_roles ur ON ur.user_id = au.id
  GROUP BY 
    au.id, 
    au.email, 
    au.created_at, 
    au.last_sign_in_at,
    au.confirmed_at,
    au.email_confirmed_at,
    au.phone,
    p.full_name,
    p.phone,
    p.whatsapp,
    p.cpf,
    p.profile_completion
  ORDER BY au.created_at DESC;
END;
$$;
