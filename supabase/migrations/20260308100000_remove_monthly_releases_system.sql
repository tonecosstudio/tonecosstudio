-- ============================================================================
-- Migration: Remove Monthly Releases System
-- Description: Remove sistema não usado de lançamentos mensais que conflita
--              com o sistema atual de character_choices
-- Date: 2026-03-08 10:00:00
-- ============================================================================

-- ============================================================================
-- PASSO 1: Drop triggers
-- ============================================================================

DROP TRIGGER IF EXISTS trg_update_coins_balance ON subscription_monthly_selections;

-- ============================================================================
-- PASSO 2: Drop views
-- ============================================================================

DROP VIEW IF EXISTS subscription_selections_detailed CASCADE;

-- ============================================================================
-- PASSO 3: Drop funções
-- ============================================================================

DROP FUNCTION IF EXISTS get_contextual_character_price(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS update_subscription_coins_balance() CASCADE;
DROP FUNCTION IF EXISTS auto_select_characters_for_subscription(UUID) CASCADE;
DROP FUNCTION IF EXISTS simulate_character_selection_impact(UUID, UUID, TEXT) CASCADE;

-- ============================================================================
-- PASSO 4: Drop tabelas
-- ============================================================================

DROP TABLE IF EXISTS subscription_monthly_selections CASCADE;
DROP TABLE IF EXISTS collection_monthly_releases CASCADE;

-- ============================================================================
-- PASSO 5: Remover colunas não usadas de subscriptions
-- ============================================================================

ALTER TABLE subscriptions 
DROP COLUMN IF EXISTS active_collection_id,
DROP COLUMN IF EXISTS coins_balance,
DROP COLUMN IF EXISTS coins_initial;

-- ============================================================================
-- PASSO 6: Adicionar comentário
-- ============================================================================

COMMENT ON TABLE subscriptions IS 
  'Assinaturas de clientes.
   Sistema de escolha via character_choices (não usa coins).
   Sistema de lançamentos mensais foi removido em 2026-03-08.';

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================
