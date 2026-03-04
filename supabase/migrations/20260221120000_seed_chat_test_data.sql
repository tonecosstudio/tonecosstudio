-- =====================================================
-- MIGRATION TEMPORÃƒÂRIA: Popular Dados de Teste do Chat
-- Esta migration serÃƒÂ¡ revertida apÃƒÂ³s testes
-- =====================================================

-- 1. Criar conversas de teste
DO $$
DECLARE
  v_user_id UUID;
  v_admin_id UUID;
  v_conv_id UUID;
  v_user_count INT;
BEGIN
  -- Verificar se hÃƒÂ¡ usuÃƒÂ¡rios cadastrados
  SELECT COUNT(*) INTO v_user_count FROM auth.users;
  
  IF v_user_count = 0 THEN
    RAISE NOTICE 'Nenhum usuÃƒÂ¡rio encontrado. NÃƒÂ£o ÃƒÂ© possÃƒÂ­vel criar conversas de teste.';
    RETURN;
  END IF;
  
  -- Pegar primeiro usuÃƒÂ¡rio (cliente)
  SELECT id INTO v_user_id FROM auth.users 
  WHERE raw_user_meta_data->>'role' IS NULL 
     OR raw_user_meta_data->>'role' != 'admin'
  LIMIT 1;
  
  -- Pegar primeiro admin
  SELECT id INTO v_admin_id FROM auth.users 
  WHERE raw_user_meta_data->>'role' = 'admin'
  LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Nenhum usuÃƒÂ¡rio cliente encontrado. Usando primeiro usuÃƒÂ¡rio disponÃƒÂ­vel.';
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  END IF;
  
  -- Conversa 1: DÃƒÂºvida sobre pedido
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
    'DÃƒÂºvida sobre meu pedido #12345',
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
    'OlÃƒÂ¡! Fiz um pedido hÃƒÂ¡ 3 dias e ainda nÃƒÂ£o recebi o cÃƒÂ³digo de rastreamento. Pedido #12345',
    NOW() - INTERVAL '2 hours'
  );
  
  IF v_admin_id IS NOT NULL THEN
    INSERT INTO support_messages (conversation_id, sender_id, sender_type, message, created_at)
    VALUES (
      v_conv_id,
      v_admin_id,
      'admin',
      'OlÃƒÂ¡! Vou verificar o status do seu pedido. Um momento, por favor.',
      NOW() - INTERVAL '1 hour 30 minutes'
    );
    
    -- Nota interna
    INSERT INTO support_messages (conversation_id, sender_id, sender_type, message, is_internal, created_at)
    VALUES (
      v_conv_id,
      v_admin_id,
      'admin',
      'Verificar com a produÃƒÂ§ÃƒÂ£o o status deste pedido. Cliente parece ansioso.',
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
  
  -- Conversa 2: SolicitaÃƒÂ§ÃƒÂ£o de orÃƒÂ§amento
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
    'OrÃƒÂ§amento para produto personalizado',
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
    'Gostaria de um orÃƒÂ§amento para uma miniatura personalizada de 15cm. Tenho fotos de referÃƒÂªncia.',
    NOW() - INTERVAL '1 day'
  );
  
  INSERT INTO support_messages (conversation_id, sender_id, sender_type, message, created_at)
  VALUES (
    v_conv_id,
    v_user_id,
    'customer',
    'VocÃƒÂªs conseguem fazer em quanto tempo?',
    NOW() - INTERVAL '5 hours'
  );
  
  -- Conversa 3: ReclamaÃƒÂ§ÃƒÂ£o
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
    'Recebi meu pedido hoje mas o produto estÃƒÂ¡ com a pintura descascando. Estou muito decepcionado!',
    NOW() - INTERVAL '3 hours'
  );
  
  INSERT INTO support_messages (conversation_id, sender_id, sender_type, message, created_at)
  VALUES (
    v_conv_id,
    v_user_id,
    'customer',
    'Preciso de uma soluÃƒÂ§ÃƒÂ£o urgente. Paguei caro por isso.',
    NOW() - INTERVAL '1 hour'
  );
  
  -- Conversa 4: DÃƒÂºvida sobre assinatura
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
    'OlÃƒÂ¡! Vi que vocÃƒÂªs tÃƒÂªm planos de assinatura. Como funciona?',
    NOW() - INTERVAL '6 hours'
  );
  
  IF v_admin_id IS NOT NULL THEN
    INSERT INTO support_messages (conversation_id, sender_id, sender_type, message, created_at)
    VALUES (
      v_conv_id,
      v_admin_id,
      'admin',
      'OlÃƒÂ¡! Temos 3 planos de assinatura: BÃƒÂ¡sico, Premium e Colecionador. Cada um oferece diferentes benefÃƒÂ­cios e descontos. Qual tipo de produto vocÃƒÂª tem interesse?',
      NOW() - INTERVAL '4 hours'
    );
  END IF;
  
  INSERT INTO support_messages (conversation_id, sender_id, sender_type, message, created_at)
  VALUES (
    v_conv_id,
    v_user_id,
    'customer',
    'Tenho interesse em miniaturas de personagens de anime. Qual plano vocÃƒÂª recomenda?',
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
    'InformaÃƒÂ§ÃƒÂ£o sobre entrega',
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
    'Qual o prazo de entrega para SÃƒÂ£o Paulo?',
    NOW() - INTERVAL '1 day'
  );
  
  IF v_admin_id IS NOT NULL THEN
    INSERT INTO support_messages (conversation_id, sender_id, sender_type, message, created_at)
    VALUES (
      v_conv_id,
      v_admin_id,
      'admin',
      'Para SÃƒÂ£o Paulo, o prazo ÃƒÂ© de 5 a 7 dias ÃƒÂºteis apÃƒÂ³s a postagem.',
      NOW() - INTERVAL '20 hours'
    );
  END IF;
  
  INSERT INTO support_messages (conversation_id, sender_id, sender_type, message, created_at)
  VALUES (
    v_conv_id,
    v_user_id,
    'customer',
    'Perfeito! Obrigado pela informaÃƒÂ§ÃƒÂ£o.',
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
