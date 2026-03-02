/**
 * Hook para buscar nível de preço com todos os planos
 * 
 * Fornece query para buscar um nível com todos os seus planos (modalidades).
 * Requisitos: 4.5, 6.1, 6.2, 11.7
 * Tarefa: 7.3
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PricingTierWithPlans } from "@/types/pricing-restructure";

// =====================================================
// QUERY KEYS
// =====================================================

export const tierWithPlansKeys = {
  all: ["tier-with-plans"] as const,
  detail: (tierId: string) => [...tierWithPlansKeys.all, tierId] as const,
};

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

      if (!viewData || viewData.length === 0) {
        return null;
      }

      const tierData = viewData[0];

      // Buscar planos do nível
      const { data: plansData, error: plansError } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("tier_id", tierId)
        .order("display_order", { ascending: true });

      if (plansError) {
        throw new Error(`Erro ao buscar planos: ${plansError.message}`);
      }

      // Montar resultado consolidado
      const result: PricingTierWithPlans = {
        tier_id: tierData.tier_id,
        tier_name: tierData.tier_name,
        tier_description: tierData.tier_description,
        tier_price_base: tierData.tier_price_base,
        tier_price_pix_base: tierData.tier_price_pix_base,
        tier_deposit: tierData.tier_deposit,
        tier_is_active: tierData.tier_is_active,
        tier_is_default: tierData.tier_is_default,
        plans: plansData,
        assigned_collections_count: tierData.assigned_collections_count || 0,
        total_active_subscriptions: tierData.active_subscriptions_count || 0,
      };

      return result;
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
      const plansByTier = plansData.reduce((acc, plan) => {
        if (!plan.tier_id) return acc;
        if (!acc[plan.tier_id]) {
          acc[plan.tier_id] = [];
        }
        acc[plan.tier_id].push(plan);
        return acc;
      }, {} as Record<string, typeof plansData>);

      // Agrupar dados da view por tier_id (pegar primeiro registro de cada tier)
      const tierStatsMap = new Map<string, typeof tiersData[0]>();
      tiersData.forEach((row) => {
        if (!tierStatsMap.has(row.tier_id)) {
          tierStatsMap.set(row.tier_id, row);
        }
      });

      // Montar resultado consolidado
      const uniqueTierIds = Array.from(tierStatsMap.keys());
      const results: PricingTierWithPlans[] = uniqueTierIds.map((tierId) => {
        const tier = tierStatsMap.get(tierId)!;
        return {
          tier_id: tier.tier_id,
          tier_name: tier.tier_name,
          tier_description: tier.tier_description,
          tier_price_base: tier.tier_price_base,
          tier_price_pix_base: tier.tier_price_pix_base,
          tier_deposit: tier.tier_deposit,
          tier_is_active: tier.tier_is_active,
          tier_is_default: tier.tier_is_default,
          plans: plansByTier[tierId] || [],
          assigned_collections_count: tier.assigned_collections_count || 0,
          total_active_subscriptions: tier.active_subscriptions_count || 0,
        };
      });

      return results;
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}
