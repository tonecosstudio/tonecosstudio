-- =====================================================
-- CORRIGIR delivery_month DAS ESCOLHAS MENSAIS
-- =====================================================
-- Data: 07/03/2026
-- 
-- PROBLEMA: delivery_month está com o mês de criação,
-- mas deveria ter o mês de ENTREGA (2 meses depois)
--
-- FLUXO CORRETO:
-- Escolha em MARÇO → Entrega em MAIO
-- Escolha em ABRIL → Entrega em JUNHO
-- =====================================================

-- =====================================================
-- 1. VERIFICAR DADOS ATUAIS
-- =====================================================

SELECT 
  '=== ESCOLHAS MENSAIS ATUAIS ===' as info;

SELECT 
  sms.id,
  sms.delivery_month,
  sms.status,
  cc.name as personagem,
  c.name as colecao,
  p.display_name as usuario
FROM subscription_monthly_selections sms
LEFT JOIN collection_characters cc ON cc.id = sms.character_id
LEFT JOIN collections c ON c.id = sms.collection_id
LEFT JOIN profiles p ON p.id = sms.user_id
ORDER BY sms.delivery_month;

-- =====================================================
-- 2. CORRIGIR delivery_month
-- =====================================================

-- O delivery_month deve representar o MÊS DE ENTREGA
-- Não o mês de criação/escolha
--
-- Regra: Se a escolha foi feita em MARÇO (2026-03),
-- a entrega será em MAIO (2026-05) - 2 meses depois

-- IMPORTANTE: Esta correção assume que delivery_month
-- atualmente contém o mês de ESCOLHA, não de ENTREGA

-- Comentar/descomentar conforme necessário:

/*
UPDATE subscription_monthly_selections
SET delivery_month = TO_CHAR(
  TO_DATE(delivery_month || '-01', 'YYYY-MM-DD') + INTERVAL '2 months',
  'YYYY-MM'
)
WHERE delivery_month IS NOT NULL;
*/

-- =====================================================
-- 3. ALTERNATIVA: CORRIGIR MANUALMENTE
-- =====================================================

-- Se preferir corrigir manualmente, use:

-- Exemplo: Luffy (março → maio)
-- UPDATE subscription_monthly_selections
-- SET delivery_month = '2026-05'
-- WHERE id = 'ID_DO_LUFFY';

-- Exemplo: Zoro (abril → junho)
-- UPDATE subscription_monthly_selections
-- SET delivery_month = '2026-06'
-- WHERE id = 'ID_DO_ZORO';

-- Exemplo: Nami (maio → julho)
-- UPDATE subscription_monthly_selections
-- SET delivery_month = '2026-07'
-- WHERE id = 'ID_DA_NAMI';

-- =====================================================
-- 4. CRIAR TRIGGER PARA CALCULAR AUTOMATICAMENTE
-- =====================================================

-- Trigger que calcula delivery_month automaticamente
-- baseado na data de criação + 2 meses

CREATE OR REPLACE FUNCTION calculate_delivery_month()
RETURNS TRIGGER AS $$
BEGIN
  -- Se delivery_month não foi fornecido, calcular automaticamente
  IF NEW.delivery_month IS NULL THEN
    -- Pegar mês atual + 2 meses (vendas → produção → entrega)
    NEW.delivery_month := TO_CHAR(
      DATE_TRUNC('month', NOW()) + INTERVAL '2 months',
      'YYYY-MM'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Dropar trigger existente se houver
DROP TRIGGER IF EXISTS trigger_calculate_delivery_month ON subscription_monthly_selections;

-- Criar trigger
CREATE TRIGGER trigger_calculate_delivery_month
  BEFORE INSERT ON subscription_monthly_selections
  FOR EACH ROW
  EXECUTE FUNCTION calculate_delivery_month();

-- =====================================================
-- 5. VALIDAR CORREÇÃO
-- =====================================================

SELECT 
  '=== ESCOLHAS APÓS CORREÇÃO ===' as info;

SELECT 
  sms.id,
  sms.delivery_month,
  TO_CHAR(TO_DATE(sms.delivery_month || '-01', 'YYYY-MM-DD'), 'TMMonth YYYY') as mes_entrega,
  sms.status,
  cc.name as personagem
FROM subscription_monthly_selections sms
LEFT JOIN collection_characters cc ON cc.id = sms.character_id
ORDER BY sms.delivery_month;

-- =====================================================
-- RESUMO
-- =====================================================

SELECT 
  '=== RESUMO ===' as info;

SELECT 
  'Trigger calculate_delivery_month() criado' as mudanca
UNION ALL
SELECT 
  'Novos registros terão delivery_month calculado automaticamente'
UNION ALL
SELECT 
  'Registros existentes precisam ser corrigidos manualmente';

-- =====================================================
-- INSTRUÇÕES
-- =====================================================

/*
PARA CORRIGIR OS DADOS EXISTENTES:

1. Execute a query de verificação (seção 1)
2. Identifique os IDs que precisam ser corrigidos
3. Execute UPDATE manual para cada registro (seção 3)
4. Valide com a query da seção 5

EXEMPLO PRÁTICO:

Se você vê:
  Luffy - delivery_month: 2026-03 (março)
  
Deve corrigir para:
  Luffy - delivery_month: 2026-05 (maio)
  
Porque: Escolha em março → Entrega em maio (2 meses depois)
*/
