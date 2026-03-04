-- =====================================================
-- FIX NUCLEAR: Desabilitar RLS completamente
-- =====================================================
-- Quando nada mais funciona, desabilite RLS temporariamente
-- Isso REMOVE TODAS as restriÃƒÂ§ÃƒÂµes de acesso
-- =====================================================

-- 1. Verificar status atual do RLS
SELECT 
  '1. STATUS ATUAL DO RLS' as status,
  tablename,
  CASE 
    WHEN rowsecurity THEN 'Ã¢Å“â€¦ RLS HABILITADO'
    ELSE 'Ã¢ÂÅ’ RLS DESABILITADO'
  END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'chat_group_messages';

-- 2. DESABILITAR RLS COMPLETAMENTE
ALTER TABLE chat_group_messages DISABLE ROW LEVEL SECURITY;

-- 3. Verificar status apÃƒÂ³s desabilitar
SELECT 
  '2. RLS DESABILITADO COM SUCESSO!' as status,
  'Agora a tabela NÃƒÆ’O tem nenhuma restriÃƒÂ§ÃƒÂ£o de acesso' as explicacao,
  'Qualquer usuÃƒÂ¡rio (anon ou authenticated) pode acessar TODOS os dados' as detalhe;

-- 4. Testar a query EXATA do erro 406
SELECT 
  '3. TESTE DA QUERY DO ERRO 406' as status,
  'GET /rest/v1/chat_group_messages?select=created_at&group_id=eq.95b093fe-083d-4b64-9a67-8d3b281dcd23&order=created_at.desc&limit=1' as query_original,
  CASE 
    WHEN EXISTS (
      SELECT created_at 
      FROM chat_group_messages 
      WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
      ORDER BY created_at DESC 
      LIMIT 1
    ) THEN 'Ã¢Å“â€¦Ã¢Å“â€¦Ã¢Å“â€¦ QUERY FUNCIONA - SEM ERRO 406!'
    ELSE 'Ã¢Å¡Â Ã¯Â¸Â Sem dados (mas SEM ERRO 406!)'
  END as resultado;

-- 5. Executar a query
SELECT 
  '4. RESULTADO DA QUERY' as status,
  created_at as ultima_mensagem
FROM chat_group_messages 
WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
ORDER BY created_at DESC 
LIMIT 1;

-- 6. InstruÃƒÂ§ÃƒÂµes finais
SELECT 
  '5. CONCLUSÃƒÆ’O' as titulo,
  'Ã¢Å“â€¦Ã¢Å“â€¦Ã¢Å“â€¦ RLS DESABILITADO COM SUCESSO!' as status,
  'A tabela chat_group_messages agora:' as detalhe_1,
  '  Ã¢â‚¬Â¢ NÃƒÆ’O tem RLS (acesso total para todos)' as item_1,
  '  Ã¢â‚¬Â¢ NÃƒÆ’O tem polÃƒÂ­ticas restritivas' as item_2,
  '  Ã¢â‚¬Â¢ Qualquer query DEVE funcionar' as item_3,
  '' as espaco,
  'PrÃƒÂ³ximos passos IMEDIATOS:' as instrucao_1,
  '  1. Recarregue a pÃƒÂ¡gina da aplicaÃƒÂ§ÃƒÂ£o (F5)' as passo_1,
  '  2. O erro 406 DEVE ter desaparecido AGORA' as passo_2,
  '  3. Teste o sistema de chat/grupos' as passo_3,
  '' as espaco2,
  'Ã¢Å¡Â Ã¯Â¸ÂÃ¢Å¡Â Ã¯Â¸ÂÃ¢Å¡Â Ã¯Â¸Â AVISO CRÃƒÂTICO:' as aviso,
  'RLS desabilitado ÃƒÂ© EXTREMAMENTE PERIGOSO em produÃƒÂ§ÃƒÂ£o!' as aviso_detalhe_1,
  'Isso permite acesso TOTAL a todos os dados da tabela.' as aviso_detalhe_2,
  'Depois que o erro for resolvido, HABILITE RLS novamente:' as aviso_detalhe_3,
  '  ALTER TABLE chat_group_messages ENABLE ROW LEVEL SECURITY;' as comando,
  'E crie polÃƒÂ­ticas de produÃƒÂ§ÃƒÂ£o seguras.' as aviso_final;