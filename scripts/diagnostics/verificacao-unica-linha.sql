-- 🔍 VERIFICAÇÃO EM UMA ÚNICA LINHA
-- Copie o resultado completo desta query

SELECT 
  -- Triggers
  (SELECT COUNT(*) FROM information_schema.triggers 
   WHERE trigger_name LIKE '%production_queue%') as triggers_ativos,
  
  -- Função
  (SELECT COUNT(*) FROM information_schema.routines 
   WHERE routine_name = 'auto_populate_production_queue') as funcao_existe,
  
  -- Production Queue
  (SELECT COUNT(*) FROM production_queue) as itens_na_fila,
  (SELECT COUNT(*) FROM production_queue WHERE production_status = 'awaiting_choice') as aguardando_escolha,
  (SELECT COUNT(*) FROM production_queue WHERE production_status = 'in_production') as em_producao,
  
  -- Manual Payments
  (SELECT COUNT(*) FROM manual_payments) as total_pagamentos,
  (SELECT COUNT(*) FROM manual_payments WHERE status = 'approved') as pagamentos_aprovados,
  (SELECT COUNT(*) FROM manual_payments WHERE status = 'pending') as pagamentos_pendentes,
  
  -- Subscription Deliveries
  (SELECT COUNT(*) FROM subscription_deliveries) as total_entregas,
  (SELECT COUNT(*) FROM subscription_deliveries WHERE status = 'confirmed') as entregas_confirmadas,
  (SELECT COUNT(*) FROM subscription_deliveries WHERE status != 'confirmed') as entregas_nao_confirmadas,
  
  -- Profiles
  (SELECT COUNT(*) FROM profiles) as total_usuarios,
  
  -- Timestamp
  NOW() as verificado_em;
