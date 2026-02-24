-- Executar este SQL diretamente no Supabase SQL Editor
-- https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql

-- Add installments column
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS max_installments INTEGER NOT NULL DEFAULT 10;

-- Update existing plans to 10x
UPDATE subscription_plans
SET max_installments = 10;

-- Add comment
COMMENT ON COLUMN subscription_plans.max_installments IS 'Maximum number of installments without interest (e.g., 10 for 10x sem juros)';

-- Verificar resultado
SELECT id, name, price_full, price_pix, max_installments 
FROM subscription_plans 
ORDER BY display_order;
