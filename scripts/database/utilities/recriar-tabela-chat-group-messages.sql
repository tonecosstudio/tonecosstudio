-- =====================================================
-- RECRIAR TABELA: chat_group_messages
-- =====================================================
-- Esta migration recria a tabela do zero para garantir
-- que ela existe e está configurada corretamente
-- =====================================================

-- 1. Verificar se a tabela existe
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'chat_group_messages') THEN
        RAISE NOTICE 'Tabela chat_group_messages JÁ EXISTE';
    ELSE
        RAISE NOTICE 'Tabela chat_group_messages NÃO EXISTE - será criada';
    END IF;
END $$;

-- 2. Dropar a tabela se existir (para recriar do zero)
DROP TABLE IF EXISTS chat_group_messages CASCADE;

-- 3. Recriar a tabela
CREATE TABLE chat_group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  
  message TEXT NOT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- CHECK constraint for message length (1-5000 characters)
  CONSTRAINT chat_group_messages_length CHECK (char_length(message) >= 1 AND char_length(message) <= 5000)
);

-- 4. Criar índices
CREATE INDEX idx_chat_group_messages_group_created ON chat_group_messages(group_id, created_at DESC);
CREATE INDEX idx_chat_group_messages_sender ON chat_group_messages(sender_id);

-- 5. Adicionar comentários
COMMENT ON TABLE chat_group_messages IS 'Stores broadcast messages sent to groups';
COMMENT ON COLUMN chat_group_messages.message IS 'Message content, limited to 1-5000 characters';
COMMENT ON COLUMN chat_group_messages.sender_id IS 'Admin user who sent the broadcast message';
COMMENT ON COLUMN chat_group_messages.group_id IS 'Group to which the message was broadcast';

-- 6. Conceder permissões
GRANT SELECT ON chat_group_messages TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON chat_group_messages TO authenticated, service_role;

-- 7. Habilitar RLS
ALTER TABLE chat_group_messages ENABLE ROW LEVEL SECURITY;

-- 8. Criar política permissiva para todos os usuários autenticados
CREATE POLICY "allow_all_authenticated"
  ON chat_group_messages
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 9. Verificar que a tabela foi criada
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_name = 'chat_group_messages';

-- 10. Verificar colunas
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'chat_group_messages'
ORDER BY ordinal_position;

-- 11. Verificar políticas
SELECT 
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'chat_group_messages';

-- 12. Mensagem de sucesso
DO $$ 
BEGIN
    RAISE NOTICE 'Tabela chat_group_messages recriada com sucesso!';
END $$;
