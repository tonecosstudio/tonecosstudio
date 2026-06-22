import { callAdminRpc } from "@/services/admin/admin-rpc-gateway";

interface SendPaymentLinkInput {
  quoteId: string;
  amount: number;
  paymentType: "voucher" | "deposit" | "final" | "full";
  paymentLink: string;
  pixKey: string;
  instructions: string;
}

export async function sendPaymentLink(input: SendPaymentLinkInput) {
  await callAdminRpc("admin_send_payment_link", {
    p_quote_id: input.quoteId,
    p_amount: input.amount,
    p_payment_type: input.paymentType,
    p_payment_link: input.paymentLink || null,
    p_pix_key: input.pixKey || null,
    p_instructions: input.instructions,
  });
}
