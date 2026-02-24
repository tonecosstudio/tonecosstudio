-- Teste direto da Edge Function de email
-- Este script testa se a funcao esta respondendo corretamente

-- 1. Buscar uma conversa existente para teste
SELECT 
  '=== CONVERSAS DISPONIVEIS PARA TESTE ===' as info;

SELECT 
  sc.id as conversation_id,
  sc.subject,
  sc.user_id,
  p.email as email_cliente,
  p.full_name as nome_cliente
FROM support_conversations sc
JOIN profiles p ON sc.user_id = p.id
WHERE p.email IS NOT NULL
LIMIT 5;

-- 2. Buscar uma mensagem recente do admin
SELECT 
  '=== MENSAGENS DO ADMIN PARA TESTE ===' as info;

SELECT 
  sm.id as message_id,
  sm.conversation_id,
  sm.message,
  sc.user_id as recipient_user_id,
  p.email as email_destinatario
FROM support_messages sm
JOIN support_conversations sc ON sm.conversation_id = sc.id
JOIN profiles p ON sc.user_id = p.id
WHERE sm.sender_type = 'admin'
  AND p.email IS NOT NULL
ORDER BY sm.created_at DESC
LIMIT 5;

-- 3. Ver ultimas notificacoes (sucesso e falha)
SELECT 
  '=== ULTIMAS NOTIFICACOES ===' as info;

SELECT 
  en.created_at,
  en.status,
  en.error_message,
  en.retry_count,
  sc.subject,
  p.email
FROM email_notifications en
JOIN support_conversations sc ON en.conversation_id = sc.id
JOIN profiles p ON en.recipient_user_id = p.id
ORDER BY en.created_at DESC
LIMIT 10;

-- INSTRUCOES:
-- 1. Execute este script para ver os dados disponiveis
-- 2. Copie um conversation_id, message_id e recipient_user_id
-- 3. Use esses valores para testar a Edge Function manualmente no Supabase Dashboard
-- 4. Ou envie uma nova mensagem como admin no chat
