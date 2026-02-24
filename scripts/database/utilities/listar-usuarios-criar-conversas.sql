-- =====================================================
-- Script para Listar Usuários e Criar Conversas Manualmente
-- =====================================================

-- 1. LISTAR TODOS OS USUÁRIOS CADASTRADOS
SELECT 
  'USUÁRIOS CADASTRADOS:' as info;

SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data->>'name' as nome,
  u.raw_user_meta_data->>'role' as role,
  u.created_at,
  u.last_sign_in_at
FROM auth.users u
ORDER BY u.created_at DESC;

-- 2. CONTAR USUÁRIOS POR TIPO
SELECT 
  'CONTAGEM POR TIPO:' as info;

SELECT 
  COALESCE(u.raw_user_meta_data->>'role', 'customer') as tipo,
  COUNT(*) as total
FROM auth.users u
GROUP BY u.raw_user_meta_data->>'role'
ORDER BY total DESC;

-- 3. LISTAR CONVERSAS EXISTENTES
SELECT 
  'CONVERSAS EXISTENTES:' as info;

SELECT 
  c.id,
  c.subject,
  u.email as usuario_email,
  u.raw_user_meta_data->>'name' as usuario_nome,
  c.status,
  c.tags,
  c.created_at,
  (SELECT COUNT(*) FROM support_messages WHERE conversation_id = c.id) as total_mensagens
FROM support_conversations c
JOIN auth.users u ON u.id = c.user_id
ORDER BY c.last_message_at DESC;

-- =====================================================
-- 4. TEMPLATE PARA CRIAR NOVA CONVERSA
-- =====================================================
-- Copie e cole o bloco abaixo, substituindo os valores:

/*
-- CRIAR NOVA CONVERSA
DO $$
DECLARE
  v_user_id UUID;
  v_conv_id UUID;
BEGIN
  -- Selecione o usuário (substitua o email)
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'usuario@exemplo.com'; -- SUBSTITUA AQUI
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;
  
  -- Criar conversa
  INSERT INTO support_conversations (
    user_id,
    subject,
    status,
    priority,
    tags
  ) VALUES (
    v_user_id,
    'Assunto da conversa aqui', -- SUBSTITUA AQUI
    'waiting_admin',
    'normal',
    ARRAY['duvida'] -- SUBSTITUA AQUI: 'pedido', 'orcamento', 'duvida', 'reclamacao', 'assinatura'
  ) RETURNING id INTO v_conv_id;
  
  -- Criar primeira mensagem do cliente
  INSERT INTO support_messages (
    conversation_id,
    sender_id,
    sender_type,
    message
  ) VALUES (
    v_conv_id,
    v_user_id,
    'customer',
    'Mensagem inicial do cliente aqui' -- SUBSTITUA AQUI
  );
  
  RAISE NOTICE 'Conversa criada com sucesso! ID: %', v_conv_id;
END $$;
*/

-- =====================================================
-- 5. CRIAR CONVERSA PARA CADA USUÁRIO (TESTE RÁPIDO)
-- =====================================================
-- Este script cria uma conversa de teste para cada usuário cadastrado

/*
DO $$
DECLARE
  user_record RECORD;
  v_conv_id UUID;
BEGIN
  FOR user_record IN 
    SELECT id, email, raw_user_meta_data->>'name' as name
    FROM auth.users
    WHERE raw_user_meta_data->>'role' IS NULL 
       OR raw_user_meta_data->>'role' != 'admin'
    LIMIT 10 -- Limita a 10 usuários para não criar muitas conversas
  LOOP
    -- Criar conversa
    INSERT INTO support_conversations (
      user_id,
      subject,
      status,
      priority,
      tags
    ) VALUES (
      user_record.id,
      'Conversa de teste - ' || COALESCE(user_record.name, user_record.email),
      'waiting_admin',
      'normal',
      ARRAY['duvida']
    ) RETURNING id INTO v_conv_id;
    
    -- Criar mensagem inicial
    INSERT INTO support_messages (
      conversation_id,
      sender_id,
      sender_type,
      message
    ) VALUES (
      v_conv_id,
      user_record.id,
      'customer',
      'Olá! Esta é uma mensagem de teste para ' || COALESCE(user_record.name, user_record.email)
    );
    
    RAISE NOTICE 'Conversa criada para: % (ID: %)', user_record.email, v_conv_id;
  END LOOP;
END $$;
*/

-- =====================================================
-- 6. LIMPAR CONVERSAS DE TESTE (USE COM CUIDADO!)
-- =====================================================
-- Descomente apenas se quiser deletar TODAS as conversas

/*
-- ATENÇÃO: Isso vai deletar TODAS as conversas e mensagens!
DELETE FROM support_messages;
DELETE FROM support_conversations;
SELECT 'Todas as conversas foram deletadas!' as aviso;
*/

-- =====================================================
-- 7. ESTATÍSTICAS DO SISTEMA
-- =====================================================
SELECT 'ESTATÍSTICAS DO SISTEMA:' as info;

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
WHERE status = 'resolved';
