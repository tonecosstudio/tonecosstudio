-- 🔍 SCRIPT DE VERIFICAÇÃO DO SISTEMA DE PRODUÇÃO
-- Data: 2026-03-07
-- Objetivo: Validar que o sistema está funcionando corretamente

-- ============================================
-- 1. VERIFICAR TRIGGERS ATIVOS
-- ============================================
SELECT 
  '🔧 TRIGGERS ATIVOS' as secao,
  trigger_name,
  event_manipulation as evento,
  event_object_table as tabela,
  action_timing as timing
FROM information_schema.triggers
WHERE trigger_name LIKE '%production_queue%'
ORDER BY event_object_table;

-- ============================================
-- 2. VERIFICAR FUNÇÃO AUTO_POPULATE
-- ============================================
SELECT 
  '⚙️ FUNÇÃO AUTO_POPULATE' as secao,
  routine_name as funcao,
  routine_type as tipo,
  data_type as retorno
FROM information_schema.routines
WHERE routine_name = 'auto_populate_production_queue';

-- ============================================
-- 3. VERIFICAR SCHEMA DA PRODUCTION_QUEUE
-- ============================================
SELECT 
  '📋 SCHEMA PRODUCTION_QUEUE' as secao,
  column_name as coluna,
  data_type as tipo,
  is_nullable as nullable,
  column_default as padrao
FROM information_schema.columns
WHERE table_name = 'production_queue'
ORDER BY ordinal_position;

-- ============================================
-- 4. VERIFICAR ITENS NA PRODUCTION_QUEUE
-- ============================================
SELECT 
  '📦 ITENS NA FILA' as secao,
  COUNT(*) as total_itens,
  COUNT(CASE WHEN production_status = 'awaiting_choice' THEN 1 END) as aguardando_escolha,
  COUNT(CASE WHEN production_status = 'ready_for_production' THEN 1 END) as pronto_producao,
  COUNT(CASE WHEN production_status = 'in_production' THEN 1 END) as em_producao,
  COUNT(CASE WHEN production_status = 'completed' THEN 1 END) as completos
FROM production_queue;

-- ============================================
-- 5. VERIFICAR ÚLTIMOS ITENS
-- ============================================
SELECT 
  '🕐 ÚLTIMOS 5 ITENS' as secao,
  id,
  customer_id,
  priority,
  priority_score,
  production_status,
  current_stage,
  created_at
FROM production_queue
ORDER BY created_at DESC
LIMIT 5;

-- ============================================
-- 6. VERIFICAR MANUAL PAYMENTS APROVADOS
-- ============================================
SELECT 
  '💰 PAGAMENTOS APROVADOS' as secao,
  COUNT(*) as total_aprovados,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as ultimos_7_dias,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 day' THEN 1 END) as ultimas_24h
FROM manual_payments
WHERE status = 'approved';

-- ============================================
-- 7. VERIFICAR SUBSCRIPTION DELIVERIES CONFIRMADAS
-- ============================================
SELECT 
  '📮 ENTREGAS CONFIRMADAS' as secao,
  COUNT(*) as total_confirmadas,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as ultimos_7_dias,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 day' THEN 1 END) as ultimas_24h
FROM subscription_deliveries
WHERE status = 'confirmed';

-- ============================================
-- 8. VERIFICAR CORRELAÇÃO (PAGAMENTOS → FILA)
-- ============================================
SELECT 
  '🔗 CORRELAÇÃO PAGAMENTOS → FILA' as secao,
  (SELECT COUNT(*) FROM manual_payments WHERE status = 'approved') as pagamentos_aprovados,
  (SELECT COUNT(*) FROM production_queue WHERE order_type = 'standalone_purchase') as itens_na_fila_standalone,
  (SELECT COUNT(*) FROM production_queue WHERE order_type = 'subscription_delivery') as itens_na_fila_subscription;

-- ============================================
-- 9. VERIFICAR DADOS DE TESTE DISPONÍVEIS
-- ============================================
SELECT 
  '🧪 DADOS DE TESTE' as secao,
  (SELECT COUNT(*) FROM manual_payments WHERE status = 'pending') as pagamentos_pendentes,
  (SELECT COUNT(*) FROM subscription_deliveries WHERE status != 'confirmed') as entregas_nao_confirmadas,
  (SELECT COUNT(*) FROM profiles) as total_usuarios;

-- ============================================
-- 10. RESUMO GERAL
-- ============================================
SELECT 
  '📊 RESUMO GERAL' as secao,
  'Triggers Ativos' as item,
  (SELECT COUNT(*) FROM information_schema.triggers 
   WHERE trigger_name LIKE '%production_queue%') as valor
UNION ALL
SELECT 
  '📊 RESUMO GERAL',
  'Itens na Fila',
  (SELECT COUNT(*) FROM production_queue)
UNION ALL
SELECT 
  '📊 RESUMO GERAL',
  'Pagamentos Aprovados',
  (SELECT COUNT(*) FROM manual_payments WHERE status = 'approved')
UNION ALL
SELECT 
  '📊 RESUMO GERAL',
  'Entregas Confirmadas',
  (SELECT COUNT(*) FROM subscription_deliveries WHERE status = 'confirmed')
UNION ALL
SELECT 
  '📊 RESUMO GERAL',
  'Total de Usuários',
  (SELECT COUNT(*) FROM profiles);

-- ============================================
-- ✅ FIM DA VERIFICAÇÃO
-- ============================================
SELECT 
  '✅ VERIFICAÇÃO CONCLUÍDA' as resultado,
  NOW() as data_hora;
