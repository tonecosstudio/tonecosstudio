import { supabase } from "@/integrations/supabase/client";

export interface AdminOrderMetrics {
  byType: {
    subscriptionDeliveries: number;
    standalonePurchases: number;
    manualPayments: number;
    quotes: number;
  };
  byStatus: {
    pending: number;
    confirmed: number;
    inProduction: number;
    shipped: number;
    delivered: number;
    completed: number;
  };
  total: number;
  revenue: number;
  averageTicket: number;
  standaloneSales: number;
  quotes: {
    total: number;
    uniqueUsers: number;
    pending: number;
    approved: number;
    completed: number;
    totalRevenue: number;
    averageTicket: number;
    conversionRate: number;
  };
  preorders: {
    total: number;
    pending_deposit: number;
    in_production: number;
    completed: number;
    total_deposits: number;
    total_remaining: number;
  };
}

interface QuoteMetricRow {
  user_id: string | null;
  status: string | null;
  total_amount: number | null;
  is_preorder: boolean | null;
  payment_status: string | null;
  deposit_amount: number | null;
  remaining_amount: number | null;
}

interface StandalonePurchaseMetricRow {
  status: string | null;
  amount: number | null;
}

interface ManualPaymentMetricRow {
  status: string | null;
  amount: number | null;
}

interface SubscriptionDeliveryMetricRow {
  status: string | null;
}

interface OrderMetricsDateRange {
  fromDate?: string | null;
  toDate?: string | null;
}

function applyDateRange<TQuery extends {
  gte: (column: string, value: string) => TQuery;
  lte: (column: string, value: string) => TQuery;
}>(query: TQuery, range: OrderMetricsDateRange): TQuery {
  let scopedQuery = query;

  if (range.fromDate) {
    scopedQuery = scopedQuery.gte("created_at", range.fromDate);
  }

  if (range.toDate) {
    scopedQuery = scopedQuery.lte("created_at", range.toDate);
  }

  return scopedQuery;
}

function incrementStatusBucket(
  buckets: AdminOrderMetrics["byStatus"],
  bucket: keyof AdminOrderMetrics["byStatus"],
): void {
  buckets[bucket] += 1;
}

function mapQuoteStatusToBucket(
  status: string | null,
  buckets: AdminOrderMetrics["byStatus"],
  quoteCounters: Pick<AdminOrderMetrics["quotes"], "pending" | "approved" | "completed">,
): void {
  switch (status) {
    case "pending":
    case "reviewing":
      incrementStatusBucket(buckets, "pending");
      quoteCounters.pending += 1;
      break;
    case "answered":
      incrementStatusBucket(buckets, "confirmed");
      quoteCounters.approved += 1;
      break;
    case "archived":
      incrementStatusBucket(buckets, "completed");
      quoteCounters.completed += 1;
      break;
    default:
      break;
  }
}

function mapStandaloneStatusToBucket(
  status: string | null,
  buckets: AdminOrderMetrics["byStatus"],
): void {
  switch (status) {
    case "awaiting_deposit":
    case "awaiting_balance":
      incrementStatusBucket(buckets, "pending");
      break;
    case "deposit_paid":
    case "balance_paid":
      incrementStatusBucket(buckets, "confirmed");
      break;
    case "in_production":
      incrementStatusBucket(buckets, "inProduction");
      break;
    case "shipped":
      incrementStatusBucket(buckets, "shipped");
      break;
    case "delivered":
      incrementStatusBucket(buckets, "delivered");
      break;
    case "completed":
      incrementStatusBucket(buckets, "completed");
      break;
    default:
      break;
  }
}

function mapManualPaymentStatusToBucket(
  status: string | null,
  buckets: AdminOrderMetrics["byStatus"],
): void {
  switch (status) {
    case "pending":
    case "under_review":
    case "requires_info":
      incrementStatusBucket(buckets, "pending");
      break;
    case "approved":
      incrementStatusBucket(buckets, "confirmed");
      break;
    default:
      break;
  }
}

function mapDeliveryStatusToBucket(
  status: string | null,
  buckets: AdminOrderMetrics["byStatus"],
): void {
  switch (status) {
    case "scheduled":
    case "pending_choice":
      incrementStatusBucket(buckets, "pending");
      break;
    case "confirmed":
      incrementStatusBucket(buckets, "confirmed");
      break;
    case "in_production":
      incrementStatusBucket(buckets, "inProduction");
      break;
    case "shipped":
      incrementStatusBucket(buckets, "shipped");
      break;
    case "delivered":
    case "revealed":
      incrementStatusBucket(buckets, "delivered");
      break;
    default:
      break;
  }
}

export async function fetchAdminOrderMetrics(
  range: OrderMetricsDateRange = {},
): Promise<AdminOrderMetrics> {
  const [quotesRes, standaloneRes, manualRes, deliveriesRes] = await Promise.all([
    applyDateRange(
      supabase
        .from("quotes")
        .select("user_id, status, total_amount, is_preorder, payment_status, deposit_amount, remaining_amount"),
      range,
    ),
    applyDateRange(supabase.from("standalone_purchases").select("status, amount"), range),
    applyDateRange(supabase.from("manual_payments").select("status, amount"), range),
    applyDateRange(supabase.from("subscription_deliveries").select("status"), range),
  ]);

  if (quotesRes.error) throw quotesRes.error;
  if (standaloneRes.error) throw standaloneRes.error;
  if (manualRes.error) throw manualRes.error;
  if (deliveriesRes.error) throw deliveriesRes.error;

  const quotes = (quotesRes.data ?? []) as QuoteMetricRow[];
  const standalonePurchases = (standaloneRes.data ?? []) as StandalonePurchaseMetricRow[];
  const manualPayments = (manualRes.data ?? []) as ManualPaymentMetricRow[];
  const subscriptionDeliveries = (deliveriesRes.data ?? []) as SubscriptionDeliveryMetricRow[];

  const byStatus: AdminOrderMetrics["byStatus"] = {
    pending: 0,
    confirmed: 0,
    inProduction: 0,
    shipped: 0,
    delivered: 0,
    completed: 0,
  };

  const quoteCounters = {
    pending: 0,
    approved: 0,
    completed: 0,
  };

  for (const quote of quotes) {
    mapQuoteStatusToBucket(quote.status, byStatus, quoteCounters);
  }

  for (const purchase of standalonePurchases) {
    mapStandaloneStatusToBucket(purchase.status, byStatus);
  }

  for (const payment of manualPayments) {
    mapManualPaymentStatusToBucket(payment.status, byStatus);
  }

  for (const delivery of subscriptionDeliveries) {
    mapDeliveryStatusToBucket(delivery.status, byStatus);
  }

  const quotesRevenue = quotes.reduce((acc, quote) => acc + (quote.total_amount ?? 0), 0);
  const standaloneRevenue = standalonePurchases.reduce((acc, purchase) => acc + (purchase.amount ?? 0), 0);
  const manualRevenue = manualPayments.reduce((acc, payment) => acc + (payment.amount ?? 0), 0);
  const totalRevenue = quotesRevenue + standaloneRevenue + manualRevenue;

  const totalOrders =
    quotes.length + standalonePurchases.length + manualPayments.length + subscriptionDeliveries.length;

  const ordersWithValue = quotes.length + standalonePurchases.length + manualPayments.length;
  const preorders = quotes.filter((quote) => quote.is_preorder);
  const uniqueQuoteUsers = new Set(quotes.map((quote) => quote.user_id).filter(Boolean)).size;

  return {
    byType: {
      subscriptionDeliveries: subscriptionDeliveries.length,
      standalonePurchases: standalonePurchases.length,
      manualPayments: manualPayments.length,
      quotes: quotes.length,
    },
    byStatus,
    total: totalOrders,
    revenue: totalRevenue,
    averageTicket: ordersWithValue > 0 ? totalRevenue / ordersWithValue : 0,
    standaloneSales: standalonePurchases.length,
    quotes: {
      total: quotes.length,
      uniqueUsers: uniqueQuoteUsers,
      pending: quoteCounters.pending,
      approved: quoteCounters.approved,
      completed: quoteCounters.completed,
      totalRevenue: quotesRevenue,
      averageTicket: quotes.length > 0 ? quotesRevenue / quotes.length : 0,
      conversionRate: quotes.length > 0 ? (quoteCounters.approved / quotes.length) * 100 : 0,
    },
    preorders: {
      total: preorders.length,
      pending_deposit: preorders.filter((quote) => quote.payment_status === "pending").length,
      in_production: preorders.filter((quote) => quote.payment_status === "deposit_paid").length,
      completed: preorders.filter((quote) => quote.payment_status === "fully_paid").length,
      total_deposits: preorders.reduce((acc, quote) => acc + (quote.deposit_amount ?? 0), 0),
      total_remaining: preorders.reduce((acc, quote) => acc + (quote.remaining_amount ?? 0), 0),
    },
  };
}
