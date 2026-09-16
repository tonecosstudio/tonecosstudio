import { fetchAdminPricingSnapshot } from "@/services/admin/pricing/admin-pricing-snapshot-service";
import type { PurchaseMode } from "@/types/pricing-restructure";

export async function listAdminPurchaseModes(): Promise<PurchaseMode[]> {
  const snapshot = await fetchAdminPricingSnapshot();
  return snapshot.purchase_modes;
}
