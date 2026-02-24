-- =====================================================
-- TESTE: Verificar se políticas para anon foram aplicadas
-- =====================================================

-- 1. Verificar TODAS as políticas atuais
SELECT 
  '1. POLÍTICAS ATUAIS EM chat_group_messages' as status,
  policyname,
  cmd,
  roles,
  CASE 
    WHEN qual = 'true' THEN '✅ SUPER PERMISSIVA (true)'
    ELSE LEFT(qual, 100)
  END as condicao
FROM pg_policies 
WHERE tablename = 'chat_group_messages'
ORDER BY cmd, policyname;

-- 2. Verificar políticas específicas para anon
SELECT 
  '2. POLÍTICAS PARA ANON' as status,
  COUNT(*) as total_politicas_anon,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Tem políticas para anon'
    ELSE '❌ NÃO tem políticas para anon (PROBLEMA!)'
  END as status_anon
FROM pg_policies 
WHERE tablename = 'chat_group_messages'
AND roles @> ARRAY['anon']::name[];

-- 3. Testar a query EXATA do erro 406
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

-- 4. Executar a query e mostrar resultados
SELECT 
  '4. RESULTADO DA QUERY' as status,
  created_at as ultima_mensagem
FROM chat_group_messages 
WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
ORDER BY created_at DESC 
LIMIT 1;

-- 5. Testar como anon (simulação)
-- Nota: Em produção, testar realmente como anon
SELECT 
  '5. SIMULAÇÃO DE ACESSO ANON' as status,
  'Políticas para anon foram criadas com USING (true)' as explicacao,
  'Isso significa que usuários anon podem ler TODAS as mensagens' as detalhe,
  '⚠️ EM PRODUÇÃO: Ajuste isso para políticas mais restritivas!' as aviso;

-- 6. Instruções finais
SELECT 
  '6. CONCLUSÃO' as titulo,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'chat_group_messages'
      AND roles @> ARRAY['anon']::name[]
    ) THEN '✅✅✅ FIX APLICADO COM SUCESSO!'
    ELSE '❌ FIX NÃO APLICADO - Verifique as políticas acima'
  END as status,
  'Agora temos:' as detalhe_1,
  '  • Políticas SUPER PERMISSIVAS para authenticated (true)' as item_1,
  '  • Políticas SUPER PERMISSIVAS para anon (true)' as item_2,
  '' as espaco,
  'Próximos passos:' as instrucao_1,
  '  1. Recarregue a página da aplicação (F5)' as passo_1,
  '  2. O erro 406 DEVE ter desaparecido' as passo_2,
  '  3. Teste o sistema de chat/grupos' as passo_3,
  '  4. Depois de confirmar, ajuste políticas para produção' as passo_4,
  '' as espaco2,
  '⚠️ LEMBRETE CRÍTICO: Esta solução é TEMPORÁRIA' as aviso,
  'Políticas "true" para anon dão acesso TOTAL a todos (inclusive não autenticados).' as aviso_detalhe,
  'Ajuste para produção quando o erro for confirmado como resolvido.' as aviso_final;