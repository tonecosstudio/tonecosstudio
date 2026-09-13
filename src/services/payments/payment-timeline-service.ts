import { callAuthenticatedEdgeFunctionData } from "@/services/supabase/edge-function-client";
import type { PaymentTimelineEvent } from "@/types/manual-payment";
import { parsePaymentTimelineResponse } from "./payment-timeline-response";

export async function loadPaymentTimeline(paymentId: string): Promise<PaymentTimelineEvent[]> {
  const data = await callAuthenticatedEdgeFunctionData<unknown, { paymentId: string }>(
    "get-manual-payment-timeline",
    { paymentId },
    "Failed to load payment timeline",
  );

  return parsePaymentTimelineResponse(data, paymentId);
}
