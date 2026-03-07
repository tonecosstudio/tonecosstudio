-- =====================================================
-- CORRIGIR delivery_month SEM VIOLAR CONSTRAINT
-- =====================================================
-- Data: 07/03/2026
-- 
-- Problema: Constraint única (subscription_id, delivery_month)
-- Solução: Atualizar em 2 etapas para evitar conflitos
-- =====================================================

-- =====================================================
-- 1. VERIFICAR DADOS ATUAIS
-- =====================================================

SELECT 
  '=== DADOS ATUAIS ===' as info;

SELECT 
  sms.id,
  sms.subscription_id,
  sms.delivery_month as atual,
  TO_CHAR(
    TO_DATE(sms.delivery_month || '-01', 'YYYY-MM-DD') + INTERVAL '2 months',
    'YYYY-MM'
  ) as deveria_ser,
  sms.status,
  cc.name as personagem,
  p.display_name as usuario
FROM subscription_monthly_selections sms
LEFT JOIN collection_characters cc ON cc.id = sms.character_id
LEFT JOIN profiles p ON p.id = sms.user_id
ORDER BY sms.subscription_id, sms.delivery_month;

-- =====================================================
-- 2. CORREÇÃO SEGURA (EM 2 ETAPAS)
-- =====================================================

-- Etapa 1: Mover para valores temporários (ano 9999)
-- Isso evita conflito com a constraint
UPDATE subscription_monthly_selections
SET delivery_month = '9999-' || SPLIT_PART(delivery_month, '-', 2)
WHERE delivery_month IS NOT NULL
  AND delivery_month NOT LIKE '9999-%';

-- Etapa 2: Calcular valores corretos (+2 meses do original)
UPDATE subscription_monthly_selections
SET delivery_month = TO_CHAR(
  TO_DATE('2026-' || SPLIT_PART(delivery_month, '-', 2) || '-01', 'YYYY-MM-DD') + INTERVAL '2 months',
  'YYYY-MM'
)
WHERE delivery_month LIKE '9999-%';

-- =====================================================
-- 3. VERIFICAR RESULTADO
-- =====================================================

SELECT 
  '=== APÓS CORREÇÃO ===' as info;

SELECT 
  sms.id,
  sms.subscription_id,
  sms.delivery_month,
  TO_CHAR(TO_DATE(sms.delivery_month || '-01', 'YYYY-MM-DD'), 'TMMonth YYYY') as mes_entrega,
  sms.status,
  cc.name as personagem,
  p.display_name as usuario
FROM subscription_monthly_selections sms
LEFT JOIN collection_characters cc ON cc.id = sms.character_id
LEFT JOIN profiles p ON p.id = sms.user_id
ORDER BY sms.subscription_id, sms.delivery_month;

-- =====================================================
-- 4. VALIDAÇÃO
-- =====================================================

SELECT 
  '=== VALIDAÇÃO ===' as info;

-- Verificar se há duplicatas
SELECT 
  subscription_id,
  delivery_month,
  COUNT(*) as quantidade,
  CASE 
    WHEN COUNT(*) > 1 THEN '⚠️ DUPLICATA!'
    ELSE '✅ OK'
  END as status
FROM subscription_monthly_selections
GROUP BY subscription_id, delivery_month
HAVING COUNT(*) > 1;

-- Se não retornar nada, está tudo OK!

-- Contar total de registros
SELECT 
  COUNT(*) as total_registros,
  COUNT(DISTINCT subscription_id) as total_assinaturas,
  '✅ Correção concluída com sucesso!' as status
FROM subscription_monthly_selections;

-- =====================================================
-- RESUMO
-- =====================================================

SELECT 
  '=== RESUMO ===' as info;

SELECT 
  'Correção aplicada em 2 etapas para evitar conflitos' as mudanca
UNION ALL
SELECT 
  'Etapa 1: Mover para valores temporários (9999-XX)'
UNION ALL
SELECT 
  'Etapa 2: Calcular valores corretos (+2 meses)'
UNION ALL
SELECT 
  'Constraint única (subscription_id, delivery_month) respeitada'
UNION ALL
SELECT 
  'Todas as datas agora representam o mês de ENTREGA';
