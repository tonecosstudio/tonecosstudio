-- Script de Debug: Production Queue
-- Execute este script para entender por que os dados não aparecem

-- ============================================================================
-- 1. VERIFICAR SE A TABELA EXISTE
-- ============================================================================
SELECT 
  'production_queue' as tabela,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'production_queue'
  ) as existe;

-- ============================================================================
-- 2. CONTAR REGISTROS TOTAIS (SEM RLS)
-- ============================================================================
-- Desabilitar RLS temporariamente para ver todos os dados
SET LOCAL ROLE postgres;
SELECT COUNT(*) as total_registros FROM production_queue;
RESET ROLE;

-- ============================================================================
-- 3. VER DADOS DO JOÃO TRIMESTRAL
-- ============================================================================
SET LOCAL ROLE postgres;
SELECT 
  id,
  order_id,
  order_type,
  customer_name,
  customer_email,
  collection_name,
  character_name,
  current_stage,
  production_status,
  priority,
  choice_status,
  created_at
FROM production_queue
WHERE customer_name ILIKE '%trimestral%' OR customer_email ILIKE '%trimestral%'
ORDER BY created_at DESC;
RESET ROLE;

-- ============================================================================
-- 4. VERIFICAR POLÍTICAS RLS
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'production_queue'
ORDER BY policyname;

-- ============================================================================
-- 5. VERIFICAR SE RLS ESTÁ HABILITADO
-- ============================================================================
SELECT 
  tablename,
  rowsecurity as rls_habilitado
FROM pg_tables
WHERE tablename = 'production_queue';

-- ============================================================================
-- 6. TESTAR QUERY COMO ADMIN
-- ============================================================================
-- Simular a query que o frontend faz
SELECT 
  COUNT(*) as total,
  current_stage,
  production_status,
  priority
FROM production_queue
GROUP BY current_stage, production_status, priority;

-- ============================================================================
-- 7. VER SUBSCRIPTION_DELIVERIES DO JOÃO
-- ============================================================================
SELECT 
  sd.id,
  sd.user_id,
  sd.collection_id,
  sd.character_id,
  sd.status,
  sd.scheduled_date,
  sd.created_at,
  u.email,
  p.full_name,
  c.name as collection_name
FROM subscription_deliveries sd
LEFT JOIN auth.users u ON u.id = sd.user_id
LEFT JOIN profiles p ON p.id = sd.user_id
LEFT JOIN collections c ON c.id = sd.collection_id
WHERE u.email ILIKE '%trimestral%' OR p.full_name ILIKE '%trimestral%'
ORDER BY sd.created_at DESC;

-- ============================================================================
-- 8. VERIFICAR SE TRIGGERS ESTÃO ATIVOS
-- ============================================================================
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE trigger_name LIKE '%production%'
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- 9. VERIFICAR FUNÇÃO DO TRIGGER
-- ============================================================================
SELECT 
  proname as function_name,
  prosrc as function_code
FROM pg_proc
WHERE proname LIKE '%production_queue%'
LIMIT 1;

-- ============================================================================
-- 10. TESTAR INSERÇÃO MANUAL (SE NECESSÁRIO)
-- ============================================================================
-- Descomente para testar inserção manual
/*
DO $$
DECLARE
  v_user_id UUID;
  v_collection_id UUID;
  v_delivery_id UUID;
BEGIN
  -- Pegar João Trimestral
  SELECT u.id INTO v_user_id
  FROM auth.users u
  JOIN profiles p ON p.id = u.id
  WHERE u.email ILIKE '%trimestral%'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Usuário João Trimestral não encontrado';
    RETURN;
  END IF;

  -- Pegar uma coleção
  SELECT id INTO v_collection_id
  FROM collections
  WHERE is_active = true
  LIMIT 1;

  -- Criar um delivery de teste
  INSERT INTO subscription_deliveries (
    subscription_id,
    user_id,
    collection_id,
    delivery_month,
    delivery_year,
    status,
    scheduled_date
  )
  VALUES (
    gen_random_uuid(),
    v_user_id,
    v_collection_id,
    EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER,
    EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    'pending',
    CURRENT_DATE + INTERVAL '7 days'
  )
  RETURNING id INTO v_delivery_id;

  RAISE NOTICE 'Delivery criado: %', v_delivery_id;
  RAISE NOTICE 'Verifique production_queue agora';
END $$;
*/

-- ============================================================================
-- 11. RESULTADO FINAL: O QUE O FRONTEND DEVERIA VER
-- ============================================================================
SELECT 
  'RESUMO' as tipo,
  COUNT(*) as total_itens,
  COUNT(CASE WHEN current_stage = 'awaiting_choice' THEN 1 END) as aguardando_escolha,
  COUNT(CASE WHEN priority = 'critical' THEN 1 END) as criticos,
  COUNT(CASE WHEN priority = 'high' THEN 1 END) as altos,
  COUNT(CASE WHEN choice_status = 'pending' THEN 1 END) as escolhas_pendentes
FROM production_queue;
