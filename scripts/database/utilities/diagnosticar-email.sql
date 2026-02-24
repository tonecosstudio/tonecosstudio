-- Diagnóstico completo do sistema de email

-- 1. Verificar se há notificações registradas
SELECT 
  '=== NOTIFICAÇÕES REGISTRADAS ===' as secao;

SELECT 
  en.id,
  en.created_at,
  en.status,
  en.error_message,
  en.retry_count,
  sc.subject as conversa,
  p.email as destinatario,
  p.full_name as nome_destinatario
FROM email_notifications en
LEFT JOIN support_conversations sc ON en.conversation_id = sc.id
LEFT JOIN profiles p ON en.recipient_user_id = p.id
ORDER BY en.created_at DESC
LIMIT 10;

-- 2. Verificar mensagens recentes do admin
SELECT 
  '=== MENSAGENS DO ADMIN (últimas 10) ===' as secao;

SELECT 
  sm.id,
  sm.created_at,
  sm.sender_type,
  sm.message,
  sc.subject as conversa,
  sc.user_id as cliente_id,
  p.email as email_cliente
FROM support_messages sm
JOIN support_conversations sc ON sm.conversation_id = sc.id
LEFT JOIN profiles p ON sc.user_id = p.id
WHERE sm.sender_type = 'admin'
ORDER BY sm.created_at DESC
LIMIT 10;

-- 3. Verificar se o trigger existe
SELECT 
  '=== STATUS DO TRIGGER ===' as secao;

SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_notify_new_message';

-- 4. Verificar usuários com email
SELECT 
  '=== USUÁRIOS COM EMAIL ===' as secao;

SELECT 
  id,
  email,
  full_name,
  created_at
FROM profiles
WHERE email IS NOT NULL AND email != ''
ORDER BY created_at DESC
LIMIT 5;

-- 5. Verificar conversas ativas
SELECT 
  '=== CONVERSAS ATIVAS ===' as secao;

SELECT 
  sc.id,
  sc.subject,
  sc.status,
  sc.user_id,
  p.email as email_cliente,
  p.full_name as nome_cliente,
  sc.created_at
FROM support_conversations sc
LEFT JOIN profiles p ON sc.user_id = p.id
WHERE sc.status IN ('new', 'waiting_admin', 'waiting_customer')
ORDER BY sc.created_at DESC
LIMIT 5;

-- 6. Verificar se pg_net está habilitado (necessário para trigger automático)
SELECT 
  '=== EXTENSÕES INSTALADAS ===' as secao;

SELECT 
  extname,
  extversion
FROM pg_extension
WHERE extname IN ('pg_net', 'http');
