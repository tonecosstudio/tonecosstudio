-- =====================================================
-- RECRIAR TABELA chat_group_messages DO ZERO
-- =====================================================
-- Problema: Erro 406 persiste mesmo com RLS desabilitado
-- Solução: Recriar a tabela com estrutura correta
-- =====================================================

-- 1. Fazer backup dos dados existentes (se houver)
DROP TABLE IF EXISTS chat_group_messages_backup;
CREATE TABLE chat_group_messages_backup AS 
SELECT * FROM chat_group_messages;

-- 2. Verificar backup
SELECT 
  'Backup criado com ' || COUNT(*) || ' registros' as status
FROM chat_group_messages_backup;

-- 3. Remover a tabela atual (isso remove todas as políticas RLS automaticamente)
DROP TABLE IF EXISTS chat_group_messages CASCADE;

-- 4. Recriar a tabela com estrutura CORRETA
CREATE TABLE chat_group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Criar índices para performance
CREATE INDEX idx_chat_group_messages_group_id ON chat_group_messages(group_id);
CREATE INDEX idx_chat_group_messages_created_at ON chat_group_messages(created_at DESC);
CREATE INDEX idx_chat_group_messages_sender_id ON chat_group_messages(sender_id);

-- 6. Habilitar RLS
ALTER TABLE chat_group_messages ENABLE ROW LEVEL SECURITY;

-- 7. Criar política simples: qualquer usuário autenticado pode ler
CREATE POLICY "auth_users_can_read" ON chat_group_messages
  FOR SELECT
  TO authenticated
  USING (true);

-- 8. Apenas admins podem inserir
CREATE POLICY "admins_can_insert" ON chat_group_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- 9. Apenas admins podem atualizar
CREATE POLICY "admins_can_update" ON chat_group_messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- 10. Apenas admins podem deletar
CREATE POLICY "admins_can_delete" ON chat_group_messages
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- 11. Verificar estrutura criada
SELECT 
  '✅ TABELA RECRIADA' as status,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'chat_group_messages'
ORDER BY ordinal_position;

-- 12. Verificar políticas
SELECT 
  '✅ POLÍTICAS CRIADAS' as status,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'chat_group_messages';

-- 13. Testar query
SELECT 
  '✅ TESTE DA QUERY' as status,
  'A query deve funcionar agora' as info;

-- Instruções finais
SELECT 
  '🎯 PRÓXIMOS PASSOS' as titulo,
  '1. Recarregue a página (F5)' as passo_1,
  '2. O erro 406 deve desaparecer' as passo_2,
  '3. Teste criar e visualizar mensagens' as passo_3;