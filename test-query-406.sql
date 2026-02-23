-- =====================================================
-- TESTE DA QUERY EXATA QUE CAUSA ERRO 406
-- =====================================================
-- Query: GET /rest/v1/chat_group_messages?select=created_at&group_id=eq.95b093fe-083d-4b64-9a67-8d3b281dcd23&order=created_at.desc&limit=1
-- =====================================================

-- 1. Simular a query exata
SELECT 
  'QUERY EXATA DO ERRO' as info,
  created_at 
FROM chat_group_messages 
WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
ORDER BY created_at DESC 
LIMIT 1;

-- 2. Verificar o plano de execução (para ver se RLS está bloqueando)
EXPLAIN (ANALYZE, BUFFERS)
SELECT created_at 
FROM chat_group_messages 
WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
ORDER BY created_at DESC 
LIMIT 1;

-- 3. Testar com diferentes níveis de permissão
-- Teste 1: Como superuser (deve funcionar sempre)
SET ROLE postgres;
SELECT 
  'TESTE COMO SUPERUSER (postgres)' as teste,
  COUNT(*) as total_resultados,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Funcionou'
    ELSE '⚠️ Sem resultados (mas sem erro 406)'
  END as status
FROM chat_group_messages 
WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23';

RESET ROLE;

-- Teste 2: Como usuário autenticado atual
SELECT 
  'TESTE COMO USUÁRIO ATUAL' as teste,
  auth.uid() as user_id,
  current_user as db_user,
  (SELECT COUNT(*) FROM chat_group_messages WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23') as total_mensagens,
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN '✅ É admin - deve ter acesso'
    WHEN EXISTS (
      SELECT 1 FROM chat_group_members 
      WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23' 
      AND user_id = auth.uid()
    ) THEN '✅ É membro - deve ter acesso'
    ELSE '❌ Não é admin nem membro - SEM ACESSO (causa erro 406)'
  END as status_acesso;

-- 4. Verificar a query REST exata que o Supabase gera
SELECT 
  'QUERY REST DO SUPABASE' as info,
  'GET /rest/v1/chat_group_messages' as endpoint,
  '?select=created_at' as param1,
  '&group_id=eq.95b093fe-083d-4b64-9a67-8d3b281dcd23' as param2,
  '&order=created_at.desc' as param3,
  '&limit=1' as param4;

-- 5. Testar a query via REST (simulação)
-- Esta é a query SQL que o Supabase REST API executa:
WITH rest_query AS (
  SELECT created_at 
  FROM chat_group_messages 
  WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
  ORDER BY created_at DESC 
  LIMIT 1
)
SELECT 
  'RESULTADO DA QUERY REST' as info,
  CASE 
    WHEN EXISTS (SELECT 1 FROM rest_query) THEN '✅ Query retorna dados'
    ELSE '⚠️ Query não retorna dados (mas não deve dar 406)'
  END as query_status,
  (SELECT created_at FROM rest_query) as ultimo_created_at;

-- 6. Verificar se há algum trigger ou função que possa causar 406
SELECT 
  'VERIFICAÇÃO DE TRIGGERS' as info,
  tgname as trigger_name,
  relname as table_name,
  proname as function_name
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE relname = 'chat_group_messages'
AND tgenabled != 'D';

-- 7. Causa mais provável do erro 406:
SELECT 
  'DIAGNÓSTICO FINAL' as titulo,
  'ERRO 406 (Not Acceptable) no Supabase REST API:' as descricao,
  'Este erro ocorre quando:' as causa_1,
  '1. RLS está habilitado na tabela' as item_1,
  '2. Nenhuma política SELECT permite o acesso' as item_2,
  '3. O usuário atual não satisfaz nenhuma condição das políticas' as item_3,
  '' as espaco,
  'SOLUÇÃO:' as solucao_titulo,
  'Execute o script fix-406-error-immediate.sql' as solucao_1,
  'Ele cria políticas que permitem:' as solucao_2,
  '  - Admins: acesso completo' as solucao_2a,
  '  - Membros do grupo: acesso às mensagens do seu grupo' as solucao_2b,
  '' as espaco2,
  'COMANDO RÁPIDO:' as comando_titulo,
  '-- Remover políticas antigas e criar novas:' as comando_1,
  'DROP POLICY IF EXISTS "authenticated_users_read_group_messages" ON chat_group_messages;' as comando_2,
  'CREATE POLICY "allow_read_group_messages_for_members" ON chat_group_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM chat_group_members WHERE chat_group_members.group_id = chat_group_messages.group_id AND chat_group_members.user_id = auth.uid()) OR has_role(auth.uid(), ''admin''::app_role));' as comando_3;