-- Script para verificar configuração de email

-- 1. Verificar se a tabela email_notifications existe
SELECT 
  'email_notifications' as tabela,
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'email_notifications'
    ) THEN '✅ Existe'
    ELSE '❌ Não existe - Execute a migration'
  END as status;

-- 2. Verificar se o trigger existe
SELECT 
  'trigger_notify_new_message' as trigger_name,
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.triggers 
      WHERE trigger_name = 'trigger_notify_new_message'
    ) THEN '✅ Existe'
    ELSE '❌ Não existe - Execute a migration'
  END as status;

-- 3. Verificar se há notificações registradas
SELECT 
  'Notificações registradas' as item,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'sent') as enviadas,
  COUNT(*) FILTER (WHERE status = 'failed') as falhas,
  COUNT(*) FILTER (WHERE status = 'pending') as pendentes
FROM email_notifications;

-- 4. Ver últimas 5 notificações
SELECT 
  en.created_at,
  en.status,
  sc.subject as conversa,
  p.email as destinatario,
  en.error_message
FROM email_notifications en
LEFT JOIN support_conversations sc ON en.conversation_id = sc.id
LEFT JOIN profiles p ON en.recipient_user_id = p.id
ORDER BY en.created_at DESC
LIMIT 5;

-- 5. Verificar usuários com email cadastrado
SELECT 
  'Usuários com email' as item,
  COUNT(*) FILTER (WHERE email IS NOT NULL AND email != '') as com_email,
  COUNT(*) FILTER (WHERE email IS NULL OR email = '') as sem_email,
  COUNT(*) as total
FROM profiles;

-- 6. Verificar conversas ativas
SELECT 
  'Conversas ativas' as item,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status IN ('new', 'waiting_admin', 'waiting_customer')) as abertas
FROM support_conversations;
