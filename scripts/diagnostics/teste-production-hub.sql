-- ========================================
-- TESTE 2: PRODUCTION HUB DISPLAY
-- Verifica se os dados aparecem corretamente
-- ========================================

-- PASSO 1: Verificar todos os itens na fila
SELECT 
  'TODOS_OS_ITENS' as tipo,
  COUNT(*) as total
FROM production_queue;

-- PASSO 2: Listar itens com detalhes
SELECT 
  'LISTA_DETALHADA' as tipo,
  id,
  order_id,
  order_type,
  customer_name,
  customer_email,
  collection_name,
  character_name,
  production_status,
  current_stage,
  priority,
  priority_score,
  created_at
FROM production_queue
ORDER BY priority_score DESC, created_at DESC;

-- PASSO 3: Verificar item de manual_payment especificamente
SELECT 
  'MANUAL_PAYMENT_ITEMS' as tipo,
  id,
  order_id,
  order_type,
  customer_name,
  collection_name,
  production_status,
  current_stage,
  choice_status,
  choice_deadline,
  created_at
FROM production_queue
WHERE order_type = 'manual_payment'
ORDER BY created_at DESC;

-- PASSO 4: Verificar RLS policies
SELECT 
  'RLS_POLICIES' as tipo,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'production_queue';

-- PASSO 5: Verificar se RLS está habilitado
SELECT 
  'RLS_STATUS' as tipo,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'production_queue';

-- PASSO 6: Métricas por status
SELECT 
  'METRICAS_STATUS' as tipo,
  production_status,
  COUNT(*) as total
FROM production_queue
GROUP BY production_status
ORDER BY total DESC;

-- PASSO 7: Métricas por estágio
SELECT 
  'METRICAS_ESTAGIO' as tipo,
  current_stage,
  COUNT(*) as total
FROM production_queue
GROUP BY current_stage
ORDER BY total DESC;

-- PASSO 8: Métricas por tipo de pedido
SELECT 
  'METRICAS_TIPO' as tipo,
  order_type,
  COUNT(*) as total
FROM production_queue
GROUP BY order_type
ORDER BY total DESC;
