
ALTER TABLE subscription_plans ADD COLUMN coins_included integer NOT NULL DEFAULT 0;

UPDATE subscription_plans SET coins_included = 600 WHERE slug = 'trimestral';
UPDATE subscription_plans SET coins_included = 1400 WHERE slug = 'semestral';
