-- ========================================
-- SCRIPT PARA EXECUTAR NO DASHBOARD DO SUPABASE
-- ========================================
-- Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new
-- Cole este script completo e execute
-- ========================================

-- 1. Padronizar desconto PIX para 5% em todo o sistema
UPDATE system_settings 
SET value = '5', updated_at = NOW()
WHERE key = 'pix_discount_percentage';

-- 2. Recalcular preços PIX dos planos de assinatura com 5% de desconto
UPDATE subscription_plans
SET 
  price_pix = price_full * 0.95,
  updated_at = NOW()
WHERE is_active = true;

-- 3. Desativar coleções sem personagens
UPDATE collections
SET is_active = false, updated_at = NOW()
WHERE id IN (
  SELECT c.id 
  FROM collections c
  LEFT JOIN collection_characters cc ON c.id = cc.collection_id
  GROUP BY c.id
  HAVING COUNT(cc.id) = 0
);

-- 4. Corrigir descrições teste
UPDATE collections
SET description = NULL, updated_at = NOW()
WHERE description IN ('aaa', 'test', 'teste', '');

-- 5. Remover coleções duplicadas (manter apenas a primeira de cada nome)
WITH duplicates AS (
  SELECT id, name,
    ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(name)) ORDER BY created_at) as rn
  FROM collections
)
UPDATE collections
SET is_active = false, updated_at = NOW()
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- ========================================
-- VERIFICAÇÕES (execute depois para confirmar)
-- ========================================

-- Verificar desconto PIX
SELECT key, value FROM system_settings WHERE key = 'pix_discount_percentage';

-- Verificar preços dos planos
SELECT name, plan_type, price_full, price_pix, (price_full - price_pix) as desconto
FROM subscription_plans 
WHERE is_active = true
ORDER BY display_order;

-- Verificar coleções ativas (só deve mostrar as com personagens)
SELECT 
  c.name, 
  c.is_active,
  COUNT(cc.id) as total_personagens
FROM collections c
LEFT JOIN collection_characters cc ON c.id = cc.collection_id
WHERE c.is_active = true
GROUP BY c.id, c.name, c.is_active
ORDER BY c.name;

-- ========================================
-- FIM DO SCRIPT
-- ========================================
