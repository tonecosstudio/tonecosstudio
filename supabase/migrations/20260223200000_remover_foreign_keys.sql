-- =====================================================
-- REMOVER FOREIGN KEYS TEMPORARIAMENTE
-- =====================================================
-- Problema: Erro 406 persiste mesmo com tabela recriada
-- PossÃƒÆ’Ã‚Â­vel causa: Foreign keys problemÃƒÆ’Ã‚Â¡ticas
-- =====================================================

-- 1. Remover a tabela atual
DROP TABLE IF EXISTS chat_group_messages CASCADE;

-- 2. Recriar SEM foreign keys (apenas ÃƒÆ’Ã‚Â­ndices)
CREATE TABLE IF NOT EXISTS chat_group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Criar ÃƒÆ’Ã‚Â­ndices
CREATE INDEX IF NOT EXISTS idx_chat_group_messages_group_id ON chat_group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_chat_group_messages_created_at ON chat_group_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_group_messages_sender_id ON chat_group_messages(sender_id);

-- 4. Habilitar RLS
ALTER TABLE chat_group_messages ENABLE ROW LEVEL SECURITY;

-- 5. PolÃƒÆ’Ã‚Â­tica simples: qualquer usuÃƒÆ’Ã‚Â¡rio autenticado pode ler
CREATE POLICY "all_auth_users_read" ON chat_group_messages
  FOR SELECT
  TO authenticated
  USING (true);

-- 6. Verificar
SELECT 
  'ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ TABELA RECRIADA SEM FOREIGN KEYS' as status,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'chat_group_messages'
ORDER BY ordinal_position;

SELECT 
  'ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ ÃƒÆ’Ã‚ÂNDICES' as status,
  indexname
FROM pg_indexes
WHERE tablename = 'chat_group_messages';

SELECT 
  'ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ POLÃƒÆ’Ã‚ÂTICAS' as status,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'chat_group_messages';

-- 7. Teste
SELECT 
  'ÃƒÂ°Ã…Â¸Ã‚Â§Ã‚Âª TESTE' as status,
  'Recarregue a pÃƒÆ’Ã‚Â¡gina. Se funcionar, o problema era a foreign key.' as instrucao;