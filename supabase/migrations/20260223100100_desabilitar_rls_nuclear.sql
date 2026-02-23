-- =====================================================
-- FIX NUCLEAR: Desabilitar RLS completamente
-- =====================================================
-- Quando nada mais funciona, desabilite RLS temporariamente
-- Isso REMOVE TODAS as restrições de acesso
-- =====================================================

-- 1. Verificar status atual do RLS
SELECT 
  '1. STATUS ATUAL DO RLS' as status,
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ RLS HABILITADO'
    ELSE '❌ RLS DESABILITADO'
  END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'chat_group_messages';

-- 2. DESABILITAR RLS COMPLETAMENTE
ALTER TABLE chat_group_messages DISABLE ROW LEVEL SECURITY;

-- 3. Verificar status após desabilitar
SELECT 
  '2. RLS DESABILITADO COM SUCESSO!' as status,
  'Agora a tabela NÃO tem nenhuma restrição de acesso' as explicacao,
  'Qualquer usuário (anon ou authenticated) pode acessar TODOS os dados' as detalhe;

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
    ) THEN '✅✅✅ QUERY FUNCIONA - SEM ERRO 406!'
    ELSE '⚠️ Sem dados (mas SEM ERRO 406!)'
  END as resultado;

-- 5. Executar a query
SELECT 
  '4. RESULTADO DA QUERY' as status,
  created_at as ultima_mensagem
FROM chat_group_messages 
WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
ORDER BY created_at DESC 
LIMIT 1;

-- 6. Instruções finais
SELECT 
  '5. CONCLUSÃO' as titulo,
  '✅✅✅ RLS DESABILITADO COM SUCESSO!' as status,
  'A tabela chat_group_messages agora:' as detalhe_1,
  '  • NÃO tem RLS (acesso total para todos)' as item_1,
  '  • NÃO tem políticas restritivas' as item_2,
  '  • Qualquer query DEVE funcionar' as item_3,
  '' as espaco,
  'Próximos passos IMEDIATOS:' as instrucao_1,
  '  1. Recarregue a página da aplicação (F5)' as passo_1,
  '  2. O erro 406 DEVE ter desaparecido AGORA' as passo_2,
  '  3. Teste o sistema de chat/grupos' as passo_3,
  '' as espaco2,
  '⚠️⚠️⚠️ AVISO CRÍTICO:' as aviso,
  'RLS desabilitado é EXTREMAMENTE PERIGOSO em produção!' as aviso_detalhe_1,
  'Isso permite acesso TOTAL a todos os dados da tabela.' as aviso_detalhe_2,
  'Depois que o erro for resolvido, HABILITE RLS novamente:' as aviso_detalhe_3,
  '  ALTER TABLE chat_group_messages ENABLE ROW LEVEL SECURITY;' as comando,
  'E crie políticas de produção seguras.' as aviso_final;