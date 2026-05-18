import { adminPaymentsGateway } from "@/services/admin/admin-payments-gateway";

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
  const { error } = await adminPaymentsGateway
    .from("system_settings")
    .update({ value: input.value, updated_at: new Date().toISOString() })
    .eq("key", input.key);

  if (error) throw error;
}
