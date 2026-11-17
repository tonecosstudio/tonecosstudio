import { supabase } from "@/integrations/supabase/client";

type SubscriptionUserRow = {
  user_id: string | null;
};

type PaymentUserRow = {
  user_id: string | null;
  created_at: string | null;
};

type QuotePaymentUserRow = PaymentUserRow & {
  status: string | null;
};

type QuoteUserRow = {
  user_id: string | null;
};

export interface CustomerRelationshipSummary {
  subscriberIds: Set<string>;
  buyerIds: Set<string>;
  quotedIds: Set<string>;
  lastApprovedPaymentAtByUserId: Map<string, string>;
}

function isUnavailableLegacyTable(
  error: { code?: string; message?: string; details?: string },
  table: string,
): boolean {
  const code = error.code;
  const message = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  return (code === "42P01" || code === "PGRST205") && message.includes(table);
}

export async function fetchCustomerRelationshipSummary(): Promise<CustomerRelationshipSummary> {
  const [subscriptionsResult, paymentsResult, quotePaymentsResult, quotesResult] = await Promise.all([
    supabase.from("subscriptions").select("user_id").eq("status", "active"),
    supabase
      .from("manual_payments")
      .select("user_id, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
    supabase
      .from("quote_payments")
      .select("user_id, created_at, status")
      .eq("status", "completed")
      .order("created_at", { ascending: false }),
    supabase.from("quotes").select("user_id"),
  ]);

  if (
    subscriptionsResult.error &&
    !isUnavailableLegacyTable(subscriptionsResult.error, "subscriptions")
  ) {
    throw subscriptionsResult.error;
  }

  if (
    paymentsResult.error &&
    !isUnavailableLegacyTable(paymentsResult.error, "manual_payments")
  ) {
    throw paymentsResult.error;
  }

  if (
    quotePaymentsResult.error &&
    !isUnavailableLegacyTable(quotePaymentsResult.error, "quote_payments")
  ) {
    throw quotePaymentsResult.error;
  }

  if (quotesResult.error) {
    throw quotesResult.error;
  }

  const subscriberIds = new Set(
    ((subscriptionsResult.data ?? []) as SubscriptionUserRow[])
      .map((row) => row.user_id)
      .filter((userId): userId is string => Boolean(userId))
  );

  const buyerIds = new Set<string>();
  const lastApprovedPaymentAtByUserId = new Map<string, string>();

  const approvedPayments = [
    ...((paymentsResult.data ?? []) as PaymentUserRow[]),
    ...((quotePaymentsResult.data ?? []) as QuotePaymentUserRow[]),
  ].sort((left, right) =>
    (right.created_at ?? "").localeCompare(left.created_at ?? "")
  );

  for (const payment of approvedPayments) {
    if (!payment.user_id) {
      continue;
    }

    buyerIds.add(payment.user_id);

    if (payment.created_at && !lastApprovedPaymentAtByUserId.has(payment.user_id)) {
      lastApprovedPaymentAtByUserId.set(payment.user_id, payment.created_at);
    }
  }

  const quotedIds = new Set(
    ((quotesResult.data ?? []) as QuoteUserRow[])
      .map((row) => row.user_id)
      .filter((userId): userId is string => Boolean(userId))
  );

  return {
    subscriberIds,
    buyerIds,
    quotedIds,
    lastApprovedPaymentAtByUserId,
  };
}
