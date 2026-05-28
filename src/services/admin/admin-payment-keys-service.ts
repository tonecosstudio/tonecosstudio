import { adminPaymentsGateway } from "@/services/admin/admin-payments-gateway";
import { updateAdminPaymentSetting } from "@/services/admin/admin-config-mutations-service";

export interface PaymentKey {
  key: string;
  value: string;
  description: string;
}

export async function fetchAdminPaymentKeys(): Promise<PaymentKey[]> {
  const { data, error } = await adminPaymentsGateway
    .from("system_settings")
    .select("*")
    .or("key.like.pix_key_%,key.like.payment_link_%")
    .order("key");

  if (error) throw error;
  return (data || []) as PaymentKey[];
}

export async function updateAdminPaymentKey(input: { key: string; value: string }): Promise<void> {
  await updateAdminPaymentSetting(input);
}
