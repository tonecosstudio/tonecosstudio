-- ============================================
-- VERIFICAR CASCADE DELETE EM auth.users
-- ============================================

-- Verificar todas as tabelas que têm CASCADE DELETE para auth.users
SELECT 
  tc.table_schema,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule,
  CASE 
    WHEN rc.delete_rule = 'CASCADE' THEN '⚠️ DELETARÁ DADOS SE USUÁRIO FOR DELETADO'
    WHEN rc.delete_rule = 'SET NULL' THEN 'ℹ️ Setará NULL se usuário for deletado'
    WHEN rc.delete_rule = 'RESTRICT' THEN '✅ Impedirá deleção se houver dados'
    ELSE rc.delete_rule
  END as impacto
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

-- Verificar se algum usuário foi deletado recentemente
SELECT 
  '=== USUÁRIOS DELETADOS (se houver coluna deleted_at) ===' as info;

SELECT 
  id,
  email,
  created_at,
  deleted_at,
  last_sign_in_at
FROM auth.users
WHERE deleted_at IS NOT NULL
ORDER BY deleted_at DESC;

-- Contar usuários ativos vs deletados
SELECT 
  COUNT(*) FILTER (WHERE deleted_at IS NULL) as usuarios_ativos,
  COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as usuarios_deletados,
  COUNT(*) as total
FROM auth.users;
