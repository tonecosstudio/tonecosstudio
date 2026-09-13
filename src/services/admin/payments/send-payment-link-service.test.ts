import { beforeEach, describe, expect, it, vi } from "vitest";
import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import { sendPaymentLink } from "./send-payment-link-service";

vi.mock("@/services/admin/rpc/admin-rpc-gateway", () => ({
  callAdminRpc: vi.fn(),
}));

const callRpc = vi.mocked(callAdminRpc);
const QUOTE_ID = "11111111-1111-4111-8111-111111111111";
const PAYMENT_LINK_ID = "22222222-2222-4222-8222-222222222222";

const input = {
  quoteId: QUOTE_ID,
  amount: 500,
  paymentType: "deposit" as const,
  paymentLink: "https://payments.example.test/pay/123",
  pixKey: "financeiro@example.test",
  instructions: "Pagamento da entrada",
};

describe("send-payment-link-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("confirma criação apenas quando o RPC devolve UUID válido", async () => {
    callRpc.mockResolvedValueOnce(PAYMENT_LINK_ID);

    await expect(sendPaymentLink(input)).resolves.toBeUndefined();
    expect(callRpc).toHaveBeenCalledWith("admin_send_payment_link", {
      p_quote_id: QUOTE_ID,
      p_amount: 500,
      p_payment_type: "deposit",
      p_payment_link: input.paymentLink,
      p_pix_key: input.pixKey,
      p_instructions: input.instructions,
    });
  });

  it.each([null, undefined, "", "invalid-id", {}])(
    "falha fechado para retorno inválido do RPC: %j",
    async (result) => {
      callRpc.mockResolvedValueOnce(result as never);

      await expect(sendPaymentLink(input)).rejects.toThrow(
        "Payment link creation returned an invalid resource id",
      );
    },
  );
});
