-- Dar permissÃƒÂ£o para usuÃƒÂ¡rios autenticados executarem a funÃƒÂ§ÃƒÂ£o
GRANT EXECUTE ON FUNCTION admin_list_users() TO authenticated;

-- Garantir que a funÃƒÂ§ÃƒÂ£o pode acessar auth.users
GRANT SELECT ON auth.users TO postgres;
