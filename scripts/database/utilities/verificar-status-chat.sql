-- =====================================================
-- Script para Verificar Status do Sistema de Chat
-- =====================================================

-- 1. Verificar usuários cadastrados
SELECT 
  '=== USUÁRIOS CADASTRADOS ===' as info;

SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data->>'name' as nome,
  COALESCE(u.raw_user_meta_data->>'role', 'customer') as role,
  u.created_at
FROM auth.users u
ORDER BY u.created_at DESC
LIMIT 10;

-- 2. Verificar conversas criadas
SELECT 
  '=== CONVERSAS CRIADAS ===' as info;

SELECT 
  c.id,
  c.subject,
  u.email as usuario_email,
  c.status,
  c.priority,
  c.tags,
  c.risk_flags,
  c.created_at,
  c.last_message_at,
  (SELECT COUNT(*) FROM support_messages WHERE conversation_id = c.id) as total_mensagens
FROM support_conversations c
JOIN auth.users u ON u.id = c.user_id
ORDER BY c.last_message_at DESC;

-- 3. Verificar mensagens
SELECT 
  '=== MENSAGENS RECENTES ===' as info;

SELECT 
  m.id,
  c.subject as conversa,
  m.sender_type,
  m.is_internal,
  LEFT(m.message, 50) || '...' as preview_mensagem,
  m.created_at
FROM support_messages m
JOIN support_conversations c ON c.id = m.conversation_id
ORDER BY m.created_at DESC
LIMIT 20;

-- 4. Verificar templates de status
SELECT 
  '=== TEMPLATES DE STATUS ===' as info;

SELECT 
  status,
  subject,
  LEFT(message_template, 50) || '...' as preview_template
FROM order_status_templates
ORDER BY status;

-- 5. Verificar quick replies
SELECT 
  '=== QUICK REPLIES ===' as info;

SELECT 
  category,
  title,
  LEFT(message, 50) || '...' as preview_message,
  is_active
FROM quick_replies
ORDER BY category, display_order;

-- 6. Verificar bucket de storage
SELECT 
  '=== STORAGE BUCKETS ===' as info;

SELECT 
  id,
  name,
  public,
  created_at
FROM storage.buckets
WHERE id = 'support-attachments';

-- 7. Verificar políticas RLS do bucket
SELECT 
  '=== POLÍTICAS RLS DO BUCKET ===' as info;

SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%support-attachments%';

-- 8. Estatísticas gerais
SELECT 
  '=== ESTATÍSTICAS GERAIS ===' as info;

SELECT 
  'Total de usuários' as metrica,
  COUNT(*) as valor
FROM auth.users
UNION ALL
SELECT 
  'Total de conversas' as metrica,
  COUNT(*) as valor
FROM support_conversations
UNION ALL
SELECT 
  'Total de mensagens' as metrica,
  COUNT(*) as valor
FROM support_messages
UNION ALL
SELECT 
  'Conversas aguardando admin' as metrica,
  COUNT(*) as valor
FROM support_conversations
WHERE status = 'waiting_admin'
UNION ALL
SELECT 
  'Conversas aguardando cliente' as metrica,
  COUNT(*) as valor
FROM support_conversations
WHERE status = 'waiting_customer'
UNION ALL
SELECT 
  'Conversas resolvidas' as metrica,
  COUNT(*) as valor
FROM support_conversations
WHERE status = 'resolved'
UNION ALL
SELECT 
  'Mensagens internas' as metrica,
  COUNT(*) as valor
FROM support_messages
WHERE is_internal = true;
