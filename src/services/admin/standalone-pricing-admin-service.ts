import { adminPaymentsGateway } from "@/services/admin/admin-payments-gateway";

export interface StandalonePricing {
  id: string;
  character_type: "colecao_ativa" | "colecao_secundaria" | "catalogo_geral" | "premium";
  price_full: number;
  price_pix: number;
  pix_discount_percentage: number;
  description: string;
}

export async function fetchStandalonePricing(): Promise<StandalonePricing[]> {
  const { data, error } = await adminPaymentsGateway
    .from("character_standalone_pricing")
    .select("*")
    .eq("is_active", true)
    .order("character_type");

  if (error) throw error;
  return (data || []) as StandalonePricing[];
}

export async function updateStandalonePricing(input: {
  updates: Array<{ id?: string; price: number }>;
  pixDiscount: number;
}): Promise<void> {
  for (const update of input.updates) {
    if (!update.id) continue;

    const { error } = await adminPaymentsGateway
      .from("character_standalone_pricing")
      .update({
        price_full: update.price,
        pix_discount_percentage: input.pixDiscount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", update.id);

    if (error) throw error;
  }
}
