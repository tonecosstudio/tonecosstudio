import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchAdminPreordersStats,
  registerAdminPreorderManualPayment,
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

describe("admin-preorders-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ eq: mocks.eq });
  });

  it("contabiliza como receita apenas valores compatíveis com estados pagos", async () => {
    mocks.eq.mockResolvedValue({
      data: [
        {
          payment_status: "pending",
          deposit_amount: 20,
          remaining_amount: 80,
          total_amount: 100,
          ready_for_final_payment: false,
        },
        {
          payment_status: "deposit_paid",
          deposit_amount: 50,
          remaining_amount: 150,
          total_amount: 200,
          ready_for_final_payment: false,
        },
        {
          payment_status: "fully_paid",
          deposit_amount: 60,
          remaining_amount: 240,
          total_amount: 300,
          ready_for_final_payment: false,
        },
      ],
      error: null,
    });

    await expect(fetchAdminPreordersStats()).resolves.toEqual({
      total: 3,
      pending_deposit: 1,
      in_production: 1,
      ready_for_payment: 0,
      completed: 1,
      total_deposits: 110,
      total_remaining: 150,
      total_revenue: 350,
    });
  });

  it("não transforma falha do banco em métricas zeradas", async () => {
    mocks.eq.mockResolvedValue({
      data: null,
      error: { message: "database unavailable" },
    });

    await expect(fetchAdminPreordersStats()).rejects.toThrow(
      "Falha ao carregar métricas de pré-vendas: database unavailable",
    );
  });

  it("confirma liberação do saldo final somente quando o RPC devolve o quote correto", async () => {
    mocks.callAdminRpc.mockResolvedValueOnce(QUOTE_ID);

    await expect(releaseAdminPreorderFinalPayment(QUOTE_ID)).resolves.toBeUndefined();
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
});
