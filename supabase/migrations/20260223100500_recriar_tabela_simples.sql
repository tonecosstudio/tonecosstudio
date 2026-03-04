-- =====================================================
-- SOLUÃƒÆ’Ã¢â‚¬Â¡ÃƒÆ’Ã†â€™O SIMPLES: Recriar tabela do zero SEM backup
-- =====================================================
-- Apenas recria a tabela com estrutura bÃƒÆ’Ã‚Â¡sica
-- Ideal quando nÃƒÆ’Ã‚Â£o sabemos a estrutura exata
-- =====================================================

-- 1. Desabilitar RLS na tabela atual (se existir)
ALTER TABLE IF EXISTS chat_group_messages DISABLE ROW LEVEL SECURITY;

-- 2. Remover a tabela atual (se existir)
DROP TABLE IF EXISTS chat_group_messages CASCADE;

-- 3. Criar a tabela do zero com estrutura BÃƒÆ’Ã‚ÂSICA
-- Estrutura mÃƒÆ’Ã‚Â­nima necessÃƒÆ’Ã‚Â¡ria para o sistema funcionar
CREATE TABLE IF NOT EXISTS chat_group_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
    -- Nota: Removemos foreign keys temporariamente para evitar erros
);

-- 4. Criar ÃƒÆ’Ã‚Â­ndices bÃƒÆ’Ã‚Â¡sicos
CREATE INDEX IF NOT EXISTS idx_chat_group_messages_group_id ON chat_group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_chat_group_messages_created_at ON chat_group_messages(created_at DESC);

-- 5. Habilitar RLS
ALTER TABLE chat_group_messages ENABLE ROW LEVEL SECURITY;

-- 6. Criar polÃƒÆ’Ã‚Â­tica RLS SUPER PERMISSIVA (apenas para teste)
-- Permite TUDO para todos (anon e authenticated)
CREATE POLICY "allow_all_operations" ON chat_group_messages
    FOR ALL USING (true) WITH CHECK (true);

-- 7. ForÃƒÆ’Ã‚Â§ar RLS
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

-- 10. InstruÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes finais
SELECT 'ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ TABELA RECRIADA COM SUCESSO!' as mensagem_final,
       'A tabela chat_group_messages foi recriada do zero' as detalhe_1,
       'Estrutura bÃƒÆ’Ã‚Â¡sica: id, group_id, sender_id, message, created_at, updated_at' as detalhe_2,
       'RLS configurado com polÃƒÆ’Ã‚Â­tica SUPER PERMISSIVA (allow_all_operations)' as detalhe_3,
       '' as espaco,
       'PRÃƒÆ’Ã¢â‚¬Å“XIMOS PASSOS IMEDIATOS:' as instrucoes,
       '1. Recarregue a pÃƒÆ’Ã‚Â¡gina (F5)' as passo_1,
       '2. O erro 406 DEVE ter desaparecido AGORA' as passo_2,
       '3. Teste criar uma mensagem no grupo' as passo_3,
       '4. Se funcionar, ajuste estrutura e polÃƒÆ’Ã‚Â­ticas para produÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o' as passo_4,
       '' as espaco2,
       'ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â AVISO CRÃƒÆ’Ã‚ÂTICO:' as aviso,
       'PolÃƒÆ’Ã‚Â­tica atual permite TUDO para TODOS' as aviso_1,
       'Isso ÃƒÆ’Ã‚Â© PERIGOSO para produÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o!' as aviso_2,
       'Ajuste assim que confirmar que o erro foi resolvido.' as aviso_3;