import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import { adminPaymentsGateway } from "@/services/admin/payments/admin-payments-gateway";

export interface PreorderQuote {
  id: string;
  user_id: string;
  payment_status: string | null;
  ready_for_final_payment?: boolean | null;
  deposit_amount?: number | null;
  remaining_amount?: number | null;
  total_amount?: number | null;
  created_at: string;
  quote_items?: Array<{ id: string; name?: string | null }> | null;
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

interface AdminPreordersFilter extends PromiseLike<{ data: PreorderQuote[] | null; error: Error | null }> {
  order(
    column: string,
    options?: { ascending?: boolean }
  ): Promise<{ data: PreorderQuote[] | null; error: Error | null }>;
}

interface AdminPreordersGateway {
  from(table: "quotes"): {
    select(columns: string): {
      eq(column: string, value: boolean): AdminPreordersFilter;
    };
  };
}

const adminPreordersGateway = adminPaymentsGateway as unknown as AdminPreordersGateway;

export async function fetchAdminPreorders(): Promise<PreorderQuote[]> {
  const { data, error } = await adminPreordersGateway
    .from("quotes")
    .select(
      `
      *,
      quote_items (
        id,
        name
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
  const { data: quotes } = await adminPreordersGateway
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
  await callAdminRpc("admin_release_preorder_final_payment", {
    p_quote_id: quoteId,
  });
}

interface RegisterAdminPreorderManualPaymentInput {
  quoteId: string;
  paymentType: "deposit" | "final";
  amount: number;
}

export async function registerAdminPreorderManualPayment(
  input: RegisterAdminPreorderManualPaymentInput
): Promise<void> {
  await callAdminRpc("admin_register_preorder_manual_payment", {
    p_quote_id: input.quoteId,
    p_payment_type: input.paymentType,
    p_amount: input.amount,
  });
}
