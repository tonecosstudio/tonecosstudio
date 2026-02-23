-- Dar permissão para usuários autenticados executarem a função
GRANT EXECUTE ON FUNCTION admin_list_users() TO authenticated;

-- Garantir que a função pode acessar auth.users
GRANT SELECT ON auth.users TO postgres;
