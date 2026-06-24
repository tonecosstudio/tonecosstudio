import { supabase } from "@/integrations/supabase/client";
import { inferPixDiscountPercentage } from "@/lib/validations/pricing-tiers";
import { requireAuthenticatedUserId } from "@/services/auth/current-user";
import { callAuthenticatedEdgeFunction } from "@/services/supabase/edge-function-client";
import type {
  CreatePricingTierInput,
  PricingTier,
  PricingTierWithStats,
  PropagateTierPricingResponse,
  UpdatePricingTierInput,
} from "@/types/pricing-tiers";

type PricingTierRow = {
  id: string;
  name: string;
  description: string | null;
  price_full: number;
  price_pix: number;
  deposit_amount: number;
  is_active: boolean;
  is_default: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  pix_discount_percentage?: number | null;
  created_by?: string | null;
  updated_by?: string | null;
};

function toPricingTier(row: PricingTierRow): PricingTier {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price_full: row.price_full,
    deposit_amount: row.deposit_amount,
    pix_discount_percentage:
      row.pix_discount_percentage ?? inferPixDiscountPercentage(row.price_full, row.price_pix),
    price_pix: row.price_pix,
    is_active: row.is_active,
    is_default: row.is_default,
    display_order: row.display_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
    created_by: row.created_by ?? null,
    updated_by: row.updated_by ?? null,
  };
}

export async function fetchPricingTiersWithStats(): Promise<PricingTierWithStats[]> {
  const { data: tiers, error: tiersError } = await supabase
    .from("pricing_tiers")
    .select("*")
    .order("display_order", { ascending: true });

  if (tiersError) {
    throw new Error(`Erro ao buscar niveis de preco: ${tiersError.message}`);
  }

  const tierRows = (tiers ?? []) as unknown as PricingTierRow[];
  if (tierRows.length === 0) {
    return [];
  }

  const { data: assignments, error: assignmentsError } = await supabase
    .from("collection_tier_assignments")
    .select("tier_id, collection_id");

  if (assignmentsError) {
    throw new Error(`Erro ao buscar atribuicoes de niveis: ${assignmentsError.message}`);
  }

  const collectionIds = [...new Set((assignments ?? []).map((assignment) => assignment.collection_id))];
  const activeCollectionIds = new Set<string>();

  if (collectionIds.length > 0) {
    const { data: collections, error: collectionsError } = await supabase
      .from("collections")
      .select("id, is_active")
      .in("id", collectionIds);

    if (collectionsError) {
      throw new Error(`Erro ao buscar colecoes dos niveis: ${collectionsError.message}`);
    }

    for (const collection of collections ?? []) {
      if (collection.is_active) {
        activeCollectionIds.add(collection.id);
      }
    }
  }

  const totalsByTier = new Map<string, { total: number; active: number }>();
  for (const assignment of assignments ?? []) {
    const current = totalsByTier.get(assignment.tier_id) ?? { total: 0, active: 0 };
    current.total += 1;
    if (activeCollectionIds.has(assignment.collection_id)) {
      current.active += 1;
    }
    totalsByTier.set(assignment.tier_id, current);
  }

  return tierRows.map((row) => {
    const tier = toPricingTier(row);
    const counts = totalsByTier.get(tier.id) ?? { total: 0, active: 0 };

    return {
      ...tier,
      collections_count: counts.total,
      active_collections_count: counts.active,
    };
  });
}

export async function listActivePricingTiers(): Promise<PricingTier[]> {
  const { data, error } = await supabase
    .from("pricing_tiers")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar niveis ativos: ${error.message}`);
  }

  return ((data ?? []) as unknown as PricingTierRow[]).map(toPricingTier);
}

export async function getPricingTier(tierId: string): Promise<PricingTier> {
  const { data, error } = await supabase
    .from("pricing_tiers")
    .select("*")
    .eq("id", tierId)
    .single();

  if (error) {
    throw new Error(`Erro ao buscar nivel: ${error.message}`);
  }

  return toPricingTier(data as unknown as PricingTierRow);
}

export async function getDefaultPricingTier(): Promise<PricingTier | null> {
  const { data, error } = await supabase
    .from("pricing_tiers")
    .select("*")
    .eq("is_default", true)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao buscar nivel padrao: ${error.message}`);
  }

  return data ? toPricingTier(data as unknown as PricingTierRow) : null;
}

export async function createPricingTier(input: CreatePricingTierInput): Promise<string> {
  const userId = await requireAuthenticatedUserId();

  const { data, error } = await supabase.rpc("create_pricing_tier", {
    p_name: input.name,
    p_description: input.description || undefined,
    p_price_full: input.price_full,
    p_deposit_amount: input.deposit_amount,
    p_pix_discount_percentage: input.pix_discount_percentage || 5,
    p_is_default: input.is_default || false,
    p_created_by: userId,
  });

  if (error) {
    throw new Error(`Erro ao criar nivel: ${error.message}`);
  }

  return data as string;
}

export async function updatePricingTier(params: {
  tierId: string;
  input: UpdatePricingTierInput;
}): Promise<string> {
  const userId = await requireAuthenticatedUserId();

  const { error } = await supabase.rpc("update_pricing_tier", {
    p_tier_id: params.tierId,
    p_name: params.input.name || undefined,
    p_description: params.input.description || undefined,
    p_price_full: params.input.price_full ?? undefined,
    p_deposit_amount: params.input.deposit_amount ?? undefined,
    p_pix_discount_percentage: params.input.pix_discount_percentage ?? undefined,
    p_is_active: params.input.is_active ?? undefined,
    p_is_default: params.input.is_default ?? undefined,
    p_display_order: params.input.display_order ?? undefined,
    p_updated_by: userId,
  });

  if (error) {
    throw new Error(`Erro ao atualizar nivel: ${error.message}`);
  }

  return params.tierId;
}

export async function deactivatePricingTier(tierId: string): Promise<string> {
  const userId = await requireAuthenticatedUserId();

  const { error } = await supabase.rpc("update_pricing_tier", {
    p_tier_id: tierId,
    p_name: undefined,
    p_description: undefined,
    p_price_full: undefined,
    p_deposit_amount: undefined,
    p_pix_discount_percentage: undefined,
    p_is_active: false,
    p_is_default: undefined,
    p_display_order: undefined,
    p_updated_by: userId,
  });

  if (error) {
    throw new Error(`Erro ao desativar nivel: ${error.message}`);
  }

  return tierId;
}

export async function propagateTierPricing(
  tierId: string,
): Promise<PropagateTierPricingResponse> {
  return callAuthenticatedEdgeFunction<PropagateTierPricingResponse>(
    "propagate-tier-pricing",
    { tierId },
    "Erro ao propagar precos",
  );
}
