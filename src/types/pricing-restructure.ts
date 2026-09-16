import type { Json } from "@/integrations/supabase/types";

export interface PurchaseMode {
  id: string;
  mode_key: "standalone" | "trimestral" | "semestral" | "anual";
  name: string;
  description: string | null;
  price_multiplier: number;
  collections_count: number;
  deliveries_total: number;
  includes_bonus: boolean;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlanWithTier {
  id: string;
  tier_id: string;
  plan_mode: "standalone" | "trimestral" | "semestral" | "anual";
  plan_type: string;
  name: string;
  description: string | null;
  price_full: number;
  price_pix: number;
  price_multiplier: number;
  collections_count: number;
  deliveries_total: number;
  includes_bonus: boolean;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface PricingTierWithPlans {
  tier_id: string;
  tier_name: string;
  tier_description: string | null;
  tier_price_base: number;
  tier_price_pix_base: number;
  tier_deposit: number;
  tier_is_active: boolean;
  tier_is_default: boolean;
  plans: SubscriptionPlanWithTier[];
  assigned_collections_count: number;
  total_active_subscriptions: number;
}

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

export interface UpdatePurchaseModeInput {
  price_multiplier?: number;
  collections_count?: number;
  deliveries_total?: number;
  includes_bonus?: boolean;
  is_active?: boolean;
}

export interface PriceCalculationResult {
  mode_key: string;
  base_price: number;
  multiplier: number;
  calculated_price_full: number;
  calculated_price_pix: number;
  pix_discount_percentage: number;
}

export interface MigrationResult {
  tiers_created: number;
  plans_migrated: number;
  plans_created: number;
  subscriptions_preserved: number;
  errors: string[];
  warnings: string[];
}

export interface UpdatePurchaseModeMultiplierResult {
  plans_updated: number;
  tiers_affected: number;
}
