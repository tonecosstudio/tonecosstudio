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
  is_preorder: boolean;
  status: string;
  payment_status: string | null;
  ready_for_final_payment: boolean;
  deposit_amount: number | null;
  remaining_amount: number | null;
  total_amount: number | null;
  created_at: string;
  profiles?: { full_name?: string | null; email?: string | null };
  payment_voucher_path: string | null;
  payment_voucher_type: "deposit" | "final" | "full" | null;
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
  total_coins_applied: number;
  total_remaining: number;
  total_revenue: number;
}

function positiveAmountOrZero(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : 0;
}

export async function fetchAdminPreorders(): Promise<PreorderQuote[]> {
  await requireTonecosAdminAccess();
  const { data, error } = await adminPaymentsGateway
    .from("quotes")
    .select(
      "id,user_id,is_preorder,status,payment_status,ready_for_final_payment,deposit_amount,remaining_amount,total_amount,created_at,payment_voucher_path,payment_voucher_type,payment_voucher_rejection_reason",
    )
    .or(
      "is_preorder.eq.true,and(is_preorder.eq.false,status.eq.answered),and(is_preorder.eq.false,payment_status.not.is.null)",
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = data ?? [];
  const voucherUrls = await Promise.all(
    rows.map(async (quote) => {
      if (!quote.payment_voucher_path) return null;
      const { data: signedData, error: signedError } =
        await createStorageSignedUrl(
          "payment-vouchers",
          quote.payment_voucher_path,
          60 * 60,
        );
      if (signedError)
        throw new Error(`Falha ao abrir comprovante da pré-venda ${quote.id}.`);
      return signedData?.signedUrl ?? null;
    }),
  );

  return Promise.all(
    rows.map(async (quote, index) => {
      const { data: profileData, error: profileError } =
        await adminPaymentsGateway
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
        is_preorder: quote.is_preorder === true,
        status: String(quote.status ?? ""),
        profiles: profileData ?? { full_name: "N/A", email: "N/A" },
        payment_voucher_path: quote.payment_voucher_path ?? null,
        payment_voucher_type:
          quote.payment_voucher_type === "deposit" ||
          quote.payment_voucher_type === "final" ||
          quote.payment_voucher_type === "full"
            ? quote.payment_voucher_type
            : null,
        payment_voucher_rejection_reason:
          quote.payment_voucher_rejection_reason ?? null,
        payment_voucher_url: voucherUrls[index] ?? null,
      };
    }),
  );
}

export async function fetchAdminPreordersStats(): Promise<AdminPreordersStats> {
  const { data, error } = await adminPaymentsGateway
    .from("quotes")
    .select(
      "id,is_preorder,status,payment_status,payment_voucher_type,ready_for_final_payment,deposit_amount,remaining_amount,total_amount",
    )
    .or(
      "is_preorder.eq.true,and(is_preorder.eq.false,status.eq.answered),and(is_preorder.eq.false,payment_status.not.is.null)",
    );

  if (error) {
    throw new Error(
      `Falha ao carregar métricas de pré-vendas: ${error.message}`,
    );
  }

  const quotes = data ?? [];
  const quoteIds = quotes.map((quote) => quote.id);
  const paymentRows =
    quoteIds.length === 0
      ? []
      : await adminPaymentsGateway
          .from("quote_payments")
          .select("quote_id,payment_type,amount")
          .eq("status", "completed")
          .in("quote_id", quoteIds)
          .then(({ data: payments, error: paymentError }) => {
            if (paymentError)
              throw new Error(
                `Falha ao carregar pagamentos confirmados: ${paymentError.message}`,
              );
            return payments ?? [];
          });
  const paidByQuote = new Map<string, number>();
  let totalRevenueReceived = 0;
  let totalDepositsReceived = 0;
  let totalCoinsApplied = 0;
  for (const payment of paymentRows) {
    const amount = positiveAmountOrZero(payment.amount);
    if (payment.payment_type === "coins") totalCoinsApplied += amount;
    else totalRevenueReceived += amount;
    if (payment.payment_type === "deposit") totalDepositsReceived += amount;
    paidByQuote.set(
      payment.quote_id,
      (paidByQuote.get(payment.quote_id) ?? 0) + amount,
    );
  }
  const totalOutstandingFinalBalance = quotes.reduce((total, quote) => {
    const totalAmount = positiveAmountOrZero(quote.total_amount);
    const paidAmount = paidByQuote.get(quote.id) ?? 0;
    return total + Math.max(0, totalAmount - paidAmount);
  }, 0);

  return {
    total: quotes.length,
    pending_deposit: quotes.filter((quote) =>
      quote.is_preorder
        ? quote.payment_status === "pending"
        : quote.status === "answered" &&
          (quote.payment_status === null || quote.payment_status === "pending"),
    ).length,
    pending_review: quotes.filter(
      (quote) => quote.payment_status === "under_review",
    ).length,
    in_production: quotes.filter(
      (quote) =>
        quote.is_preorder &&
        quote.payment_status === "deposit_paid" &&
        !quote.ready_for_final_payment,
    ).length,
    ready_for_payment: quotes.filter(
      (quote) =>
        quote.is_preorder &&
        quote.payment_status === "deposit_paid" &&
        quote.ready_for_final_payment,
    ).length,
    completed: quotes.filter((quote) => quote.payment_status === "fully_paid")
      .length,
    total_deposits: totalDepositsReceived,
    total_coins_applied: totalCoinsApplied,
    total_remaining: totalOutstandingFinalBalance,
    total_revenue: totalRevenueReceived,
  };
}

export async function releaseAdminPreorderFinalPayment(
  quoteId: string,
): Promise<void> {
  const result = await callAdminRpc<unknown>(
    "admin_release_preorder_final_payment",
    {
      p_quote_id: quoteId,
    },
  );

  requireAdminRpcMatchingId(result, quoteId, "Preorder final payment release");
}

interface RegisterAdminPreorderManualPaymentInput {
  quoteId: string;
  paymentType: "deposit" | "final" | "full";
  amount: number;
}

export async function registerAdminPreorderManualPayment(
  input: RegisterAdminPreorderManualPaymentInput,
): Promise<void> {
  const result = await callAdminRpc<unknown>(
    "admin_register_preorder_manual_payment",
    {
      p_quote_id: input.quoteId,
      p_payment_type: input.paymentType,
      p_amount: input.amount,
    },
  );

  requireAdminRpcUuid(result, "Preorder manual payment registration");
}

export async function rejectAdminPreorderVoucher(input: {
  quoteId: string;
  rejectionReason: string;
}): Promise<void> {
  const reason = input.rejectionReason.trim();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      input.quoteId,
    )
  ) {
    throw new Error("Orçamento inválido.");
  }
  if (!reason || reason.length > 500) {
    throw new Error("Informe um motivo de rejeição de até 500 caracteres.");
  }

  const result = await callAdminRpc<unknown>(
    "admin_reject_preorder_payment_voucher",
    {
      p_quote_id: input.quoteId.toLowerCase(),
      p_rejection_reason: reason,
    },
  );
  requireAdminRpcMatchingId(result, input.quoteId, "Quote voucher rejection");
}
