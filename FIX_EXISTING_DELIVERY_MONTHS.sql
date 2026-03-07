-- =====================================================
-- CORRIGIR REGISTROS EXISTENTES - delivery_month
-- =====================================================
-- Data: 07/03/2026
-- 
-- Corrige os delivery_month dos registros existentes
-- adicionando 2 meses (escolha → produção → entrega)
-- =====================================================

-- =====================================================
-- 1. VERIFICAR DADOS ANTES DA CORREÇÃO
-- =====================================================

SELECT 
  '=== ANTES DA CORREÇÃO ===' as info;

SELECT 
  sms.id,
  sms.delivery_month as delivery_month_atual,
  TO_CHAR(
    TO_DATE(sms.delivery_month || '-01', 'YYYY-MM-DD') + INTERVAL '2 months',
    'YYYY-MM'
  ) as delivery_month_correto,
  TO_CHAR(TO_DATE(sms.delivery_month || '-01', 'YYYY-MM-DD'), 'TMMonth YYYY') as mes_atual,
  TO_CHAR(TO_DATE(sms.delivery_month || '-01', 'YYYY-MM-DD') + INTERVAL '2 months', 'TMMonth YYYY') as mes_correto,
  sms.status,
  cc.name as personagem,
  p.display_name as usuario
FROM subscription_monthly_selections sms
LEFT JOIN collection_characters cc ON cc.id = sms.character_id
LEFT JOIN profiles p ON p.id = sms.user_id
ORDER BY sms.delivery_month;

-- =====================================================
-- 2. APLICAR CORREÇÃO AUTOMÁTICA
-- =====================================================

-- Adiciona 2 meses a todos os delivery_month existentes
UPDATE subscription_monthly_selections
SET delivery_month = TO_CHAR(
  TO_DATE(delivery_month || '-01', 'YYYY-MM-DD') + INTERVAL '2 months',
  'YYYY-MM'
)
WHERE delivery_month IS NOT NULL;

-- =====================================================
-- 3. VERIFICAR DADOS APÓS CORREÇÃO
-- =====================================================

SELECT 
  '=== APÓS CORREÇÃO ===' as info;

SELECT 
  sms.id,
  sms.delivery_month,
  TO_CHAR(TO_DATE(sms.delivery_month || '-01', 'YYYY-MM-DD'), 'TMMonth YYYY') as mes_entrega,
  sms.status,
  cc.name as personagem,
  p.display_name as usuario
FROM subscription_monthly_selections sms
LEFT JOIN collection_characters cc ON cc.id = sms.character_id
LEFT JOIN profiles p ON p.id = sms.user_id
ORDER BY sms.delivery_month;

-- =====================================================
-- 4. VALIDAR CORREÇÃO
-- =====================================================

SELECT 
  '=== VALIDAÇÃO ===' as info;

-- Contar registros corrigidos
SELECT 
  COUNT(*) as total_registros_corrigidos
FROM subscription_monthly_selections
WHERE delivery_month IS NOT NULL;

-- Verificar se há algum delivery_month no passado (erro)
SELECT 
  COUNT(*) as registros_com_data_passada,
  CASE 
    WHEN COUNT(*) > 0 THEN '⚠️ ATENÇÃO: Há registros com data no passado!'
    ELSE '✅ OK: Todas as datas estão no futuro'
  END as status
FROM subscription_monthly_selections
WHERE TO_DATE(delivery_month || '-01', 'YYYY-MM-DD') < CURRENT_DATE;

-- =====================================================
-- RESUMO
-- =====================================================

SELECT 
  '=== RESUMO ===' as info;

SELECT 
  'Todos os delivery_month foram corrigidos (+2 meses)' as mudanca
UNION ALL
SELECT 
  'Exemplo: 2026-03 (março) → 2026-05 (maio)'
UNION ALL
SELECT 
  'Exemplo: 2026-04 (abril) → 2026-06 (junho)'
UNION ALL
SELECT 
  'Exemplo: 2026-05 (maio) → 2026-07 (julho)'
UNION ALL
SELECT 
  'Trigger automático já está ativo para novos registros';
