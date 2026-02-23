-- Script de Teste Completo - Sistema de Grupos de Broadcast
-- Execute este script no SQL Editor do Supabase para testar o sistema

-- =====================================================
-- PARTE 1: VERIFICAR ESTRUTURA DO BANCO
-- =====================================================

-- Verificar se todas as tabelas existem
SELECT 
  'Tabelas criadas' as status,
  COUNT(*) as total
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'chat_groups',
  'chat_group_members',
  'chat_group_messages',
  'chat_group_attachments'
);
-- Esperado: 4 tabelas

-- Verificar RLS policies
SELECT 
  'Policies RLS' as status,
  tablename,
  COUNT(*) as total_policies
FROM pg_policies 
WHERE tablename LIKE 'chat_group%'
GROUP BY tablename
ORDER BY tablename;
-- Esperado: Múltiplas policies por tabela

-- =====================================================
-- PARTE 2: CRIAR DADOS DE TESTE
-- =====================================================

-- Limpar dados de teste anteriores (se existirem)
DELETE FROM chat_group_attachments WHERE message_id IN (
  SELECT id FROM chat_group_messages WHERE group_id IN (
    SELECT id FROM chat_groups WHERE name LIKE 'Teste%'
  )
);
DELETE FROM chat_group_messages WHERE group_id IN (
  SELECT id FROM chat_groups WHERE name LIKE 'Teste%'
);
DELETE FROM chat_group_members WHERE group_id IN (
  SELECT id FROM chat_groups WHERE name LIKE 'Teste%'
);
DELETE FROM chat_groups WHERE name LIKE 'Teste%';

-- Obter ID de um admin (ajuste conforme necessário)
DO $$
DECLARE
  admin_id UUID;
  test_user_id UUID;
  group_id UUID;
  message_id UUID;
BEGIN
  -- Buscar primeiro admin
  SELECT id INTO admin_id 
  FROM auth.users 
  WHERE raw_user_meta_data->>'role' = 'admin' 
  LIMIT 1;

  IF admin_id IS NULL THEN
    RAISE NOTICE 'AVISO: Nenhum admin encontrado. Crie um usuário admin primeiro.';
    RETURN;
  END IF;

  RAISE NOTICE 'Admin ID: %', admin_id;

  -- Buscar um usuário não-admin para testes
  SELECT id INTO test_user_id 
  FROM auth.users 
  WHERE raw_user_meta_data->>'role' != 'admin' 
  LIMIT 1;

  IF test_user_id IS NULL THEN
    RAISE NOTICE 'AVISO: Nenhum usuário não-admin encontrado.';
  ELSE
    RAISE NOTICE 'Test User ID: %', test_user_id;
  END IF;

  -- Criar grupo manual de teste
  INSERT INTO chat_groups (name, type, created_by)
  VALUES ('Teste - Grupo Manual', 'manual', admin_id)
  RETURNING id INTO group_id;

  RAISE NOTICE 'Grupo criado: %', group_id;

  -- Adicionar admin como membro
  INSERT INTO chat_group_members (group_id, user_id)
  VALUES (group_id, admin_id);

  -- Adicionar usuário de teste se existir
  IF test_user_id IS NOT NULL THEN
    INSERT INTO chat_group_members (group_id, user_id)
    VALUES (group_id, test_user_id);
  END IF;

  -- Criar mensagem de teste
  INSERT INTO chat_group_messages (group_id, sender_id, message)
  VALUES (group_id, admin_id, 'Esta é uma mensagem de teste do sistema de grupos!')
  RETURNING id INTO message_id;

  RAISE NOTICE 'Mensagem criada: %', message_id;

  -- Criar grupo de assinantes de teste
  INSERT INTO chat_groups (
    name, 
    type, 
    membership_criteria, 
    created_by
  )
  VALUES (
    'Teste - Assinantes Ativos',
    'assinantes',
    '{"type": "assinantes", "subscriptionStatus": "active"}'::jsonb,
    admin_id
  );

  RAISE NOTICE 'Grupo de assinantes criado';

  -- Criar grupo de lançamentos de teste
  INSERT INTO chat_groups (
    name, 
    type, 
    membership_criteria, 
    created_by
  )
  VALUES (
    'Teste - Lançamentos',
    'lancamentos',
    '{"type": "lancamentos", "criteria": "all_users"}'::jsonb,
    admin_id
  );

  RAISE NOTICE 'Grupo de lançamentos criado';

END $$;

-- =====================================================
-- PARTE 3: VERIFICAR DADOS CRIADOS
-- =====================================================

-- Listar grupos de teste
SELECT 
  'Grupos criados' as status,
  id,
  name,
  type,
  created_at
FROM chat_groups 
WHERE name LIKE 'Teste%'
AND deleted_at IS NULL
ORDER BY created_at DESC;

-- Contar membros por grupo
SELECT 
  'Membros por grupo' as status,
  g.name,
  COUNT(m.id) as total_members
FROM chat_groups g
LEFT JOIN chat_group_members m ON m.group_id = g.id
WHERE g.name LIKE 'Teste%'
AND g.deleted_at IS NULL
GROUP BY g.id, g.name
ORDER BY g.name;

-- Listar mensagens de teste
SELECT 
  'Mensagens criadas' as status,
  g.name as grupo,
  m.message,
  m.created_at
FROM chat_group_messages m
JOIN chat_groups g ON g.id = m.group_id
WHERE g.name LIKE 'Teste%'
ORDER BY m.created_at DESC;

-- =====================================================
-- PARTE 4: TESTAR MÉTRICAS
-- =====================================================

-- Calcular métricas para grupos de teste
SELECT 
  'Métricas dos grupos' as status,
  g.name,
  (SELECT COUNT(*) FROM chat_group_members WHERE group_id = g.id) as total_members,
  (SELECT COUNT(*) FROM chat_group_messages WHERE group_id = g.id) as total_messages,
  COALESCE(
    (
      SELECT COUNT(*)::float / NULLIF(COUNT(*), 0) * 100
      FROM chat_group_members m
      WHERE m.group_id = g.id
      AND m.last_viewed_at > (
        SELECT MAX(created_at) 
        FROM chat_group_messages 
        WHERE group_id = g.id
      )
    ),
    0
  ) as view_rate_percent
FROM chat_groups g
WHERE g.name LIKE 'Teste%'
AND g.deleted_at IS NULL
ORDER BY g.name;

-- =====================================================
-- PARTE 5: TESTAR VALIDAÇÕES
-- =====================================================

-- Testar constraint de nome (deve falhar)
DO $$
BEGIN
  INSERT INTO chat_groups (name, type, created_by)
  VALUES ('AB', 'manual', (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin' LIMIT 1));
  RAISE NOTICE 'ERRO: Constraint de nome não funcionou!';
EXCEPTION
  WHEN check_violation THEN
    RAISE NOTICE 'OK: Constraint de nome funcionando (nome muito curto rejeitado)';
END $$;

-- Testar constraint de tipo (deve falhar)
DO $$
BEGIN
  INSERT INTO chat_groups (name, type, created_by)
  VALUES ('Teste Tipo Inválido', 'invalido', (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin' LIMIT 1));
  RAISE NOTICE 'ERRO: Constraint de tipo não funcionou!';
EXCEPTION
  WHEN check_violation THEN
    RAISE NOTICE 'OK: Constraint de tipo funcionando (tipo inválido rejeitado)';
END $$;

-- Testar constraint de mensagem (deve falhar)
DO $$
DECLARE
  test_group_id UUID;
  admin_id UUID;
BEGIN
  SELECT id INTO admin_id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin' LIMIT 1;
  SELECT id INTO test_group_id FROM chat_groups WHERE name LIKE 'Teste%' LIMIT 1;
  
  INSERT INTO chat_group_messages (group_id, sender_id, message)
  VALUES (test_group_id, admin_id, '');
  RAISE NOTICE 'ERRO: Constraint de mensagem não funcionou!';
EXCEPTION
  WHEN check_violation THEN
    RAISE NOTICE 'OK: Constraint de mensagem funcionando (mensagem vazia rejeitada)';
END $$;

-- =====================================================
-- PARTE 6: TESTAR RLS POLICIES
-- =====================================================

-- Verificar se RLS está habilitado
SELECT 
  'RLS Status' as status,
  tablename,
  CASE WHEN rowsecurity THEN 'Habilitado' ELSE 'DESABILITADO!' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'chat_group%'
ORDER BY tablename;

-- =====================================================
-- PARTE 7: VERIFICAR CRON JOBS
-- =====================================================

-- Verificar se pg_cron está instalado
SELECT 
  'pg_cron Extension' as status,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN 'Instalado' ELSE 'NÃO INSTALADO!' END as extension_status;

-- Listar cron jobs configurados
SELECT 
  'Cron Jobs' as status,
  jobid,
  jobname,
  schedule,
  active
FROM cron.job
WHERE jobname LIKE '%group%'
ORDER BY jobname;

-- Ver últimas execuções dos cron jobs
SELECT 
  'Últimas Execuções' as status,
  j.jobname,
  r.status,
  r.return_message,
  r.start_time,
  r.end_time
FROM cron.job_run_details r
JOIN cron.job j ON j.jobid = r.jobid
WHERE j.jobname LIKE '%group%'
ORDER BY r.start_time DESC
LIMIT 10;

-- =====================================================
-- PARTE 8: RESUMO FINAL
-- =====================================================

SELECT 
  '=== RESUMO DO TESTE ===' as titulo,
  (SELECT COUNT(*) FROM chat_groups WHERE name LIKE 'Teste%' AND deleted_at IS NULL) as grupos_teste,
  (SELECT COUNT(*) FROM chat_group_members WHERE group_id IN (SELECT id FROM chat_groups WHERE name LIKE 'Teste%')) as membros_teste,
  (SELECT COUNT(*) FROM chat_group_messages WHERE group_id IN (SELECT id FROM chat_groups WHERE name LIKE 'Teste%')) as mensagens_teste,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename LIKE 'chat_group%') as total_policies,
  (SELECT COUNT(*) FROM cron.job WHERE jobname LIKE '%group%') as cron_jobs;

-- =====================================================
-- INSTRUÇÕES FINAIS
-- =====================================================

SELECT 
  '=== PRÓXIMOS PASSOS ===' as titulo,
  '1. Verifique se todos os testes passaram' as passo_1,
  '2. Acesse /admin/grupos para ver os grupos de teste' as passo_2,
  '3. Teste criar um novo grupo manualmente' as passo_3,
  '4. Teste enviar uma mensagem' as passo_4,
  '5. Configure os cron jobs no Dashboard se ainda não fez' as passo_5,
  '6. Monitore os logs das Edge Functions' as passo_6;

-- Para limpar dados de teste depois:
-- DELETE FROM chat_group_attachments WHERE message_id IN (SELECT id FROM chat_group_messages WHERE group_id IN (SELECT id FROM chat_groups WHERE name LIKE 'Teste%'));
-- DELETE FROM chat_group_messages WHERE group_id IN (SELECT id FROM chat_groups WHERE name LIKE 'Teste%');
-- DELETE FROM chat_group_members WHERE group_id IN (SELECT id FROM chat_groups WHERE name LIKE 'Teste%');
-- DELETE FROM chat_groups WHERE name LIKE 'Teste%';
