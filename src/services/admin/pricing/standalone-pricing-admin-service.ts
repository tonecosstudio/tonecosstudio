import { adminPaymentsGateway } from "@/services/admin/payments/admin-payments-gateway";
import { updateStandalonePricingRpc } from "@/services/admin/config/admin-config-mutations-service";

export interface StandalonePricing {
  id: string;
  character_type: "colecao_ativa" | "colecao_secundaria" | "catalogo_geral" | "premium";
  price_full: number;
  price_pix: number;
  pix_discount_percentage: number;
  description: string;
}

interface StandalonePricingRow extends StandalonePricing {
  is_active: boolean;
}

interface StandalonePricingQuery {
  eq(column: "is_active", value: boolean): {
    order(column: "character_type"): Promise<{ data: StandalonePricingRow[] | null; error: Error | null }>;
  };
}

interface StandalonePricingGateway {
  from(table: "character_standalone_pricing"): {
    select(columns: string): StandalonePricingQuery;
  };
}

const standalonePricingGateway = adminPaymentsGateway as unknown as StandalonePricingGateway;

export async function fetchStandalonePricing(): Promise<StandalonePricing[]> {
  const { data, error } = await standalonePricingGateway
    .from("character_standalone_pricing")
    .select("*")
    .eq("is_active", true)
    .order("character_type");

  if (error) throw error;
  return data || [];
}

export async function updateStandalonePricing(input: {
  updates: Array<{ id?: string; price: number }>;
  pixDiscount: number;
}): Promise<void> {
  await updateStandalonePricingRpc(input);
}
