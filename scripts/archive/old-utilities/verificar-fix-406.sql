-- =====================================================
-- VERIFICAÇÃO RÁPIDA: Fix do erro 406 aplicado?
-- =====================================================
-- Execute este script DEPOIS de aplicar fix-complete-406-final.sql
-- =====================================================

-- 1. Verificar se temos as 4 políticas necessárias
SELECT 
  '1. VERIFICAÇÃO DAS POLÍTICAS' as etapa,
  COUNT(*) as total_politicas,
  CASE 
    WHEN COUNT(*) = 4 THEN '✅ CORRETO - 4 políticas aplicadas'
    WHEN COUNT(*) > 4 THEN '⚠️ ATENÇÃO - Mais de 4 políticas (conflito)'
    WHEN COUNT(*) < 4 THEN '❌ PROBLEMA - Faltam políticas'
    ELSE '❌ ERRO - Nenhuma política'
  END as status
FROM pg_policies 
WHERE tablename = 'chat_group_messages';

-- 2. Listar as políticas específicas
SELECT 
  '2. LISTA DE POLÍTICAS' as etapa,
  policyname,
  cmd as operacao,
  CASE 
    WHEN cmd = 'SELECT' AND qual LIKE '%has_role%' AND qual LIKE '%chat_group_members%' THEN '✅ CORRETA'
    WHEN cmd = 'INSERT' AND with_check LIKE '%has_role%' AND with_check LIKE '%sender_id = auth.uid()%' THEN '✅ CORRETA'
    WHEN cmd = 'UPDATE' AND qual LIKE '%has_role%' AND qual LIKE '%sender_id = auth.uid()%' THEN '✅ CORRETA'
    WHEN cmd = 'DELETE' AND qual LIKE '%has_role%' AND qual LIKE '%sender_id = auth.uid()%' THEN '✅ CORRETA'
    ELSE '⚠️ VERIFICAR'
  END as validacao
FROM pg_policies 
WHERE tablename = 'chat_group_messages'
ORDER BY 
  CASE cmd 
    WHEN 'SELECT' THEN 1
    WHEN 'INSERT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
    ELSE 5
  END;

-- 3. Testar a query do erro
SELECT 
  '3. TESTE DA QUERY DO ERRO' as etapa,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM chat_group_messages 
      WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
      LIMIT 1
    ) THEN '✅ Dados encontrados'
    ELSE '⚠️ Sem dados (mas sem erro 406)'
  END as dados_existem,
  CASE 
    WHEN (
      SELECT COUNT(*) 
      FROM chat_group_messages 
      WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
    ) > 0 THEN '✅ Tem mensagens'
    ELSE '⚠️ Grupo vazio'
  END as mensagens_existem;

-- 4. Verificar função has_role
SELECT 
  '4. VERIFICAÇÃO DA FUNÇÃO has_role' as etapa,
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN '✅ Usuário atual é ADMIN'
    ELSE '⚠️ Usuário atual NÃO é admin'
  END as status_admin,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc WHERE proname = 'has_role'
    ) THEN '✅ Função has_role existe'
    ELSE '❌ Função has_role NÃO existe'
  END as funcao_existe;

-- 5. Verificar tipo app_role
SELECT 
  '5. VERIFICAÇÃO DO TIPO app_role' as etapa,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN '✅ Tipo app_role existe'
    ELSE '❌ Tipo app_role NÃO existe'
  END as tipo_existe,
  (SELECT STRING_AGG(enumlabel, ', ') FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) as valores;

-- 6. Resumo final
SELECT 
  '6. RESUMO FINAL' as etapa,
  CASE 
    WHEN (
      SELECT COUNT(*) FROM pg_policies WHERE tablename = 'chat_group_messages'
    ) = 4 
    AND EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role')
    AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role')
    THEN '✅ FIX APLICADO COM SUCESSO!'
    ELSE '❌ FIX INCOMPLETO - Verifique os itens acima'
  END as status_final,
  'Próximos passos:' as instrucao,
  '1. Recarregue a página da aplicação' as passo_1,
  '2. Teste o chat/grupos' as passo_2,
  '3. O erro 406 deve ter desaparecido' as passo_3,
  '4. Se persistir, execute diagnostic-group-406.sql' as passo_4;