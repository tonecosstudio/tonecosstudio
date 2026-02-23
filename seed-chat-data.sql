-- =====================================================
-- Script para Popular Dados de Teste do Chat
-- =====================================================
-- Este script cria conversas de exemplo para testar o sistema de chat

-- 1. Criar conversas de teste
-- Nota: Substitua os user_id pelos IDs reais dos usuários do seu sistema

-- Conversa 1: Dúvida sobre pedido
INSERT INTO support_conversations (
  user_id,
  subject,
  status,
  priority,
  tags,
  created_at,
  last_message_at
) VALUES (
  (SELECT id FROM auth.users LIMIT 1), -- Pega o primeiro usuário
  'Dúvida sobre meu pedido #12345',
  'waiting_admin',
  'normal',
  ARRAY['pedido', 'duvida'],
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '30 minutes'
) RETURNING id;

-- Conversa 2: Solicitação de orçamento
INSERT INTO support_conversations (
  user_id,
  subject,
  status,
  priority,
  tags,
  created_at,
  last_message_at
) VALUES (
  (SELECT id FROM auth.users LIMIT 1 OFFSET 1), -- Pega o segundo usuário
  'Orçamento para produto personalizado',
  'waiting_admin',
  'high',
  ARRAY['orcamento'],
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '5 hours'
) RETURNING id;

-- Conversa 3: Reclamação
INSERT INTO support_conversations (
  user_id,
  subject,
  status,
  priority,
  tags,
  risk_flags,
  created_at,
  last_message_at
) VALUES (
  (SELECT id FROM auth.users LIMIT 1), -- Mesmo usuário da conversa 1
  'Produto chegou com defeito',
  'waiting_admin',
  'urgent',
  ARRAY['reclamacao', 'urgente'],
  ARRAY['cliente_conflito'],
  NOW() - INTERVAL '3 hours',
  NOW() - INTERVAL '1 hour'
) RETURNING id;

-- Conversa 4: Dúvida sobre assinatura
INSERT INTO support_conversations (
  user_id,
  subject,
  status,
  priority,
  tags,
  created_at,
  last_message_at
) VALUES (
  (SELECT id FROM auth.users LIMIT 1 OFFSET 2), -- Terceiro usuário
  'Como funciona a assinatura?',
  'waiting_customer',
  'normal',
  ARRAY['assinatura', 'duvida'],
  NOW() - INTERVAL '6 hours',
  NOW() - INTERVAL '2 hours'
) RETURNING id;

-- Conversa 5: Conversa resolvida
INSERT INTO support_conversations (
  user_id,
  subject,
  status,
  priority,
  tags,
  resolved_at,
  created_at,
  last_message_at
) VALUES (
  (SELECT id FROM auth.users LIMIT 1), -- Mesmo usuário
  'Informação sobre entrega',
  'resolved',
  'normal',
  ARRAY['pedido'],
  NOW() - INTERVAL '1 hour',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 hour'
) RETURNING id;

-- 2. Adicionar mensagens às conversas

-- Mensagens para Conversa 1
DO $$
DECLARE
  conv_id UUID;
  user_id UUID;
BEGIN
  -- Pegar IDs
  SELECT id INTO conv_id FROM support_conversations WHERE subject LIKE 'Dúvida sobre meu pedido%' LIMIT 1;
  SELECT user_id INTO user_id FROM support_conversations WHERE id = conv_id;
  
  -- Mensagem do cliente
  INSERT INTO support_messages (conversation_id, sender_id, sender_type, message, created_at)
  VALUES (
    conv_id,
    user_id,
    'customer',
    'Olá! Fiz um pedido há 3 dias e ainda não recebi o código de rastreamento. Pedido #12345',
    NOW() - INTERVAL '2 hours'
  );
  
  -- Mensagem do admin
  INSERT INTO support_messages (conversation_id, sender_id, sender_type, message, created_at)
  VALUES (
    conv_id,
    (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin' LIMIT 1),
    'admin',
    'Olá! Vou verificar o status do seu pedido. Um momento, por favor.',
    NOW() - INTERVAL '1 hour 30 minutes'
  );
  
  -- Nota interna
  INSERT INTO support_messages (conversation_id, sender_id, sender_type, message, is_internal, created_at)
  VALUES (
    conv_id,
    (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin' LIMIT 1),
    'admin',
    'Verificar com a produção o status deste pedido. Cliente parece ansioso.',
    true,
    NOW() - INTERVAL '1 hour 15 minutes'
  );
  
  -- Resposta do cliente
  INSERT INTO support_messages (conversation_id, sender_id, sender_type, message, created_at)
  VALUES (
    conv_id,
    user_id,
    'customer',
    'Obrigado! Fico no aguardo.',
    NOW() - INTERVAL '30 minutes'
  );
END $$;

-- Mensagens para Conversa 2
DO $$
DECLARE
  conv_id UUID;
  user_id UUID;
BEGIN
  SELECT id INTO conv_id FROM support_conversations WHERE subject LIKE 'Orçamento para produto%' LIMIT 1;
  SELECT user_id INTO user_id FROM support_conversations WHERE id = conv_id;
  
  INSERT INTO support_messages (conversation_id, sender_id, sender_type, message, created_at)
  VALUES (
    conv_id,
    user_id,
    'customer',
    'Gostaria de um orçamento para uma miniatura personalizada de 15cm. Tenho fotos de referência.',
    NOW() - INTERVAL '1 day'
  );
  
  INSERT INTO support_messages (conversation_id, sender_id, sender_type, message, created_at)
  VALUES (
    conv_id,
    user_id,
    'customer',
    'Vocês conseguem fazer em quanto tempo?',
    NOW() - INTERVAL '5 hours'
  );
END $$;

-- Mensagens para Conversa 3
DO $$
DECLARE
  conv_id UUID;
  user_id UUID;
BEGIN
  SELECT id INTO conv_id FROM support_conversations WHERE subject LIKE 'Produto chegou com defeito%' LIMIT 1;
  SELECT user_id INTO user_id FROM support_conversations WHERE id = conv_id;
  
  INSERT INTO support_messages (conversation_id, sender_id, sender_type, message, created_at)
  VALUES (
    conv_id,
    user_id,
    'customer',
    'Recebi meu pedido hoje mas o produto está com a pintura descascando. Estou muito decepcionado!',
    NOW() - INTERVAL '3 hours'
  );
  
  INSERT INTO support_messages (conversation_id, sender_id, sender_type, message, created_at)
  VALUES (
    conv_id,
    user_id,
    'customer',
    'Preciso de uma solução urgente. Paguei caro por isso.',
    NOW() - INTERVAL '1 hour'
  );
END $$;

-- Mensagens para Conversa 4
DO $$
DECLARE
  conv_id UUID;
  user_id UUID;
  admin_id UUID;
BEGIN
  SELECT id INTO conv_id FROM support_conversations WHERE subject LIKE 'Como funciona a assinatura%' LIMIT 1;
  SELECT user_id INTO user_id FROM support_conversations WHERE id = conv_id;
  SELECT id INTO admin_id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin' LIMIT 1;
  
  INSERT INTO support_messages (conversation_id, sender_id, sender_type, message, created_at)
  VALUES (
    conv_id,
    user_id,
    'customer',
    'Olá! Vi que vocês têm planos de assinatura. Como funciona?',
    NOW() - INTERVAL '6 hours'
  );
  
  INSERT INTO support_messages (conversation_id, sender_id, sender_type, message, created_at)
  VALUES (
    conv_id,
    admin_id,
    'admin',
    'Olá! Temos 3 planos de assinatura: Básico, Premium e Colecionador. Cada um oferece diferentes benefícios e descontos. Qual tipo de produto você tem interesse?',
    NOW() - INTERVAL '4 hours'
  );
  
  INSERT INTO support_messages (conversation_id, sender_id, sender_type, message, created_at)
  VALUES (
    conv_id,
    user_id,
    'customer',
    'Tenho interesse em miniaturas de personagens de anime. Qual plano você recomenda?',
    NOW() - INTERVAL '2 hours'
  );
END $$;

-- Mensagens para Conversa 5 (resolvida)
DO $$
DECLARE
  conv_id UUID;
  user_id UUID;
  admin_id UUID;
BEGIN
  SELECT id INTO conv_id FROM support_conversations WHERE subject LIKE 'Informação sobre entrega%' LIMIT 1;
  SELECT user_id INTO user_id FROM support_conversations WHERE id = conv_id;
  SELECT id INTO admin_id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin' LIMIT 1;
  
  INSERT INTO support_messages (conversation_id, sender_id, sender_type, message, created_at)
  VALUES (
    conv_id,
    user_id,
    'customer',
    'Qual o prazo de entrega para São Paulo?',
    NOW() - INTERVAL '1 day'
  );
  
  INSERT INTO support_messages (conversation_id, sender_id, sender_type, message, created_at)
  VALUES (
    conv_id,
    admin_id,
    'admin',
    'Para São Paulo, o prazo é de 5 a 7 dias úteis após a postagem.',
    NOW() - INTERVAL '20 hours'
  );
  
  INSERT INTO support_messages (conversation_id, sender_id, sender_type, message, created_at)
  VALUES (
    conv_id,
    user_id,
    'customer',
    'Perfeito! Obrigado pela informação.',
    NOW() - INTERVAL '1 hour'
  );
END $$;

-- 3. Verificar dados criados
SELECT 
  'Conversas criadas:' as info,
  COUNT(*) as total
FROM support_conversations;

SELECT 
  'Mensagens criadas:' as info,
  COUNT(*) as total
FROM support_messages;

-- 4. Listar conversas com contagem de mensagens
SELECT 
  c.id,
  c.subject,
  c.status,
  c.priority,
  c.tags,
  c.risk_flags,
  COUNT(m.id) as message_count,
  c.created_at,
  c.last_message_at
FROM support_conversations c
LEFT JOIN support_messages m ON m.conversation_id = c.id
GROUP BY c.id
ORDER BY c.last_message_at DESC;
