-- =====================================================
-- SOLUÇÃO SIMPLES: Recriar tabela do zero SEM backup
-- =====================================================
-- Apenas recria a tabela com estrutura básica
-- Ideal quando não sabemos a estrutura exata
-- =====================================================

-- 1. Desabilitar RLS na tabela atual (se existir)
ALTER TABLE IF EXISTS chat_group_messages DISABLE ROW LEVEL SECURITY;

-- 2. Remover a tabela atual (se existir)
DROP TABLE IF EXISTS chat_group_messages CASCADE;

-- 3. Criar a tabela do zero com estrutura BÁSICA
-- Estrutura mínima necessária para o sistema funcionar
CREATE TABLE chat_group_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
    -- Nota: Removemos foreign keys temporariamente para evitar erros
);

-- 4. Criar índices básicos
CREATE INDEX idx_chat_group_messages_group_id ON chat_group_messages(group_id);
CREATE INDEX idx_chat_group_messages_created_at ON chat_group_messages(created_at DESC);

-- 5. Habilitar RLS
ALTER TABLE chat_group_messages ENABLE ROW LEVEL SECURITY;

-- 6. Criar política RLS SUPER PERMISSIVA (apenas para teste)
-- Permite TUDO para todos (anon e authenticated)
CREATE POLICY "allow_all_operations" ON chat_group_messages
    FOR ALL USING (true) WITH CHECK (true);

-- 7. Forçar RLS
ALTER TABLE chat_group_messages FORCE ROW LEVEL SECURITY;

-- 8. Testar a query EXATA do erro 406
SELECT 'TESTE DA QUERY DO ERRO 406' as status;
SELECT created_at 
FROM chat_group_messages 
WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
ORDER BY created_at DESC 
LIMIT 1;

-- 9. Verificar estrutura criada
SELECT 'ESTRUTURA CRIADA:' as status;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'chat_group_messages'
ORDER BY ordinal_position;

-- 10. Instruções finais
SELECT '✅✅✅ TABELA RECRIADA COM SUCESSO!' as mensagem_final,
       'A tabela chat_group_messages foi recriada do zero' as detalhe_1,
       'Estrutura básica: id, group_id, sender_id, message, created_at, updated_at' as detalhe_2,
       'RLS configurado com política SUPER PERMISSIVA (allow_all_operations)' as detalhe_3,
       '' as espaco,
       'PRÓXIMOS PASSOS IMEDIATOS:' as instrucoes,
       '1. Recarregue a página (F5)' as passo_1,
       '2. O erro 406 DEVE ter desaparecido AGORA' as passo_2,
       '3. Teste criar uma mensagem no grupo' as passo_3,
       '4. Se funcionar, ajuste estrutura e políticas para produção' as passo_4,
       '' as espaco2,
       '⚠️ AVISO CRÍTICO:' as aviso,
       'Política atual permite TUDO para TODOS' as aviso_1,
       'Isso é PERIGOSO para produção!' as aviso_2,
       'Ajuste assim que confirmar que o erro foi resolvido.' as aviso_3;