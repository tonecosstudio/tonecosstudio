-- =====================================================
-- SOLUÇÃO DEFINITIVA PARA ERRO 406
-- =====================================================
-- Esta solução recria a tabela chat_group_messages do zero
-- com a estrutura correta e políticas RLS básicas
-- =====================================================

-- 1. Primeiro, fazer backup dos dados atuais (se existirem)
CREATE TABLE IF NOT EXISTS chat_group_messages_backup AS 
SELECT * FROM chat_group_messages;

SELECT '1. BACKUP CRIADO' as status, 
       COUNT(*) as registros_backup 
FROM chat_group_messages_backup;

-- 2. Desabilitar RLS na tabela atual (se existir)
ALTER TABLE IF EXISTS chat_group_messages DISABLE ROW LEVEL SECURITY;

-- 3. Remover a tabela atual (se existir)
DROP TABLE IF EXISTS chat_group_messages CASCADE;

-- 4. Criar a tabela do zero com estrutura correta
CREATE TABLE chat_group_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 5. Criar índices para performance
CREATE INDEX idx_chat_group_messages_group_id ON chat_group_messages(group_id);
CREATE INDEX idx_chat_group_messages_created_at ON chat_group_messages(created_at DESC);
CREATE INDEX idx_chat_group_messages_sender_id ON chat_group_messages(sender_id);

-- 6. Habilitar RLS
ALTER TABLE chat_group_messages ENABLE ROW LEVEL SECURITY;

-- 7. Criar políticas RLS SUPER PERMISSIVAS (apenas para teste)
-- Política para SELECT: todos podem ler
CREATE POLICY "Permitir leitura para todos" ON chat_group_messages
    FOR SELECT USING (true);

-- Política para INSERT: qualquer autenticado pode inserir
CREATE POLICY "Permitir inserção para autenticados" ON chat_group_messages
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Política para UPDATE: apenas o criador pode editar
CREATE POLICY "Permitir atualização apenas do dono" ON chat_group_messages
    FOR UPDATE USING (auth.uid() = sender_id);

-- Política para DELETE: apenas o criador pode deletar
CREATE POLICY "Permitir deleção apenas do criador" ON chat_group_messages
    FOR DELETE USING (auth.uid() = sender_id);

-- 8. Habilitar RLS na tabela
ALTER TABLE chat_group_messages FORCE ROW LEVEL SECURITY;

-- 9. Recriar triggers para updated_at (se necessário)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chat_group_messages_updated_at 
BEFORE UPDATE ON chat_group_messages 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. Restaurar dados do backup (se houver)
INSERT INTO chat_group_messages (id, group_id, sender_id, content, created_at, updated_at)
SELECT id, group_id, sender_id, content, created_at, updated_at 
FROM chat_group_messages_backup;

-- 11. Testar a query que estava dando erro
SELECT 'TESTE DA QUERY ORIGINAL' as status;
SELECT created_at 
FROM chat_group_messages 
WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
ORDER BY created_at DESC 
LIMIT 1;

-- 12. Verificar se a tabela foi criada corretamente
SELECT 
    'Tabela recriada com sucesso!' as status,
    (SELECT COUNT(*) FROM chat_group_messages) as total_registros,
    (SELECT COUNT(*) FROM chat_group_messages WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23') as registros_grupo_alvo;

-- 13. Instruções finais
SELECT 'SOLUÇÃO APLICADA COM SUCESSO!' as mensagem_final,
       '1. A tabela chat_group_messages foi recriada do zero' as passo_1,
       '2. RLS configurado com políticas permissivas' as passo_2,
       '3. Dados restaurados do backup' as passo_3,
       '4. Teste a aplicação agora (F5 no navegador)' as passo_4,
       '5. Se funcionar, ajuste as políticas RLS para produção' as passo_5;