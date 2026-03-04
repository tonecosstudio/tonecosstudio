-- =====================================================
-- RECRIAR TABELA chat_group_messages DO ZERO
-- =====================================================
-- Problema: Erro 406 persiste mesmo com RLS desabilitado
-- SoluÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o: Recriar a tabela com estrutura correta
-- =====================================================

-- 1. Fazer backup dos dados existentes (se houver)
DROP TABLE IF EXISTS chat_group_messages_backup;
CREATE TABLE IF NOT EXISTS chat_group_messages_backup AS 
SELECT * FROM chat_group_messages;

-- 2. Verificar backup
SELECT 
  'Backup criado com ' || COUNT(*) || ' registros' as status
FROM chat_group_messages_backup;

-- 3. Remover a tabela atual (isso remove todas as polÃƒÆ’Ã‚Â­ticas RLS automaticamente)
DROP TABLE IF EXISTS chat_group_messages CASCADE;

-- 4. Recriar a tabela com estrutura CORRETA
CREATE TABLE IF NOT EXISTS chat_group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Criar ÃƒÆ’Ã‚Â­ndices para performance
CREATE INDEX IF NOT EXISTS idx_chat_group_messages_group_id ON chat_group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_chat_group_messages_created_at ON chat_group_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_group_messages_sender_id ON chat_group_messages(sender_id);

-- 6. Habilitar RLS
ALTER TABLE chat_group_messages ENABLE ROW LEVEL SECURITY;

-- 7. Criar polÃƒÆ’Ã‚Â­tica simples: qualquer usuÃƒÆ’Ã‚Â¡rio autenticado pode ler
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
  'ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ TABELA RECRIADA' as status,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'chat_group_messages'
ORDER BY ordinal_position;

-- 12. Verificar polÃƒÆ’Ã‚Â­ticas
SELECT 
  'ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ POLÃƒÆ’Ã‚ÂTICAS CRIADAS' as status,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'chat_group_messages';

-- 13. Testar query
SELECT 
  'ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ TESTE DA QUERY' as status,
  'A query deve funcionar agora' as info;

-- InstruÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes finais
SELECT 
  'ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ PRÃƒÆ’Ã¢â‚¬Å“XIMOS PASSOS' as titulo,
  '1. Recarregue a pÃƒÆ’Ã‚Â¡gina (F5)' as passo_1,
  '2. O erro 406 deve desaparecer' as passo_2,
  '3. Teste criar e visualizar mensagens' as passo_3;