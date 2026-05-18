import { adminPaymentsGateway } from "@/services/admin/admin-payments-gateway";

interface SendPaymentLinkInput {
  quoteId: string;
  amount: number;
  paymentType: "voucher" | "deposit" | "final" | "full";
  paymentLink: string;
  pixKey: string;
  instructions: string;
}

export async function sendPaymentLink(input: SendPaymentLinkInput) {
  const { data: userData } = await adminPaymentsGateway.auth.getUser();
  if (!userData.user) throw new Error("NÃ£o autenticado");

  const { error: linkError } = await adminPaymentsGateway.from("payment_links").insert({
    quote_id: input.quoteId,
    payment_type: input.paymentType,
    amount: input.amount,
    payment_link: input.paymentLink || null,
    pix_key: input.pixKey || null,
    instructions: input.instructions,
    sent_by: userData.user.id,
  });
  if (linkError) throw linkError;

  const { error: quoteError } = await adminPaymentsGateway
    .from("quotes")
    .update({
      payment_link: input.paymentLink || null,
      pix_key: input.pixKey || null,
      payment_instructions: input.instructions,
      payment_link_sent_at: new Date().toISOString(),
    })
    .eq("id", input.quoteId);
  if (quoteError) throw quoteError;
}
