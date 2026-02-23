-- =====================================================
-- Script para Remover Dados de Teste do Chat
-- ATENÇÃO: Use com cuidado! Isso vai deletar dados.
-- =====================================================

-- 1. Verificar o que será deletado
SELECT 
  '=== CONVERSAS QUE SERÃO DELETADAS ===' as info;

SELECT 
  c.id,
  c.subject,
  u.email as usuario_email,
  c.created_at,
  (SELECT COUNT(*) FROM support_messages WHERE conversation_id = c.id) as total_mensagens
FROM support_conversations c
JOIN auth.users u ON u.id = c.user_id
ORDER BY c.created_at DESC;

-- 2. Confirmar antes de executar
-- Descomente as linhas abaixo para executar a remoção

/*
-- Deletar mensagens primeiro (por causa da foreign key)
DELETE FROM support_messages 
WHERE conversation_id IN (
  SELECT id FROM support_conversations
);

-- Deletar conversas
DELETE FROM support_conversations;

-- Verificar resultado
SELECT 
  'Conversas deletadas' as status,
  COUNT(*) as total
FROM support_conversations;

SELECT 
  'Mensagens deletadas' as status,
  COUNT(*) as total
FROM support_messages;
*/

-- 3. Ou deletar apenas conversas de teste específicas
-- (baseado no subject que criamos)

/*
DELETE FROM support_messages 
WHERE conversation_id IN (
  SELECT id FROM support_conversations
  WHERE subject IN (
    'Dúvida sobre meu pedido #12345',
    'Orçamento para produto personalizado',
    'Produto chegou com defeito',
    'Como funciona a assinatura?',
    'Informação sobre entrega'
  )
);

DELETE FROM support_conversations
WHERE subject IN (
  'Dúvida sobre meu pedido #12345',
  'Orçamento para produto personalizado',
  'Produto chegou com defeito',
  'Como funciona a assinatura?',
  'Informação sobre entrega'
);
*/
