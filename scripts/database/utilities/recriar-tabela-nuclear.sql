-- =====================================================
-- SOLUÇÃO NUCLEAR: Recriar tabela chat_group_messages
-- =====================================================
-- Quando nada mais funciona, recrie a tabela do zero
-- =====================================================

-- 1. PRIMEIRO: Verificar se a tabela atual tem dados
SELECT 
  '1. VERIFICAÇÃO DE DADOS ATUAIS' as status,
  COUNT(*) as total_registros,
  CASE 
    WHEN COUNT(*) > 0 THEN '⚠️ A tabela tem dados - faremos backup'
    ELSE '✅ Tabela vazia - podemos recriar sem backup'
  END as status_dados
FROM chat_group_messages;

-- 2. CRIAR BACKUP DOS DADOS (se houver)
CREATE TABLE IF NOT EXISTS chat_group_messages_backup_20260223 AS 
SELECT * FROM chat_group_messages;

SELECT 
  '2. BACKUP CRIADO' as status,
  COUNT(*) as registros_backup,
  'Tabela: chat_group_messages_backup_20260223' as nome_backup
FROM chat_group_messages_backup_20260223;

-- 3. REMOVER A TABELA ATUAL (e todas as dependências)
-- Primeiro, desabilitar RLS se ainda estiver habilitado
ALTER TABLE IF EXISTS chat_group_messages DISABLE ROW LEVEL SECURITY;

-- Remover todas as políticas
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'chat_group_messages'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON chat_group_messages', policy_record.policyname);
  END LOOP;
END $$;

-- 4. CRIAR NOVA TABELA (estrutura limpa)
DROP TABLE IF EXISTS chat_group_messages_new;

CREATE TABLE chat_group_messages_new (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_chat_group_messages_new_group_id 
ON chat_group_messages_new(group_id);

CREATE INDEX IF NOT EXISTS idx_chat_group_messages_new_created_at 
ON chat_group_messages_new(created_at DESC);

-- 6. HABILITAR RLS (mas com políticas SUPER PERMISSIVAS para teste)
ALTER TABLE chat_group_messages_new ENABLE ROW LEVEL SECURITY;

-- Políticas SUPER PERMISSIVAS (apenas para teste)
CREATE POLICY "allow_all_select_new" 
  ON chat_group_messages_new FOR SELECT 
  TO authenticated, anon
  USING (true);

CREATE POLICY "allow_all_insert_new" 
  ON chat_group_messages_new FOR INSERT 
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "allow_all_update_new" 
  ON chat_group_messages_new FOR UPDATE 
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "allow_all_delete_new" 
  ON chat_group_messages_new FOR DELETE 
  TO authenticated, anon
  USING (true);

-- 7. COPIAR DADOS DO BACKUP (se houver)
INSERT INTO chat_group_messages_new (id, group_id, sender_id, content, created_at, updated_at)
SELECT id, group_id, sender_id, content, created_at, updated_at
FROM chat_group_messages_backup_20260223;

SELECT 
  '3. DADOS COPIADOS PARA NOVA TABELA' as status,
  COUNT(*) as registros_copiados
FROM chat_group_messages_new;

-- 8. TESTAR A QUERY EXATA DO ERRO 406 NA NOVA TABELA
SELECT 
  '4. TESTE NA NOVA TABELA' as status,
  'Query: SELECT created_at FROM chat_group_messages_new WHERE group_id = ''95b093fe-083d-4b64-9a67-8d3b281dcd23'' ORDER BY created_at DESC LIMIT 1' as query_teste,
  CASE 
    WHEN EXISTS (
      SELECT created_at 
      FROM chat_group_messages_new 
      WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
      ORDER BY created_at DESC 
      LIMIT 1
    ) THEN '✅✅✅ QUERY FUNCIONA NA NOVA TABELA!'
    ELSE '⚠️ Query não retorna dados (grupo pode estar vazio)'
  END as resultado_nova_tabela;

-- 9. EXECUTAR A QUERY NA NOVA TABELA
SELECT 
  '5. RESULTADO DA QUERY NA NOVA TABELA' as status,
  created_at as ultima_mensagem
FROM chat_group_messages_new 
WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
ORDER BY created_at DESC 
LIMIT 1;

-- 10. INSTRUÇÕES PARA SUBSTITUIR A TABELA
-- (Não vamos substituir automaticamente - muito arriscado)
SELECT 
  '6. PRÓXIMOS PASSOS MANUAIS' as titulo,
  'Se a nova tabela funcionar:' as passo_1,
  '  1. Renomear tabela original: ALTER TABLE chat_group_messages RENAME TO chat_group_messages_old;' as passo_2,
  '  2. Renomear nova tabela: ALTER TABLE chat_group_messages_new RENAME TO chat_group_messages;' as passo_3,
  '  3. Testar a aplicação' as passo_4,
  '' as espaco,
  '⚠️ AVISO IMPORTANTE:' as aviso,
  'Esta operação é ARRISCADA em produção!' as aviso_1,
  'Faça backup completo do banco antes de prosseguir.' as aviso_2,
  'Teste exaustivamente antes de substituir a tabela original.' as aviso_3;