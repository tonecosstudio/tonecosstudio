-- =====================================================
-- MIGRATION TEMPORÁRIA: Popular Dados de Teste do Chat
-- Esta migration será revertida após testes
-- =====================================================

-- 1. Criar conversas de teste
DO $$
DECLARE
  v_user_id UUID;
  v_admin_id UUID;
  v_conv_id UUID;
  v_user_count INT;
BEGIN
  -- Verificar se há usuários cadastrados
  SELECT COUNT(*) INTO v_user_count FROM auth.users;
  
  IF v_user_count = 0 THEN
    RAISE NOTICE 'Nenhum usuário encontrado. Não é possível criar conversas de teste.';
    RETURN;
  END IF;
  
  -- Pegar primeiro usuário (cliente)
  SELECT id INTO v_user_id FROM auth.users 
  WHERE raw_user_meta_data->>'role' IS NULL 
     OR raw_user_meta_data->>'role' != 'admin'
  LIMIT 1;
  
  -- Pegar primeiro admin
  SELECT id INTO v_admin_id FROM auth.users 
  WHERE raw_user_meta_data->>'role' = 'admin'
  LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Nenhum usuário cliente encontrado. Usando primeiro usuário disponível.';
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  END IF;
  
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
    v_user_id,
    'Dúvida sobre meu pedido #12345',
    'waiting_admin',
    'normal',
    ARRAY['pedido', 'duvida'],
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '30 minutes'
  ) RETURNING id INTO v_conv_id;
  
  -- Mensagens da conversa 1
  INSERT INTO support_messages (conversation_id, sender_id, sender_type, message, created_at)
  VALUES (
    v_conv_id,
    v_user_id,
    'customer',
    'Olá! Fiz um pedido há 3 dias e ainda não recebi o código de rastreamento. Pedido #12345',
    NOW() - INTERVAL '2 hours'
  );
  
  IF v_admin_id IS NOT NULL THEN
    INSERT INTO support_messages (conversation_id, sender_id, sender_type, message, created_at)
    VALUES (
      v_conv_id,
      v_admin_id,
      'admin',
      'Olá! Vou verificar o status do seu pedido. Um momento, por favor.',
      NOW() - INTERVAL '1 hour 30 minutes'
    );
    
    -- Nota interna
    INSERT INTO support_messages (conversation_id, sender_id, sender_type, message, is_internal, created_at)
    VALUES (
      v_conv_id,
      v_admin_id,
      'admin',
      'Verificar com a produção o status deste pedido. Cliente parece ansioso.',
      true,
      NOW() - INTERVAL '1 hour 15 minutes'
    );
  END IF;
  
  INSERT INTO support_messages (conversation_id, sender_id, sender_type, message, created_at)
  VALUES (
    v_conv_id,
    v_user_id,
    'customer',
    'Obrigado! Fico no aguardo.',
    NOW() - INTERVAL '30 minutes'
  );
  
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
    v_user_id,
    'Orçamento para produto personalizado',
    'waiting_admin',
    'high',
    ARRAY['orcamento'],
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '5 hours'
  ) RETURNING id INTO v_conv_id;
  
  INSERT INTO support_messages (conversation_id, sender_id, sender_type, message, created_at)
  VALUES (
    v_conv_id,
    v_user_id,
    'customer',
    'Gostaria de um orçamento para uma miniatura personalizada de 15cm. Tenho fotos de referência.',
    NOW() - INTERVAL '1 day'
  );
  
  INSERT INTO support_messages (conversation_id, sender_id, sender_type, message, created_at)
  VALUES (
    v_conv_id,
    v_user_id,
    'customer',
    'Vocês conseguem fazer em quanto tempo?',
    NOW() - INTERVAL '5 hours'
  );
  
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
    v_user_id,
    'Produto chegou com defeito',
    'waiting_admin',
    'urgent',
    ARRAY['reclamacao', 'urgente'],
    ARRAY['cliente_conflito'],
    NOW() - INTERVAL '3 hours',
    NOW() - INTERVAL '1 hour'
  ) RETURNING id INTO v_conv_id;
  
  INSERT INTO support_messages (conversation_id, sender_id, sender_type, message, created_at)
  VALUES (
    v_conv_id,
    v_user_id,
    'customer',
    'Recebi meu pedido hoje mas o produto está com a pintura descascando. Estou muito decepcionado!',
    NOW() - INTERVAL '3 hours'
  );
  
  INSERT INTO support_messages (conversation_id, sender_id, sender_type, message, created_at)
  VALUES (
    v_conv_id,
    v_user_id,
    'customer',
    'Preciso de uma solução urgente. Paguei caro por isso.',
    NOW() - INTERVAL '1 hour'
  );
  
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
    v_user_id,
    'Como funciona a assinatura?',
    'waiting_customer',
    'normal',
    ARRAY['assinatura', 'duvida'],
    NOW() - INTERVAL '6 hours',
    NOW() - INTERVAL '2 hours'
  ) RETURNING id INTO v_conv_id;
  
  INSERT INTO support_messages (conversation_id, sender_id, sender_type, message, created_at)
  VALUES (
    v_conv_id,
    v_user_id,
    'customer',
    'Olá! Vi que vocês têm planos de assinatura. Como funciona?',
    NOW() - INTERVAL '6 hours'
  );
  
  IF v_admin_id IS NOT NULL THEN
    INSERT INTO support_messages (conversation_id, sender_id, sender_type, message, created_at)
    VALUES (
      v_conv_id,
      v_admin_id,
      'admin',
      'Olá! Temos 3 planos de assinatura: Básico, Premium e Colecionador. Cada um oferece diferentes benefícios e descontos. Qual tipo de produto você tem interesse?',
      NOW() - INTERVAL '4 hours'
    );
  END IF;
  
  INSERT INTO support_messages (conversation_id, sender_id, sender_type, message, created_at)
  VALUES (
    v_conv_id,
    v_user_id,
    'customer',
    'Tenho interesse em miniaturas de personagens de anime. Qual plano você recomenda?',
    NOW() - INTERVAL '2 hours'
  );
  
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
    v_user_id,
    'Informação sobre entrega',
    'resolved',
    'normal',
    ARRAY['pedido'],
    NOW() - INTERVAL '1 hour',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 hour'
  ) RETURNING id INTO v_conv_id;
  
  INSERT INTO support_messages (conversation_id, sender_id, sender_type, message, created_at)
  VALUES (
    v_conv_id,
    v_user_id,
    'customer',
    'Qual o prazo de entrega para São Paulo?',
    NOW() - INTERVAL '1 day'
  );
  
  IF v_admin_id IS NOT NULL THEN
    INSERT INTO support_messages (conversation_id, sender_id, sender_type, message, created_at)
    VALUES (
      v_conv_id,
      v_admin_id,
      'admin',
      'Para São Paulo, o prazo é de 5 a 7 dias úteis após a postagem.',
      NOW() - INTERVAL '20 hours'
    );
  END IF;
  
  INSERT INTO support_messages (conversation_id, sender_id, sender_type, message, created_at)
  VALUES (
    v_conv_id,
    v_user_id,
    'customer',
    'Perfeito! Obrigado pela informação.',
    NOW() - INTERVAL '1 hour'
  );
  
  RAISE NOTICE 'Dados de teste criados com sucesso!';
  
END $$;

-- 2. Verificar dados criados
DO $$
DECLARE
  v_conv_count INT;
  v_msg_count INT;
BEGIN
  SELECT COUNT(*) INTO v_conv_count FROM support_conversations;
  SELECT COUNT(*) INTO v_msg_count FROM support_messages;
  
  RAISE NOTICE 'Total de conversas: %', v_conv_count;
  RAISE NOTICE 'Total de mensagens: %', v_msg_count;
END $$;
