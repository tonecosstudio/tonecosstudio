-- 🔍 VERIFICAÇÃO SIMPLES DO SISTEMA DE PRODUÇÃO
-- Execute este script e copie TODA a saída

-- 1. TRIGGERS
SELECT 
  'TRIGGERS' as tipo,
  COUNT(*) as quantidade,
  string_agg(trigger_name, ', ') as nomes
FROM information_schema.triggers
WHERE trigger_name LIKE '%production_queue%';

-- 2. FUNÇÃO
SELECT 
  'FUNÇÃO' as tipo,
  COUNT(*) as quantidade,
  string_agg(routine_name, ', ') as nomes
FROM information_schema.routines
WHERE routine_name = 'auto_populate_production_queue';

-- 3. ITENS NA FILA
SELECT 
  'ITENS_FILA' as tipo,
  COUNT(*) as total,
  COUNT(CASE WHEN production_status = 'awaiting_choice' THEN 1 END) as aguardando_escolha,
  COUNT(CASE WHEN production_status = 'ready_for_production' THEN 1 END) as pronto,
  COUNT(CASE WHEN production_status = 'in_production' THEN 1 END) as em_producao
FROM production_queue;

-- 4. PAGAMENTOS
SELECT 
  'PAGAMENTOS' as tipo,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'approved' THEN 1 END) as aprovados,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendentes
FROM manual_payments;

-- 5. ENTREGAS
SELECT 
  'ENTREGAS' as tipo,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmadas,
  COUNT(CASE WHEN status != 'confirmed' THEN 1 END) as nao_confirmadas
FROM subscription_deliveries;

-- 6. USUÁRIOS
SELECT 
  'USUARIOS' as tipo,
  COUNT(*) as total
FROM profiles;
