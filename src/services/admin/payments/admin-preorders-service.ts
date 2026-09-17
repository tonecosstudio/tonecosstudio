import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import {
  requireAdminRpcMatchingId,
  requireAdminRpcUuid,
} from "@/services/admin/rpc/admin-rpc-results";
import { adminPaymentsGateway } from "@/services/admin/payments/admin-payments-gateway";

export interface PreorderQuote {
  id: string;
  user_id: string;
  payment_status: string | null;
  ready_for_final_payment: boolean;
  deposit_amount: number | null;
  remaining_amount: number | null;
  total_amount: number | null;
  created_at: string;
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

function positiveAmountOrZero(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

export async function fetchAdminPreorders(): Promise<PreorderQuote[]> {
  const { data, error } = await adminPaymentsGateway
    .from("quotes")
    .select(
      "id,user_id,payment_status,ready_for_final_payment,deposit_amount,remaining_amount,total_amount,created_at",
    )
    .eq("is_preorder", true)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return Promise.all(
    (data ?? []).map(async (quote) => {
      const { data: profileData, error: profileError } = await adminPaymentsGateway
        .from("profiles")
        .select("full_name, email")
        .eq("id", quote.user_id)
        .maybeSingle();

      if (profileError) {
        throw new Error(
          `Falha ao carregar o cliente da pré-venda ${quote.id}: ${profileError.message}`,
        );
      }

      return {
        ...quote,
        profiles: profileData ?? { full_name: "N/A", email: "N/A" },
      };
    }),
  );
}

export async function fetchAdminPreordersStats(): Promise<AdminPreordersStats> {
  const { data, error } = await adminPaymentsGateway
    .from("quotes")
    .select(
      "payment_status,ready_for_final_payment,deposit_amount,remaining_amount,total_amount",
    )
    .eq("is_preorder", true);

  if (error) {
    throw new Error(`Falha ao carregar métricas de pré-vendas: ${error.message}`);
  }

  const quotes = data ?? [];

  const totalDepositsReceived = quotes.reduce((total, quote) => {
    if (quote.payment_status !== "deposit_paid" && quote.payment_status !== "fully_paid") {
      return total;
    }
    return total + positiveAmountOrZero(quote.deposit_amount);
  }, 0);

  const totalOutstandingFinalBalance = quotes.reduce((total, quote) => {
    if (quote.payment_status !== "deposit_paid") return total;
    return total + positiveAmountOrZero(quote.remaining_amount);
  }, 0);

  const totalRevenueReceived = quotes.reduce((total, quote) => {
    if (quote.payment_status === "fully_paid") {
      return total + positiveAmountOrZero(quote.total_amount);
    }
    if (quote.payment_status === "deposit_paid") {
      return total + positiveAmountOrZero(quote.deposit_amount);
    }
    return total;
  }, 0);

  return {
    total: quotes.length,
    pending_deposit: quotes.filter((quote) => quote.payment_status === "pending").length,
    in_production: quotes.filter(
      (quote) => quote.payment_status === "deposit_paid" && !quote.ready_for_final_payment,
    ).length,
    ready_for_payment: quotes.filter(
      (quote) => quote.payment_status === "deposit_paid" && quote.ready_for_final_payment,
    ).length,
    completed: quotes.filter((quote) => quote.payment_status === "fully_paid").length,
    total_deposits: totalDepositsReceived,
    total_remaining: totalOutstandingFinalBalance,
    total_revenue: totalRevenueReceived,
  };
}

export async function releaseAdminPreorderFinalPayment(quoteId: string): Promise<void> {
  const result = await callAdminRpc<unknown>("admin_release_preorder_final_payment", {
    p_quote_id: quoteId,
  });

  requireAdminRpcMatchingId(result, quoteId, "Preorder final payment release");
}

interface RegisterAdminPreorderManualPaymentInput {
  quoteId: string;
  paymentType: "deposit" | "final";
  amount: number;
}

export async function registerAdminPreorderManualPayment(
  input: RegisterAdminPreorderManualPaymentInput,
): Promise<void> {
  const result = await callAdminRpc<unknown>("admin_register_preorder_manual_payment", {
    p_quote_id: input.quoteId,
    p_payment_type: input.paymentType,
    p_amount: input.amount,
  });

  requireAdminRpcUuid(result, "Preorder manual payment registration");
}
