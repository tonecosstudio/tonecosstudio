-- =====================================================
-- REMOVER FOREIGN KEYS TEMPORARIAMENTE
-- =====================================================
-- Problema: Erro 406 persiste mesmo com tabela recriada
-- Possível causa: Foreign keys problemáticas
-- =====================================================

-- 1. Remover a tabela atual
DROP TABLE IF EXISTS chat_group_messages CASCADE;

-- 2. Recriar SEM foreign keys (apenas índices)
CREATE TABLE chat_group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Criar índices
CREATE INDEX idx_chat_group_messages_group_id ON chat_group_messages(group_id);
CREATE INDEX idx_chat_group_messages_created_at ON chat_group_messages(created_at DESC);
CREATE INDEX idx_chat_group_messages_sender_id ON chat_group_messages(sender_id);

-- 4. Habilitar RLS
ALTER TABLE chat_group_messages ENABLE ROW LEVEL SECURITY;

-- 5. Política simples: qualquer usuário autenticado pode ler
CREATE POLICY "all_auth_users_read" ON chat_group_messages
  FOR SELECT
  TO authenticated
  USING (true);

-- 6. Verificar
SELECT 
  '✅ TABELA RECRIADA SEM FOREIGN KEYS' as status,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'chat_group_messages'
ORDER BY ordinal_position;

SELECT 
  '✅ ÍNDICES' as status,
  indexname
FROM pg_indexes
WHERE tablename = 'chat_group_messages';

SELECT 
  '✅ POLÍTICAS' as status,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'chat_group_messages';

-- 7. Teste
SELECT 
  '🧪 TESTE' as status,
  'Recarregue a página. Se funcionar, o problema era a foreign key.' as instrucao;