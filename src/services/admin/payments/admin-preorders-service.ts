import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import {
  requireAdminRpcMatchingId,
  requireAdminRpcUuid,
} from "@/services/admin/rpc/admin-rpc-results";
import { adminPaymentsGateway } from "@/services/admin/payments/admin-payments-gateway";
import { createStorageSignedUrl } from "@/services/supabase/storage-client";
import { requireTonecosAdminAccess } from "@/services/auth/tonecos-admin-access";

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
  payment_voucher_path: string | null;
  payment_voucher_type: "deposit" | "final" | null;
  payment_voucher_rejection_reason: string | null;
  payment_voucher_url: string | null;
}

export interface AdminPreordersStats {
  total: number;
  pending_deposit: number;
  pending_review: number;
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
  await requireTonecosAdminAccess();
  const { data, error } = await adminPaymentsGateway
    .from("quotes")
    .select(
      "id,user_id,payment_status,ready_for_final_payment,deposit_amount,remaining_amount,total_amount,created_at,payment_voucher_path,payment_voucher_type,payment_voucher_rejection_reason",
    )
    .eq("is_preorder", true)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = data ?? [];
  const voucherUrls = await Promise.all(rows.map(async (quote) => {
    if (!quote.payment_voucher_path) return null;
    const { data: signedData, error: signedError } = await createStorageSignedUrl(
      "payment-vouchers",
      quote.payment_voucher_path,
      60 * 60,
    );
    if (signedError) throw new Error(`Falha ao abrir comprovante da pré-venda ${quote.id}.`);
    return signedData?.signedUrl ?? null;
  }));

  return Promise.all(
    rows.map(async (quote, index) => {
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
        payment_voucher_path: quote.payment_voucher_path ?? null,
        payment_voucher_type:
          quote.payment_voucher_type === "deposit" || quote.payment_voucher_type === "final"
            ? quote.payment_voucher_type
            : null,
        payment_voucher_rejection_reason: quote.payment_voucher_rejection_reason ?? null,
        payment_voucher_url: voucherUrls[index] ?? null,
      };
    }),
  );
}

export async function fetchAdminPreordersStats(): Promise<AdminPreordersStats> {
  const { data, error } = await adminPaymentsGateway
    .from("quotes")
    .select(
      "payment_status,payment_voucher_type,ready_for_final_payment,deposit_amount,remaining_amount,total_amount",
    )
    .eq("is_preorder", true);

  if (error) {
    throw new Error(`Falha ao carregar métricas de pré-vendas: ${error.message}`);
  }

  const quotes = data ?? [];

  const totalDepositsReceived = quotes.reduce((total, quote) => {
    const depositWasPaid =
      quote.payment_status === "deposit_paid" ||
      quote.payment_status === "fully_paid" ||
      (quote.payment_status === "under_review" && quote.payment_voucher_type === "final");
    if (!depositWasPaid) {
      return total;
    }
    return total + positiveAmountOrZero(quote.deposit_amount);
  }, 0);

  const totalOutstandingFinalBalance = quotes.reduce((total, quote) => {
    const balanceIsOutstanding =
      quote.payment_status === "deposit_paid" ||
      (quote.payment_status === "under_review" && quote.payment_voucher_type === "final");
    if (!balanceIsOutstanding) return total;
    return total + positiveAmountOrZero(quote.remaining_amount);
  }, 0);

  const totalRevenueReceived = quotes.reduce((total, quote) => {
    if (quote.payment_status === "fully_paid") {
      return total + positiveAmountOrZero(quote.total_amount);
    }
    if (quote.payment_status === "deposit_paid") {
      return total + positiveAmountOrZero(quote.deposit_amount);
    }
    if (quote.payment_status === "under_review" && quote.payment_voucher_type === "final") {
      return total + positiveAmountOrZero(quote.deposit_amount);
    }
    return total;
  }, 0);

  return {
    total: quotes.length,
    pending_deposit: quotes.filter((quote) => quote.payment_status === "pending").length,
    pending_review: quotes.filter((quote) => quote.payment_status === "under_review").length,
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

export async function rejectAdminPreorderVoucher(input: {
  quoteId: string;
  rejectionReason: string;
}): Promise<void> {
  const reason = input.rejectionReason.trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.quoteId)) {
    throw new Error("Pré-venda inválida.");
  }
  if (!reason || reason.length > 500) {
    throw new Error("Informe um motivo de rejeição de até 500 caracteres.");
  }

  const result = await callAdminRpc<unknown>("admin_reject_preorder_payment_voucher", {
    p_quote_id: input.quoteId.toLowerCase(),
    p_rejection_reason: reason,
  });
  requireAdminRpcMatchingId(result, input.quoteId, "Preorder voucher rejection");
}
