import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchAdminPreordersStats,
  registerAdminPreorderManualPayment,
  rejectAdminPreorderVoucher,
  releaseAdminPreorderFinalPayment,
} from "./admin-preorders-service";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  callAdminRpc: vi.fn(),
}));

vi.mock("@/services/admin/payments/admin-payments-gateway", () => ({
  adminPaymentsGateway: {
    from: mocks.from,
  },
}));

vi.mock("@/services/admin/rpc/admin-rpc-gateway", () => ({
  callAdminRpc: mocks.callAdminRpc,
}));

const QUOTE_ID = "11111111-1111-4111-8111-111111111111";
const PAYMENT_ID = "22222222-2222-4222-8222-222222222222";

function setStatsQueries(
  quoteResponse: { data: unknown; error: unknown },
  paymentResponse: { data: unknown; error: unknown } = {
    data: [],
    error: null,
  },
) {
  const quotes = { select: vi.fn(), or: vi.fn() };
  quotes.select.mockReturnValue(quotes);
  quotes.or.mockResolvedValue(quoteResponse);
  const payments = { select: vi.fn(), eq: vi.fn(), in: vi.fn() };
  payments.select.mockReturnValue(payments);
  payments.eq.mockReturnValue(payments);
  payments.in.mockResolvedValue(paymentResponse);
  mocks.from.mockImplementation((table: string) =>
    table === "quotes" ? quotes : payments,
  );
  return { quotes, payments };
}

describe("admin-preorders-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("contabiliza como receita apenas valores compatíveis com estados pagos", async () => {
    setStatsQueries(
      {
        data: [
          {
            id: QUOTE_ID,
            is_preorder: true,
            status: "answered",
            payment_status: "pending",
            deposit_amount: 20,
            remaining_amount: 80,
            total_amount: 100,
            ready_for_final_payment: false,
          },
          {
            id: "33333333-3333-4333-8333-333333333333",
            is_preorder: true,
            status: "answered",
            payment_status: "under_review",
            deposit_amount: 50,
            remaining_amount: 150,
            total_amount: 200,
            ready_for_final_payment: false,
          },
          {
            id: "44444444-4444-4444-8444-444444444444",
            is_preorder: true,
            status: "answered",
            payment_status: "deposit_paid",
            deposit_amount: 50,
            remaining_amount: 150,
            total_amount: 200,
            ready_for_final_payment: false,
          },
          {
            id: "55555555-5555-4555-8555-555555555555",
            is_preorder: true,
            status: "answered",
            payment_status: "fully_paid",
            payment_voucher_type: null,
            deposit_amount: 60,
            remaining_amount: 240,
            total_amount: 300,
            ready_for_final_payment: false,
          },
          {
            id: "66666666-6666-4666-8666-666666666666",
            is_preorder: true,
            status: "answered",
            payment_status: "under_review",
            payment_voucher_type: "final",
            deposit_amount: 50,
            remaining_amount: 150,
            total_amount: 200,
            ready_for_final_payment: true,
          },
          {
            id: "77777777-7777-4777-8777-777777777777",
            is_preorder: false,
            status: "answered",
            payment_status: "pending",
            deposit_amount: null,
            remaining_amount: 100,
            total_amount: 150,
            ready_for_final_payment: false,
          },
          {
            id: "88888888-8888-4888-8888-888888888888",
            is_preorder: false,
            status: "answered",
            payment_status: "fully_paid",
            deposit_amount: null,
            remaining_amount: null,
            total_amount: 100,
            ready_for_final_payment: false,
          },
        ],
        error: null,
      },
      {
        data: [
          {
            quote_id: "44444444-4444-4444-8444-444444444444",
            payment_type: "deposit",
            amount: 50,
          },
          {
            quote_id: "55555555-5555-4555-8555-555555555555",
            payment_type: "deposit",
            amount: 60,
          },
          {
            quote_id: "55555555-5555-4555-8555-555555555555",
            payment_type: "final",
            amount: 240,
          },
          {
            quote_id: "66666666-6666-4666-8666-666666666666",
            payment_type: "deposit",
            amount: 50,
          },
          {
            quote_id: "77777777-7777-4777-8777-777777777777",
            payment_type: "coins",
            amount: 50,
          },
          {
            quote_id: "88888888-8888-4888-8888-888888888888",
            payment_type: "full",
            amount: 100,
          },
        ],
        error: null,
      },
    );

    await expect(fetchAdminPreordersStats()).resolves.toEqual({
      total: 7,
      pending_deposit: 2,
      pending_review: 2,
      in_production: 1,
      ready_for_payment: 0,
      completed: 2,
      total_deposits: 160,
      total_remaining: 700,
      total_coins_applied: 50,
      total_revenue: 500,
    });
  });

  it("não transforma falha do banco em métricas zeradas", async () => {
    setStatsQueries({
      data: null,
      error: { message: "database unavailable" },
    });

    await expect(fetchAdminPreordersStats()).rejects.toThrow(
      "Falha ao carregar métricas de pré-vendas: database unavailable",
    );
  });

  it("confirma liberação do saldo final somente quando o RPC devolve o quote correto", async () => {
    mocks.callAdminRpc.mockResolvedValueOnce(QUOTE_ID);

    await expect(
      releaseAdminPreorderFinalPayment(QUOTE_ID),
    ).resolves.toBeUndefined();
  });

  it("falha fechado se a liberação do saldo final não devolver o quote solicitado", async () => {
    mocks.callAdminRpc.mockResolvedValueOnce(PAYMENT_ID);

    await expect(releaseAdminPreorderFinalPayment(QUOTE_ID)).rejects.toThrow(
      "Preorder final payment release returned an unexpected resource id",
    );
  });

  it("aceita registro de pagamento manual somente com UUID de pagamento válido", async () => {
    mocks.callAdminRpc.mockResolvedValueOnce(PAYMENT_ID);

    await expect(
      registerAdminPreorderManualPayment({
        quoteId: QUOTE_ID,
        paymentType: "deposit",
        amount: 100,
      }),
    ).resolves.toBeUndefined();
  });

  it("falha fechado se o registro de pagamento manual retornar payload inválido", async () => {
    mocks.callAdminRpc.mockResolvedValueOnce(null);

    await expect(
      registerAdminPreorderManualPayment({
        quoteId: QUOTE_ID,
        paymentType: "final",
        amount: 400,
      }),
    ).rejects.toThrow(
      "Preorder manual payment registration returned an invalid resource id",
    );
  });

  it("recusa comprovantes apenas com motivo e confirmação do RPC administrativo", async () => {
    mocks.callAdminRpc.mockResolvedValueOnce(QUOTE_ID);
    await expect(
      rejectAdminPreorderVoucher({
        quoteId: QUOTE_ID,
        rejectionReason: "Comprovante ilegível",
      }),
    ).resolves.toBeUndefined();
    expect(mocks.callAdminRpc).toHaveBeenCalledExactlyOnceWith(
      "admin_reject_preorder_payment_voucher",
      { p_quote_id: QUOTE_ID, p_rejection_reason: "Comprovante ilegível" },
    );
  });
});
