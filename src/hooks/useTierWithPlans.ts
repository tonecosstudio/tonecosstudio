/**
 * Hook para buscar nível de preço com todos os planos
 * 
 * Fornece query para buscar um nível com todos os seus planos (modalidades).
 * Requisitos: 4.5, 6.1, 6.2, 11.7
 * Tarefa: 7.3
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PricingTierWithPlans, SubscriptionPlanWithTier } from "@/types/pricing-restructure";

// =====================================================
// QUERY KEYS
// =====================================================

export const tierWithPlansKeys = {
  all: ["tier-with-plans"] as const,
  detail: (tierId: string) => [...tierWithPlansKeys.all, tierId] as const,
};

type PricingTierViewRow = {
  tier_id: string | null;
  tier_name: string | null;
  tier_description: string | null;
  tier_price_base?: number | null;
  tier_base_price?: number | null;
  tier_price_pix_base?: number | null;
  tier_deposit?: number | null;
  tier_is_active: boolean | null;
  tier_is_default: boolean | null;
  tier_display_order?: number | null;
  assigned_collections_count?: number | null;
  active_subscriptions_count?: number | null;
};

type SubscriptionPlanQueryRow = Partial<SubscriptionPlanWithTier> & {
  id: string;
  tier_id: string | null;
  name: string;
  description: string | null;
  price?: number | null;
  plan_type?: string | null;
  billing_interval?: string | null;
  deliveries_per_cycle?: number | null;
};

function requireText(value: string | null | undefined, fieldName: string): string {
  if (!value) {
    throw new Error(`Invalid pricing tier row: missing ${fieldName}`);
  }

  return value;
}

function toSubscriptionPlanWithTier(row: SubscriptionPlanQueryRow): SubscriptionPlanWithTier {
  const priceFull = row.price_full ?? row.price ?? 0;
  const planMode = row.plan_mode ?? row.plan_type ?? row.billing_interval ?? "standalone";

  return {
    id: row.id,
    tier_id: requireText(row.tier_id, "plan.tier_id"),
    plan_mode: planMode as SubscriptionPlanWithTier["plan_mode"],
    plan_type: row.plan_type ?? planMode,
    name: row.name,
    description: row.description,
    price_full: priceFull,
    price_pix: row.price_pix ?? priceFull,
    price_multiplier: row.price_multiplier ?? 1,
    collections_count: row.collections_count ?? 1,
    deliveries_total: row.deliveries_total ?? row.deliveries_per_cycle ?? 1,
    includes_bonus: row.includes_bonus ?? false,
    can_switch: row.can_switch ?? true,
    switch_limit: row.switch_limit ?? null,
    switch_cutoff_days: row.switch_cutoff_days ?? 15,
    max_installments: row.max_installments ?? 1,
    is_active: row.is_active ?? true,
    display_order: row.display_order ?? 0,
    created_at: requireText(row.created_at, "plan.created_at"),
    updated_at: requireText(row.updated_at, "plan.updated_at"),
  };
}

function toPricingTierWithPlans(
  tier: PricingTierViewRow,
  plans: SubscriptionPlanWithTier[],
): PricingTierWithPlans {
  const tierPriceBase = tier.tier_price_base ?? tier.tier_base_price ?? 0;

  return {
    tier_id: requireText(tier.tier_id, "tier_id"),
    tier_name: requireText(tier.tier_name, "tier_name"),
    tier_description: tier.tier_description,
    tier_price_base: tierPriceBase,
    tier_price_pix_base: tier.tier_price_pix_base ?? tierPriceBase,
    tier_deposit: tier.tier_deposit ?? 0,
    tier_is_active: tier.tier_is_active ?? true,
    tier_is_default: tier.tier_is_default ?? false,
    plans,
    assigned_collections_count: tier.assigned_collections_count ?? 0,
    total_active_subscriptions: tier.active_subscriptions_count ?? 0,
  };
}

// =====================================================
// QUERIES
// =====================================================

/**
 * Hook para buscar um nível com todos os seus planos
 * Usa a view pricing_tiers_with_plans que consolida dados do nível e planos
 * 
 * NOTA: A view usa funções SECURITY DEFINER para bypassar RLS em estatísticas
 * agregadas (contagens), permitindo acesso via REST API sem expor dados sensíveis.
 * 
 * Requisitos: 4.5, 6.1, 6.2, 11.7
 */
export function useTierWithPlans(tierId: string | null | undefined) {
  return useQuery({
    queryKey: tierWithPlansKeys.detail(tierId || ""),
    queryFn: async () => {
      if (!tierId) return null;

      // Buscar dados do nível com estatísticas via view
      // A view agora funciona corretamente via REST API após correção RLS
      const { data: viewData, error: viewError } = await supabase
        .from("pricing_tiers_with_plans")
        .select("*")
        .eq("tier_id", tierId)
        .limit(1);

      if (viewError) {
        throw new Error(`Erro ao buscar nível: ${viewError.message}`);
      }

      const tierRows = (viewData ?? []) as unknown as PricingTierViewRow[];

      if (tierRows.length === 0) {
        return null;
      }

      const tierData = tierRows[0];

      // Buscar planos do nível
      const { data: plansData, error: plansError } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("tier_id", tierId)
        .order("display_order", { ascending: true });

      if (plansError) {
        throw new Error(`Erro ao buscar planos: ${plansError.message}`);
      }

      const plans = ((plansData ?? []) as unknown as SubscriptionPlanQueryRow[])
        .map(toSubscriptionPlanWithTier);

      return toPricingTierWithPlans(tierData, plans);
    },
    enabled: !!tierId,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

/**
 * Hook para buscar todos os níveis com seus planos
 * Útil para visualizações hierárquicas completas
 * 
 * NOTA: A view usa funções SECURITY DEFINER para bypassar RLS em estatísticas
 * agregadas (contagens), permitindo acesso via REST API sem expor dados sensíveis.
 * 
 * Requisitos: 11.7
 */
export function useAllTiersWithPlans() {
  return useQuery({
    queryKey: [...tierWithPlansKeys.all, "list"],
    queryFn: async () => {
      // Buscar todos os níveis via view
      // A view agora funciona corretamente via REST API após correção RLS
      const { data: tiersData, error: tiersError } = await supabase
        .from("pricing_tiers_with_plans")
        .select("*")
        .order("tier_display_order", { ascending: true });

      if (tiersError) {
        throw new Error(`Erro ao buscar níveis: ${tiersError.message}`);
      }

      // Buscar todos os planos
      const { data: plansData, error: plansError } = await supabase
        .from("subscription_plans")
        .select("*")
        .not("tier_id", "is", null)
        .order("tier_id", { ascending: true })
        .order("display_order", { ascending: true });

      if (plansError) {
        throw new Error(`Erro ao buscar planos: ${plansError.message}`);
      }

      // Agrupar planos por tier_id
      const plans = ((plansData ?? []) as unknown as SubscriptionPlanQueryRow[])
        .map(toSubscriptionPlanWithTier);

      const plansByTier = plans.reduce((acc, plan) => {
        if (!plan.tier_id) return acc;
        if (!acc[plan.tier_id]) {
          acc[plan.tier_id] = [];
        }
        acc[plan.tier_id].push(plan);
        return acc;
      }, {} as Record<string, SubscriptionPlanWithTier[]>);

      // Agrupar dados da view por tier_id (pegar primeiro registro de cada tier)
      const tierRows = (tiersData ?? []) as unknown as PricingTierViewRow[];
      const tierStatsMap = new Map<string, PricingTierViewRow>();
      tierRows.forEach((row) => {
        if (!row.tier_id) return;
        if (!tierStatsMap.has(row.tier_id)) {
          tierStatsMap.set(row.tier_id, row);
        }
      });

      // Montar resultado consolidado
      const uniqueTierIds = Array.from(tierStatsMap.keys());
      const results: PricingTierWithPlans[] = uniqueTierIds.map((tierId) => {
        const tier = tierStatsMap.get(tierId)!;
        return toPricingTierWithPlans(tier, plansByTier[tierId] || []);
      });

      return results;
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}
