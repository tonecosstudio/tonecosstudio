-- ============================================
-- PREVENIR FUTURAS PERDAS DE DADOS
-- ============================================
-- Execute este script AGORA para proteger dados futuros

-- PROBLEMA: CASCADE DELETE deleta dados em cascata
-- SOLUÇÃO: Mudar para RESTRICT (impede deleção se houver dados relacionados)

-- 1. Profiles - Impedir deleção de usuário se houver profile
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE profiles
ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id)
  REFERENCES auth.users(id)
  ON DELETE RESTRICT;

-- 2. Subscriptions - Impedir deleção de usuário se houver assinaturas
ALTER TABLE subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;

ALTER TABLE subscriptions
ADD CONSTRAINT subscriptions_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE RESTRICT;

-- 3. Standalone Purchases - Impedir deleção de usuário se houver compras
ALTER TABLE standalone_purchases
DROP CONSTRAINT IF EXISTS standalone_purchases_user_id_fkey;

ALTER TABLE standalone_purchases
ADD CONSTRAINT standalone_purchases_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE RESTRICT;

-- 4. Quotes - Impedir deleção de usuário se houver orçamentos
ALTER TABLE quotes
DROP CONSTRAINT IF EXISTS quotes_user_id_fkey;

ALTER TABLE quotes
ADD CONSTRAINT quotes_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE RESTRICT;

-- 5. User Roles - Impedir deleção de usuário se houver roles
ALTER TABLE user_roles
DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

ALTER TABLE user_roles
ADD CONSTRAINT user_roles_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE RESTRICT;

-- 6. Wishlist - Impedir deleção de usuário se houver wishlist
ALTER TABLE wishlist
DROP CONSTRAINT IF EXISTS wishlist_user_id_fkey;

ALTER TABLE wishlist
ADD CONSTRAINT wishlist_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE RESTRICT;

-- Verificar constraints atualizadas
SELECT 
  tc.table_name,
  kcu.column_name,
  rc.delete_rule,
  CASE 
    WHEN rc.delete_rule = 'RESTRICT' THEN '✅ PROTEGIDO'
    WHEN rc.delete_rule = 'CASCADE' THEN '⚠️ PERIGOSO'
    ELSE rc.delete_rule
  END as status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_schema = 'auth'
  AND ccu.table_name = 'users'
ORDER BY tc.table_name;

-- Resultado esperado: Todas as tabelas críticas devem ter delete_rule = 'RESTRICT'
