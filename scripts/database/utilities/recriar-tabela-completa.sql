-- =====================================================
-- OPÇÃO NUCLEAR 2: Recriar tabela do zero
-- =====================================================
-- Se desabilitar RLS não resolver, recrie a tabela
-- =====================================================

-- 1. Primeiro, fazer backup dos dados (se houver)
CREATE TABLE IF NOT EXISTS chat_group_messages_backup AS 
SELECT * FROM chat_group_messages;

SELECT 
  '1. BACKUP CRIADO' as status,
  COUNT(*) as total_registros_backup
FROM chat_group_messages_backup;

-- 2. Remover constraints e dependências
-- Nota: Em produção, cuidado com foreign keys
SELECT 
  '2. VERIFICANDO DEPENDÊNCIAS' as status,
  'A tabela pode ter foreign keys para outras tabelas' as aviso;

-- 3. Recriar a tabela (versão simplificada)
-- Primeiro, criar nova tabela
DROP TABLE IF EXISTS chat_group_messages_new;

CREATE TABLE chat_group_messages_new (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Habilitar RLS na nova tabela
ALTER TABLE chat_group_messages_new ENABLE ROW LEVEL SECURITY;

-- 5. Criar políticas SUPER SIMPLES (apenas para teste)
CREATE POLICY "test_read_all" 
  ON chat_group_messages_new FOR SELECT 
  TO authenticated, anon
  USING (true);

CREATE POLICY "test_insert_auth" 
  ON chat_group_messages_new FOR INSERT 
  TO authenticated
  WITH CHECK (true);

-- 6. Copiar dados do backup (se necessário)
INSERT INTO chat_group_messages_new (id, group_id, sender_id, content, created_at, updated_at)
SELECT id, group_id, sender_id, content, created_at, updated_at
FROM chat_group_messages_backup;

SELECT 
  '3. DADOS COPIADOS' as status,
  COUNT(*) as registros_copiados
FROM chat_group_messages_new;

-- 7. Testar a query
SELECT 
  '4. TESTE DA QUERY' as status,
  CASE 
    WHEN EXISTS (
      SELECT created_at 
      FROM chat_group_messages_new 
      WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
      ORDER BY created_at DESC 
      LIMIT 1
    ) THEN '✅✅✅ QUERY FUNCIONA NA NOVA TABELA!'
    ELSE '⚠️ Sem dados na nova tabela'
  END as resultado;

-- 8. Instruções para substituir a tabela original
-- (Em produção, isso requer mais cuidado com dependências)
SELECT 
  '5. PRÓXIMOS PASSOS (SE NECESSÁRIO)' as titulo,
  'Se a nova tabela funcionar:' as passo_1,
  '  1. Renomear tabela original: chat_group_messages -> chat_group_messages_old' as passo_2,
  '  2. Renomear nova tabela: chat_group_messages_new -> chat_group_messages' as passo_3,
  '  3. Verificar todas as dependências (triggers, views, etc.)' as passo_4,
  '' as espaco,
  '⚠️ AVISO:' as aviso,
  'Recriar tabelas em produção é ARRISCADO!' as aviso_detalhe,
  'Considere esta opção apenas se nada mais funcionar.' as aviso_final;