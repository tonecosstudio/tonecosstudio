-- Verificar usuarios
SELECT COUNT(*) as total_usuarios FROM auth.users;

SELECT id, email, created_at, last_sign_in_at 
FROM auth.users 
ORDER BY created_at;

-- Verificar profiles
SELECT COUNT(*) as total_profiles FROM profiles;

SELECT id, email, created_at 
FROM profiles 
ORDER BY created_at;

-- Verificar subscriptions
SELECT COUNT(*) as total_subscriptions FROM subscriptions;

-- Verificar standalone_purchases
SELECT COUNT(*) as total_standalone FROM standalone_purchases;

-- Verificar quotes
SELECT COUNT(*) as total_quotes FROM quotes;

-- Verificar CASCADE DELETE
SELECT 
  tc.table_name,
  kcu.column_name,
  rc.delete_rule
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
  AND rc.delete_rule = 'CASCADE'
ORDER BY tc.table_name;
