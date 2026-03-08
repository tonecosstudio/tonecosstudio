-- Teste simples para verificar dados

-- 1. Tabela existe?
SELECT 'TABELA_EXISTE' as teste, COUNT(*) as total FROM subscription_deliveries;

-- 2. Tem dados?
SELECT 'TEM_DADOS' as teste, * FROM subscription_deliveries LIMIT 1;

-- 3. Join com subscriptions funciona?
SELECT 
  'JOIN_FUNCIONA' as teste,
  sd.id,
  s.id as sub_id
FROM subscription_deliveries sd
INNER JOIN subscriptions s ON s.id = sd.subscription_id
LIMIT 1;
