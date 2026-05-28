import { adminPaymentsGateway } from "@/services/admin/admin-payments-gateway";

interface SendPaymentLinkInput {
  quoteId: string;
  amount: number;
  paymentType: "voucher" | "deposit" | "final" | "full";
  paymentLink: string;
  pixKey: string;
  instructions: string;
}

interface AdminPaymentFlowRpcError {
  message: string;
}

interface AdminPaymentFlowRpcClient {
  rpc(
    name: "admin_send_payment_link",
    args: {
      p_quote_id: string;
      p_amount: number;
      p_payment_type: SendPaymentLinkInput["paymentType"];
      p_payment_link: string | null;
      p_pix_key: string | null;
      p_instructions: string;
    }
  ): Promise<{ data: string | null; error: AdminPaymentFlowRpcError | null }>;
}

const adminPaymentFlowRpc = adminPaymentsGateway as unknown as AdminPaymentFlowRpcClient;

export async function sendPaymentLink(input: SendPaymentLinkInput) {
  const { error } = await adminPaymentFlowRpc.rpc("admin_send_payment_link", {
    p_quote_id: input.quoteId,
    p_amount: input.amount,
    p_payment_type: input.paymentType,
    p_payment_link: input.paymentLink || null,
    p_pix_key: input.pixKey || null,
    p_instructions: input.instructions,
  });
  if (error) throw error;
}
