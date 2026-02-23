-- Script para testar envio de email manualmente
-- IMPORTANTE: Substitua os UUIDs pelos valores reais do seu banco

-- 1. Primeiro, vamos ver se temos conversas e usuários para testar
SELECT 
  'Conversas disponíveis para teste' as info,
  sc.id as conversation_id,
  sc.subject,
  sc.user_id,
  p.email as user_email,
  p.full_name as user_name
FROM support_conversations sc
JOIN profiles p ON sc.user_id = p.id
WHERE p.email IS NOT NULL
ORDER BY sc.created_at DESC
LIMIT 5;

-- 2. Ver mensagens recentes
SELECT 
  'Mensagens recentes' as info,
  sm.id as message_id,
  sm.conversation_id,
  sm.message,
  sm.sender_type,
  sm.created_at
FROM support_messages sm
ORDER BY sm.created_at DESC
LIMIT 5;

-- 3. Para testar, você pode criar uma mensagem de teste do admin
-- Substitua os valores abaixo pelos IDs reais:
/*
INSERT INTO support_messages (
  conversation_id,
  sender_id,
  sender_type,
  message
) VALUES (
  'UUID_DA_CONVERSA',  -- Pegue da query acima
  'UUID_DO_ADMIN',     -- ID do usuário admin
  'admin',
  'Teste de email - Esta é uma mensagem de teste do sistema de notificações'
);
*/

-- 4. Verificar se o email foi registrado
SELECT 
  'Últimas notificações de email' as info,
  en.*,
  sc.subject,
  p.email
FROM email_notifications en
JOIN support_conversations sc ON en.conversation_id = sc.id
JOIN profiles p ON en.recipient_user_id = p.id
ORDER BY en.created_at DESC
LIMIT 5;
