-- Script para verificar dados de produção

-- 1. Verificar se a tabela production_queue existe
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'production_queue'
) as production_queue_exists;

-- 2. Contar registros em production_queue
SELECT COUNT(*) as total_production_queue FROM production_queue;

-- 3. Contar registros nas tabelas de origem
SELECT 
  (SELECT COUNT(*) FROM subscription_deliveries) as subscription_deliveries,
  (SELECT COUNT(*) FROM standalone_purchases) as standalone_purchases,
  (SELECT COUNT(*) FROM manual_payments) as manual_payments;

-- 4. Ver alguns registros de production_queue (se existirem)
SELECT 
  id,
  order_type,
  customer_name,
  collection_name,
  current_stage,
  production_status,
  created_at
FROM production_queue
LIMIT 5;

-- 5. Verificar se os triggers existem
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%production_queue%';
