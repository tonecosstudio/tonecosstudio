import { adminPaymentsGateway } from "@/services/admin/admin-payments-gateway";

export interface PreorderQuote {
  id: string;
  user_id: string;
  payment_status: string;
  ready_for_final_payment?: boolean | null;
  deposit_amount?: number | null;
  remaining_amount?: number | null;
  total_amount?: number | null;
  created_at: string;
  quote_items?: Array<{ id: string; models?: { name?: string | null } | null }> | null;
  profiles?: { full_name?: string | null; email?: string | null };
}

export interface AdminPreordersStats {
  total: number;
  pending_deposit: number;
  in_production: number;
  ready_for_payment: number;
  completed: number;
  total_deposits: number;
  total_remaining: number;
  total_revenue: number;
}

export async function fetchAdminPreorders(): Promise<PreorderQuote[]> {
  const { data, error } = await adminPaymentsGateway
    .from("quotes")
    .select(
      `
      *,
      quote_items (
        id,
        models (
          name
        )
      )
    `
    )
    .eq("is_preorder", true)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return Promise.all(
    ((data || []) as PreorderQuote[]).map(async (quote) => {
      const { data: profileData } = await adminPaymentsGateway
        .from("profiles")
        .select("full_name, email")
        .eq("id", quote.user_id)
        .maybeSingle();

      return {
        ...quote,
        profiles: profileData || { full_name: "N/A", email: "N/A" },
      };
    })
  );
}

export async function fetchAdminPreordersStats(): Promise<AdminPreordersStats> {
  const { data: quotes } = await adminPaymentsGateway
    .from("quotes")
    .select("payment_status, deposit_amount, remaining_amount, total_amount, ready_for_final_payment")
    .eq("is_preorder", true);

  return {
    total: quotes?.length || 0,
    pending_deposit: quotes?.filter((q) => q.payment_status === "pending").length || 0,
    in_production:
      quotes?.filter((q) => q.payment_status === "deposit_paid" && !q.ready_for_final_payment).length ||
      0,
    ready_for_payment:
      quotes?.filter((q) => q.payment_status === "deposit_paid" && q.ready_for_final_payment).length ||
      0,
    completed: quotes?.filter((q) => q.payment_status === "fully_paid").length || 0,
    total_deposits: quotes?.reduce((acc, q) => acc + (q.deposit_amount || 0), 0) || 0,
    total_remaining: quotes?.reduce((acc, q) => acc + (q.remaining_amount || 0), 0) || 0,
    total_revenue: quotes?.reduce((acc, q) => acc + (q.total_amount || 0), 0) || 0,
  };
}

export async function releaseAdminPreorderFinalPayment(quoteId: string): Promise<void> {
  const { error } = await adminPaymentsGateway
    .from("quotes")
    .update({
      ready_for_final_payment: true,
      final_payment_notified_at: new Date().toISOString(),
    })
    .eq("id", quoteId);

  if (error) throw error;
}

interface RegisterAdminPreorderManualPaymentInput {
  quoteId: string;
  paymentType: "deposit" | "final";
  amount: number;
}

export async function registerAdminPreorderManualPayment(
  input: RegisterAdminPreorderManualPaymentInput
): Promise<void> {
  const { error } = await adminPaymentsGateway.from("quote_payments").insert({
    quote_id: input.quoteId,
    payment_type: input.paymentType,
    amount: input.amount,
    status: "completed",
    payment_method: "manual",
    paid_at: new Date().toISOString(),
  });

  if (error) throw error;
}
