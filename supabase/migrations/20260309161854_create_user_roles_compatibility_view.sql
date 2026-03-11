-- =====================================================
-- Migration: Create User Roles Compatibility View
-- Description: View de compatibilidade para código antigo que usa user_roles
-- =====================================================

-- =====================================================
-- VIEW: user_roles (compatibilidade)
-- =====================================================

-- Esta view mapeia profiles.role para o formato antigo user_roles
-- para manter compatibilidade com código frontend legado

CREATE OR REPLACE VIEW user_roles AS
SELECT 
  id AS user_id,
  role
FROM profiles;

-- =====================================================
-- RLS para a view
-- =====================================================

-- Views herdam as permissões das tabelas base
ALTER VIEW user_roles SET (security_invoker = true);

-- =====================================================
-- Grant permissions
-- =====================================================

GRANT SELECT ON user_roles TO authenticated;
GRANT SELECT ON user_roles TO anon;

-- =====================================================
-- Reload Schema Cache
-- =====================================================

NOTIFY pgrst, 'reload schema';

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON VIEW user_roles IS 'View de compatibilidade que mapeia profiles.role para o formato antigo user_roles. Use profiles diretamente em código novo.';

COMMENT ON COLUMN user_roles.user_id IS 'ID do usuário (mapeado de profiles.id)';
COMMENT ON COLUMN user_roles.role IS 'Role do usuário: customer, admin, super_admin';

