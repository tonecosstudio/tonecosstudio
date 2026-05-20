// src/types/pricing-restructure.ts
// Feature: pricing-system-restructure
// Tipos TypeScript para o sistema de preços reestruturado

import type { Json } from "@/integrations/supabase/types";

/**
 * Modalidade de Compra (Purchase Mode)
 * Configuração global de uma modalidade
 */
export interface PurchaseMode {
  id: string;
  mode_key: 'standalone' | 'trimestral' | 'semestral' | 'anual';
  name: string;
  description: string | null;
  price_multiplier: number; // 0.1 a 2.0
  collections_count: number;
  deliveries_total: number;
  includes_bonus: boolean;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Plano de Assinatura Vinculado a Nível
 * Representa uma modalidade específica de um nível
 */
export interface SubscriptionPlanWithTier {
  id: string;
  tier_id: string;
  plan_mode: 'standalone' | 'trimestral' | 'semestral' | 'anual';
  plan_type: string; // Mantido para compatibilidade
  name: string;
  description: string | null;
  
  // Preços calculados automaticamente
  price_full: number;
  price_pix: number;
  price_multiplier: number;
  
  // Configuração
  collections_count: number;
  deliveries_total: number;
  includes_bonus: boolean;
  can_switch: boolean;
  switch_limit: number | null;
  switch_cutoff_days: number;
  max_installments: number;
  
  // Status
  is_active: boolean;
  display_order: number;
  
  // Auditoria
  created_at: string;
  updated_at: string;
}

/**
 * Nível de Preço com Planos
 * Inclui todos os planos (modalidades) do nível
 */
export interface PricingTierWithPlans {
  // Dados do nível
  tier_id: string;
  tier_name: string;
  tier_description: string | null;
  tier_price_base: number;
  tier_price_pix_base: number;
  tier_deposit: number;
  tier_is_active: boolean;
  tier_is_default: boolean;
  
  // Planos do nível
  plans: SubscriptionPlanWithTier[];
  
  // Estatísticas
  assigned_collections_count: number;
  total_active_subscriptions: number;
}

/**
 * Histórico de Mudanças de Modalidade
 */
export interface PurchaseModeHistory {
  id: string;
  mode_key: string;
  field_name: string;
  old_value: string | null;
  new_value: string;
  changed_at: string;
  changed_by: string | null;
  metadata: Record<string, Json> | null;
}

/**
 * Input para Criar Nível com Planos
 */
export interface CreateTierWithPlansInput {
  name: string;
  description?: string;
  price_full: number;
  deposit_amount: number;
  pix_discount_percentage?: number;
  is_default?: boolean;
  display_order?: number;
}

/**
 * Input para Atualizar Modalidade
 */
export interface UpdatePurchaseModeInput {
  price_multiplier?: number;
  collections_count?: number;
  deliveries_total?: number;
  includes_bonus?: boolean;
  is_active?: boolean;
}

/**
 * Resultado de Cálculo de Preços
 */
export interface PriceCalculationResult {
  mode_key: string;
  base_price: number;
  multiplier: number;
  calculated_price_full: number;
  calculated_price_pix: number;
  pix_discount_percentage: number;
}

/**
 * Resultado de Migração
 */
export interface MigrationResult {
  tiers_created: number;
  plans_migrated: number;
  plans_created: number;
  subscriptions_preserved: number;
  errors: string[];
  warnings: string[];
}

/**
 * Resultado da função create_tier_with_plans
 */
export interface CreateTierWithPlansResult {
  tier_id: string;
  plans_created: number;
}

/**
 * Resultado da função update_tier_and_recalculate_plans
 */
export interface UpdateTierAndRecalculateResult {
  plans_updated: number;
  collections_updated: number;
}

/**
 * Resultado da função update_purchase_mode_multiplier
 */
export interface UpdatePurchaseModeMultiplierResult {
  plans_updated: number;
  tiers_affected: number;
}
