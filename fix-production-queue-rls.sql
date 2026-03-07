-- ============================================================================
-- FIX: Políticas RLS para production_queue
-- ============================================================================
-- Este script corrige as políticas RLS para permitir que admins vejam
-- todos os registros de produção
-- ============================================================================

-- 1. Verificar se a função is_admin existe
SELECT EXISTS (
  SELECT 1 FROM pg_proc 
  WHERE proname = 'is_admin'
) as funcao_is_admin_existe;

-- 2. Se não existir, criar a função is_admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = $1
    AND user_roles.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_admin(UUID) IS 
  'Verifica se um usuário tem role de admin na tabela user_roles';

-- 3. Remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "Admins podem ver todos os registros de produção" ON production_queue;
DROP POLICY IF EXISTS "Admins podem atualizar todos os registros de produção" ON production_queue;
DROP POLICY IF EXISTS "Admins podem inserir registros de produção" ON production_queue;
DROP POLICY IF EXISTS "Admins podem deletar registros de produção" ON production_queue;
DROP POLICY IF EXISTS "Clientes podem ver seus próprios registros" ON production_queue;

-- 4. Criar novas políticas RLS

-- SELECT: Admins veem tudo, clientes veem apenas seus registros
CREATE POLICY "production_queue_select_policy"
ON production_queue
FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid())
  OR customer_id = auth.uid()
);

-- INSERT: Apenas admins e sistema podem inserir
CREATE POLICY "production_queue_insert_policy"
ON production_queue
FOR INSERT
TO authenticated
WITH CHECK (
  is_admin(auth.uid())
);

-- UPDATE: Apenas admins podem atualizar
CREATE POLICY "production_queue_update_policy"
ON production_queue
FOR UPDATE
TO authenticated
USING (
  is_admin(auth.uid())
)
WITH CHECK (
  is_admin(auth.uid())
);

-- DELETE: Apenas admins podem deletar
CREATE POLICY "production_queue_delete_policy"
ON production_queue
FOR DELETE
TO authenticated
USING (
  is_admin(auth.uid())
);

-- 5. Garantir que RLS está habilitado
ALTER TABLE production_queue ENABLE ROW LEVEL SECURITY;

-- 6. Verificar políticas criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'production_queue'
ORDER BY policyname;

-- 7. Testar se admin consegue ver dados
-- Execute como admin logado
SELECT 
  COUNT(*) as total_visivel,
  current_stage,
  priority
FROM production_queue
GROUP BY current_stage, priority;

-- 8. Verificar se há dados na tabela (como superuser)
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM production_queue;
  RAISE NOTICE 'Total de registros em production_queue: %', v_count;
  
  IF v_count = 0 THEN
    RAISE NOTICE '⚠️  Tabela está vazia. Execute seed-production-queue.sql para popular dados de teste.';
  ELSE
    RAISE NOTICE '✅ Tabela tem dados. Se ainda não aparecer no Hub, verifique se você está logado como admin.';
  END IF;
END $$;

-- 9. Verificar se usuário atual é admin
SELECT 
  auth.uid() as meu_user_id,
  is_admin(auth.uid()) as sou_admin,
  (SELECT email FROM auth.users WHERE id = auth.uid()) as meu_email;

-- 10. Ver quem são os admins
SELECT 
  ur.user_id,
  u.email,
  p.full_name,
  ur.role
FROM user_roles ur
LEFT JOIN auth.users u ON u.id = ur.user_id
LEFT JOIN profiles p ON p.id = ur.user_id
WHERE ur.role = 'admin';

-- ============================================================================
-- RESULTADO ESPERADO
-- ============================================================================
-- Após executar este script:
-- 1. ✅ Função is_admin() existe e funciona
-- 2. ✅ Políticas RLS estão criadas corretamente
-- 3. ✅ Admins conseguem ver todos os registros
-- 4. ✅ Clientes veem apenas seus próprios registros
-- 5. ✅ Hub de Produção mostra dados corretamente
-- ============================================================================
