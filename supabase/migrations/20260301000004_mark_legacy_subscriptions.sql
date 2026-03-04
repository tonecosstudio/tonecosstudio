-- Migration: Mark Legacy Subscriptions
-- Description: Adiciona flag para identificar assinaturas do modelo antigo
-- Author: System
-- Date: 2026-03-01

-- Adicionar coluna is_legacy ÃƒÂ s assinaturas existentes
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS is_legacy BOOLEAN DEFAULT false;

-- Adicionar ÃƒÂ­ndice para performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_is_legacy 
ON subscriptions(is_legacy);

-- Marcar todas as assinaturas existentes (criadas antes do lanÃƒÂ§amento) como legado
-- Assinaturas sem entry_cycle_id sÃƒÂ£o do modelo antigo
UPDATE subscriptions
SET is_legacy = true
WHERE entry_cycle_id IS NULL;

-- Adicionar comentÃƒÂ¡rio
COMMENT ON COLUMN subscriptions.is_legacy IS 
'Indica se a assinatura usa o modelo antigo (true) ou novo modelo Premium Club v2.0 (false)';

-- Criar view para facilitar consultas de assinaturas legado
CREATE OR REPLACE VIEW legacy_subscriptions AS
SELECT 
  s.*,
  p.email as user_email,
  p.full_name as user_name,
  c.name as collection_name
FROM subscriptions s
JOIN profiles p ON p.id = s.user_id
LEFT JOIN collections c ON c.id = s.collection_id
WHERE s.is_legacy = true;

-- Criar view para assinaturas do novo modelo
CREATE OR REPLACE VIEW premium_club_subscriptions AS
SELECT 
  s.*,
  p.email as user_email,
  p.full_name as user_name,
  c.name as collection_name,
  cy.cycle_number,
  cy.month as cycle_month,
  cy.year as cycle_year,
  cy.status as cycle_status
FROM subscriptions s
JOIN profiles p ON p.id = s.user_id
LEFT JOIN collections c ON c.id = s.collection_id
LEFT JOIN cycles cy ON cy.id = s.entry_cycle_id
WHERE s.is_legacy = false;

-- Adicionar RLS policies para as views
ALTER VIEW legacy_subscriptions SET (security_invoker = true);
ALTER VIEW premium_club_subscriptions SET (security_invoker = true);

-- FunÃƒÂ§ÃƒÂ£o para migrar assinatura legado para novo modelo (se necessÃƒÂ¡rio no futuro)
CREATE OR REPLACE FUNCTION migrate_subscription_to_premium_club(
  p_subscription_id UUID,
  p_cycle_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Atualizar assinatura
  UPDATE subscriptions
  SET 
    entry_cycle_id = p_cycle_id,
    is_legacy = false,
    updated_at = NOW()
  WHERE id = p_subscription_id;
  
  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION migrate_subscription_to_premium_club IS
'Migra uma assinatura legado para o novo modelo Premium Club v2.0';
