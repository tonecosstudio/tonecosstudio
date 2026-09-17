import { supabase } from "@/integrations/supabase/client";
import {
  ALL_ORDER_STATUS_OPTIONS,
  MANUAL_PAYMENT_STATUS_OPTIONS,
  QUOTE_STATUS_OPTIONS,
  STANDALONE_PURCHASE_STATUS_OPTIONS,
  SUBSCRIPTION_DELIVERY_STATUS_OPTIONS,
  isOrderStatus,
} from "@/config/admin-order-status";
import log from "@/lib/logger";
import { requireAuthenticatedUserId } from "@/services/auth/current-user";
import {
  approveManualPaymentWithNotification,
  rejectManualPaymentWithNotification,
  requestManualPaymentInfoRpc,
} from "@/services/admin/orders/admin-order-status-service";
import type {
  ManualPaymentStatus,
  OrderFilters,
  OrderStatus,
  PaginatedResponse,
  PaginationParams,
  QuoteStatus,
  StandalonePurchaseStatus,
  StatusHistoryEntry,
  SubscriptionDeliveryStatus,
  UnifiedOrder,
} from "@/types/admin/orders";

interface ProfileSummary {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface CollectionSummary {
  id: string;
  name: string;
  slug: string | null;
}

export type OrderStatusHistoryEntry = Omit<StatusHistoryEntry, "oldStatus"> & {
  oldStatus: OrderStatus | null;
};

const SUBSCRIPTION_STATUS_SET = new Set<SubscriptionDeliveryStatus>(
  SUBSCRIPTION_DELIVERY_STATUS_OPTIONS.map((option) => option.value),
);
const STANDALONE_STATUS_SET = new Set<StandalonePurchaseStatus>(
  STANDALONE_PURCHASE_STATUS_OPTIONS.map((option) => option.value),
);
const MANUAL_PAYMENT_STATUS_SET = new Set<ManualPaymentStatus>(
  MANUAL_PAYMENT_STATUS_OPTIONS.map((option) => option.value),
);
const QUOTE_STATUS_SET = new Set<QuoteStatus>(
  QUOTE_STATUS_OPTIONS.map((option) => option.value),
);

function requireOrderStatus(value: unknown, context: string): OrderStatus {
  if (isOrderStatus(value)) return value;
  throw new Error(`Status de pedido inválido em ${context}: ${String(value)}`);
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [
    ...new Set(
      values.filter(
        (value): value is string => typeof value === "string" && value.length > 0,
      ),
    ),
  ];
}

function filterSubscriptionStatuses(
  statuses: OrderStatus[],
): SubscriptionDeliveryStatus[] {
  return statuses.filter(
    (status): status is SubscriptionDeliveryStatus =>
      SUBSCRIPTION_STATUS_SET.has(status as SubscriptionDeliveryStatus),
  );
}

function filterStandaloneStatuses(
  statuses: OrderStatus[],
): StandalonePurchaseStatus[] {
  return statuses.filter(
    (status): status is StandalonePurchaseStatus =>
      STANDALONE_STATUS_SET.has(status as StandalonePurchaseStatus),
  );
}

function filterManualPaymentStatuses(
  statuses: OrderStatus[],
): ManualPaymentStatus[] {
  return statuses.filter(
    (status): status is ManualPaymentStatus =>
      MANUAL_PAYMENT_STATUS_SET.has(status as ManualPaymentStatus),
  );
}

function filterQuoteStatuses(statuses: OrderStatus[]): QuoteStatus[] {
  return statuses.filter(
    (status): status is QuoteStatus => QUOTE_STATUS_SET.has(status as QuoteStatus),
  );
}

async function fetchProfilesMap(
  userIds: string[],
): Promise<Map<string, ProfileSummary>> {
  const map = new Map<string, ProfileSummary>();
  if (userIds.length === 0) return map;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds);

  if (error) throw new Error(`Erro ao buscar clientes: ${error.message}`);

  for (const profile of data ?? []) {
    map.set(profile.id, profile);
  }
  return map;
}

async function fetchCollectionsMap(
  collectionIds: string[],
): Promise<Map<string, CollectionSummary>> {
  const map = new Map<string, CollectionSummary>();
  if (collectionIds.length === 0) return map;

  const { data, error } = await supabase
    .from("collections")
    .select("id, name, slug")
    .in("id", collectionIds);

  if (error) throw new Error(`Erro ao buscar coleções: ${error.message}`);

  for (const collection of data ?? []) {
    map.set(collection.id, collection);
  }
  return map;
}

async function fetchSubscriptionOrders(
  filters: OrderFilters,
  options: { userId?: string; orderId?: string } = {},
): Promise<UnifiedOrder[]> {
  const statuses = filterSubscriptionStatuses(filters.status);
  if (filters.status.length > 0 && statuses.length === 0) return [];

  let query = supabase.from("subscription_deliveries").select(`
    id,
    status,
    delivery_number,
    delivery_order,
    tracking_code,
    expected_delivery_date,
    actual_delivery_date,
    delivered_date,
    reveal_date,
    created_at,
    updated_at,
    subscription_id,
    character_id,
    cycle_id,
    collection_id,
    subscriptions!inner (
      id,
      user_id,
      collection_id,
      plan_type,
      deliveries_completed,
      deliveries_total,
      status
    ),
    collection_characters (
      id,
      name,
      image_url
    )
  `);

  if (statuses.length > 0) query = query.in("status", statuses);
  if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom);
  if (filters.dateTo) query = query.lte("created_at", filters.dateTo);
  if (filters.planType) query = query.eq("subscriptions.plan_type", filters.planType);
  if (options.userId) query = query.eq("subscriptions.user_id", options.userId);
  if (options.orderId) query = query.eq("id", options.orderId);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao buscar entregas: ${error.message}`);

  const rows = data ?? [];
  const userIds = uniqueStrings(rows.map((row) => row.subscriptions?.user_id));
  const collectionIds = uniqueStrings(
    rows.map(
      (row) => row.collection_id ?? row.subscriptions?.collection_id ?? null,
    ),
  );
  const [profiles, collections] = await Promise.all([
    fetchProfilesMap(userIds),
    fetchCollectionsMap(collectionIds),
  ]);

  return rows.flatMap((row): UnifiedOrder[] => {
    const subscription = row.subscriptions;
    if (!subscription) return [];

    const status = requireOrderStatus(row.status, `subscription_deliveries:${row.id}`);
    const profile = profiles.get(subscription.user_id);
    const collectionId = row.collection_id ?? subscription.collection_id ?? null;
    const collection = collectionId ? collections.get(collectionId) : undefined;
    const character = row.collection_characters;

    return [
      {
        id: row.id,
        type: "subscription_delivery",
        status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        customer: {
          id: subscription.user_id,
          name: profile?.full_name || "Nome não disponível",
          email: profile?.email || "Email não disponível",
        },
        collection: collection
          ? {
              id: collection.id,
              name: collection.name,
              slug: collection.slug || "",
            }
          : null,
        amount: 0,
        trackingCode: row.tracking_code,
        expectedDeliveryDate: row.expected_delivery_date,
        actualDeliveryDate: row.actual_delivery_date ?? row.delivered_date,
        subscriptionDelivery: {
          subscriptionId: row.subscription_id,
          deliveryNumber: row.delivery_number ?? row.delivery_order ?? 1,
          cycleId: row.cycle_id,
          characterId: row.character_id,
          revealDate: row.reveal_date,
          subscription: {
            id: subscription.id,
            planType: subscription.plan_type ?? "",
            deliveriesCompleted: subscription.deliveries_completed ?? 0,
            deliveriesTotal: subscription.deliveries_total ?? 0,
            status: subscription.status,
          },
          character: character
            ? {
                id: character.id,
                name: character.name ?? "Personagem sem nome",
                imageUrl: character.image_url,
              }
            : undefined,
        },
      },
    ];
  });
}

async function fetchStandaloneOrders(
  filters: OrderFilters,
  options: { userId?: string; orderId?: string } = {},
): Promise<UnifiedOrder[]> {
  const statuses = filterStandaloneStatuses(filters.status);
  if (filters.status.length > 0 && statuses.length === 0) return [];

  let query = supabase.from("standalone_purchases").select(`
    id,
    status,
    user_id,
    collection_id,
    cycle_id,
    character_id,
    amount,
    paid_amount,
    balance_amount,
    price_deposit,
    price_balance,
    price_full,
    deposit_paid_at,
    balance_paid_at,
    balance_due_date,
    payment_voucher_deposit_url,
    payment_voucher_balance_url,
    tracking_code,
    expected_delivery_date,
    actual_delivery_date,
    created_at,
    updated_at,
    collections (
      id,
      name,
      slug
    ),
    collection_characters (
      id,
      name,
      image_url
    )
  `);

  if (statuses.length > 0) query = query.in("status", statuses);
  if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom);
  if (filters.dateTo) query = query.lte("created_at", filters.dateTo);
  if (options.userId) query = query.eq("user_id", options.userId);
  if (options.orderId) query = query.eq("id", options.orderId);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao buscar compras avulsas: ${error.message}`);

  const rows = data ?? [];
  const profiles = await fetchProfilesMap(uniqueStrings(rows.map((row) => row.user_id)));

  return rows.map((row): UnifiedOrder => {
    const status = requireOrderStatus(row.status, `standalone_purchases:${row.id}`);
    const profile = profiles.get(row.user_id);
    const collection = row.collections;
    const character = row.collection_characters;

    return {
      id: row.id,
      type: "standalone_purchase",
      status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      customer: {
        id: row.user_id,
        name: profile?.full_name || "Nome não disponível",
        email: profile?.email || "Email não disponível",
      },
      collection: collection
        ? {
            id: collection.id,
            name: collection.name,
            slug: collection.slug || "",
          }
        : null,
      amount: row.amount,
      trackingCode: row.tracking_code,
      expectedDeliveryDate: row.expected_delivery_date,
      actualDeliveryDate: row.actual_delivery_date,
      standalonePurchase: {
        cycleId: row.cycle_id,
        characterId: row.character_id,
        priceDeposit: row.price_deposit ?? 0,
        priceBalance: row.price_balance ?? row.balance_amount ?? 0,
        priceFull: row.price_full ?? row.amount,
        depositPaidAt: row.deposit_paid_at,
        balancePaidAt: row.balance_paid_at,
        balanceDueDate: row.balance_due_date,
        depositVoucherUrl: row.payment_voucher_deposit_url,
        balanceVoucherUrl: row.payment_voucher_balance_url,
        character: character
          ? {
              id: character.id,
              name: character.name ?? "Personagem sem nome",
              imageUrl: character.image_url,
            }
          : undefined,
      },
    };
  });
}

async function fetchManualPaymentOrders(
  filters: OrderFilters,
  options: { userId?: string } = {},
): Promise<UnifiedOrder[]> {
  const statuses = filterManualPaymentStatuses(filters.status);
  if (filters.status.length > 0 && statuses.length === 0) return [];

  let query = supabase.from("manual_payments").select(`
    id,
    user_id,
    amount,
    status,
    payment_method,
    reference_id,
    reference_type,
    reference_number,
    notes,
    approved_at,
    approved_by,
    created_at,
    updated_at
  `);

  if (statuses.length > 0) query = query.in("status", statuses);
  if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom);
  if (filters.dateTo) query = query.lte("created_at", filters.dateTo);
  if (options.userId) query = query.eq("user_id", options.userId);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao buscar pagamentos manuais: ${error.message}`);

  const rows = data ?? [];
  const profiles = await fetchProfilesMap(uniqueStrings(rows.map((row) => row.user_id)));

  return rows.map((row): UnifiedOrder => {
    const status = requireOrderStatus(row.status, `manual_payments:${row.id}`);
    const profile = profiles.get(row.user_id);

    return {
      id: row.id,
      type: "manual_payment",
      status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      customer: {
        id: row.user_id,
        name: profile?.full_name || "Nome não disponível",
        email: profile?.email || "Email não disponível",
      },
      collection: null,
      amount: row.amount,
      trackingCode: null,
      expectedDeliveryDate: null,
      actualDeliveryDate: null,
      manualPayment: {
        paymentMethod: row.payment_method,
        paymentDate: null,
        referenceId: row.reference_id,
        referenceType: row.reference_type,
        notes: row.notes,
        confirmedAt: row.approved_at,
        confirmedBy: row.approved_by,
        referenceNumber: row.reference_number,
        approvedAt: row.approved_at,
        approvedBy: row.approved_by,
      },
    };
  });
}

async function fetchQuoteOrders(
  filters: OrderFilters,
  options: { userId?: string } = {},
): Promise<UnifiedOrder[]> {
  const statuses = filterQuoteStatuses(filters.status);
  if (filters.status.length > 0 && statuses.length === 0) return [];

  let query = supabase.from("quotes").select(`
    id,
    user_id,
    status,
    total_amount,
    payment_status,
    notes,
    created_at,
    updated_at
  `);

  if (statuses.length > 0) query = query.in("status", statuses);
  if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom);
  if (filters.dateTo) query = query.lte("created_at", filters.dateTo);
  if (options.userId) query = query.eq("user_id", options.userId);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao buscar orçamentos: ${error.message}`);

  const rows = data ?? [];
  const profiles = await fetchProfilesMap(uniqueStrings(rows.map((row) => row.user_id)));

  return rows.map((row): UnifiedOrder => {
    const status = requireOrderStatus(row.status, `quotes:${row.id}`);
    const profile = profiles.get(row.user_id);

    return {
      id: row.id,
      type: "quote",
      status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      customer: {
        id: row.user_id,
        name: profile?.full_name || "Nome não disponível",
        email: profile?.email || "Email não disponível",
      },
      collection: null,
      amount: row.total_amount,
      trackingCode: null,
      expectedDeliveryDate: null,
      actualDeliveryDate: null,
      quote: {
        items: [],
        totalAmount: row.total_amount,
        notes: row.notes,
        paymentStatus: row.payment_status,
        itemsCount: 0,
        itemsSummary: null,
      },
    };
  });
}

function matchesSearch(order: UnifiedOrder, rawQuery: string): boolean {
  const query = rawQuery.toLocaleLowerCase("pt-BR").trim();
  if (!query) return true;

  return [
    order.id,
    order.customer.name,
    order.customer.email,
    order.collection?.name,
    order.trackingCode,
  ].some((value) => value?.toLocaleLowerCase("pt-BR").includes(query));
}

function sortNewestFirst(orders: UnifiedOrder[]): UnifiedOrder[] {
  return orders.sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export async function fetchUnifiedOrders(
  filters: OrderFilters,
  pagination: PaginationParams,
): Promise<PaginatedResponse<UnifiedOrder>> {
  const requests: Array<Promise<UnifiedOrder[]>> = [];

  if (filters.type === "all" || filters.type === "subscription_delivery") {
    requests.push(fetchSubscriptionOrders(filters));
  }
  if (filters.type === "all" || filters.type === "standalone_purchase") {
    requests.push(fetchStandaloneOrders(filters));
  }
  if (filters.type === "all" || filters.type === "manual_payment") {
    requests.push(fetchManualPaymentOrders(filters));
  }
  if (filters.type === "all" || filters.type === "quote") {
    requests.push(fetchQuoteOrders(filters));
  }

  const groups = await Promise.all(requests);
  const allOrders = sortNewestFirst(groups.flat());
  const filtered = filters.searchQuery
    ? allOrders.filter((order) => matchesSearch(order, filters.searchQuery))
    : allOrders;
  const offset = (pagination.page - 1) * pagination.pageSize;

  return {
    data: filtered.slice(offset, offset + pagination.pageSize),
    total: filtered.length,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages: Math.ceil(filtered.length / pagination.pageSize),
  };
}

export async function countOrdersByStatus(
  type: OrderFilters["type"],
): Promise<Record<OrderStatus, number>> {
  const counts = Object.fromEntries(
    ALL_ORDER_STATUS_OPTIONS.map((option) => [option.value, 0]),
  ) as Record<OrderStatus, number>;

  const sources: Array<Promise<Array<{ status: unknown }>>> = [];

  if (type === "all" || type === "subscription_delivery") {
    sources.push(
      supabase
        .from("subscription_deliveries")
        .select("status")
        .then(({ data, error }) => {
          if (error) throw error;
          return data ?? [];
        }),
    );
  }
  if (type === "all" || type === "standalone_purchase") {
    sources.push(
      supabase
        .from("standalone_purchases")
        .select("status")
        .then(({ data, error }) => {
          if (error) throw error;
          return data ?? [];
        }),
    );
  }
  if (type === "all" || type === "manual_payment") {
    sources.push(
      supabase
        .from("manual_payments")
        .select("status")
        .then(({ data, error }) => {
          if (error) throw error;
          return data ?? [];
        }),
    );
  }
  if (type === "all" || type === "quote") {
    sources.push(
      supabase
        .from("quotes")
        .select("status")
        .then(({ data, error }) => {
          if (error) throw error;
          return data ?? [];
        }),
    );
  }

  for (const rows of await Promise.all(sources)) {
    for (const row of rows) {
      if (isOrderStatus(row.status)) {
        counts[row.status] += 1;
      } else {
        log.warn("Ignoring unsupported order status in admin count", {
          status: row.status,
        });
      }
    }
  }

  return counts;
}

const EMPTY_FILTERS: OrderFilters = {
  type: "all",
  status: [],
  dateFrom: null,
  dateTo: null,
  searchQuery: "",
};

export async function fetchOrderById(
  orderId: string,
  orderType: "subscription_delivery" | "standalone_purchase",
): Promise<UnifiedOrder | null> {
  const orders =
    orderType === "subscription_delivery"
      ? await fetchSubscriptionOrders(
          { ...EMPTY_FILTERS, type: "subscription_delivery" },
          { orderId },
        )
      : await fetchStandaloneOrders(
          { ...EMPTY_FILTERS, type: "standalone_purchase" },
          { orderId },
        );

  return orders[0] ?? null;
}

export async function fetchOrdersByUserId(userId: string): Promise<UnifiedOrder[]> {
  const [deliveries, purchases, payments, quotes] = await Promise.all([
    fetchSubscriptionOrders(
      { ...EMPTY_FILTERS, type: "subscription_delivery" },
      { userId },
    ),
    fetchStandaloneOrders(
      { ...EMPTY_FILTERS, type: "standalone_purchase" },
      { userId },
    ),
    fetchManualPaymentOrders(
      { ...EMPTY_FILTERS, type: "manual_payment" },
      { userId },
    ),
    fetchQuoteOrders({ ...EMPTY_FILTERS, type: "quote" }, { userId }),
  ]);

  return sortNewestFirst([...deliveries, ...purchases, ...payments, ...quotes]);
}

export async function fetchOrderStatusHistory(
  orderId: string,
  orderType: "subscription_delivery" | "standalone_purchase" | "manual_payment",
): Promise<OrderStatusHistoryEntry[]> {
  const { data, error } = await supabase
    .from("order_status_history")
    .select(
      "id, order_id, order_type, old_status, new_status, changed_by, changed_by_name, notes, created_at",
    )
    .eq("order_id", orderId)
    .eq("order_type", orderType)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Erro ao buscar histórico de status: ${error.message}`);

  return (data ?? []).map((entry) => ({
    id: entry.id,
    orderId: entry.order_id,
    orderType,
    oldStatus:
      entry.old_status === null
        ? null
        : requireOrderStatus(entry.old_status, `order_status_history:${entry.id}:old`),
    newStatus: requireOrderStatus(
      entry.new_status,
      `order_status_history:${entry.id}:new`,
    ),
    changedBy: entry.changed_by || "system",
    changedByName: entry.changed_by_name || "Sistema",
    changedAt: entry.created_at,
    notes: entry.notes || undefined,
  }));
}

async function fetchManualPaymentForAction(paymentId: string) {
  const { data, error } = await supabase
    .from("manual_payments")
    .select("id, status")
    .eq("id", paymentId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(`Pagamento não encontrado: ${error?.message || "ID inválido"}`);
  }

  return data;
}

export async function requestManualPaymentInfo(
  paymentId: string,
  message: string,
): Promise<void> {
  const safeMessage = message.trim();
  if (!safeMessage) throw new Error("A mensagem é obrigatória");
  if (safeMessage.length > 2000) throw new Error("A mensagem é muito longa");

  await fetchManualPaymentForAction(paymentId);
  await requireAuthenticatedUserId();
  await requestManualPaymentInfoRpc(paymentId, safeMessage);
}

export async function approveManualPayment(paymentId: string): Promise<void> {
  const payment = await fetchManualPaymentForAction(paymentId);

  if (payment.status === "approved") {
    throw new Error("Este pagamento já foi aprovado");
  }
  if (payment.status === "rejected") {
    throw new Error("Este pagamento foi rejeitado e não pode ser aprovado");
  }

  await requireAuthenticatedUserId();
  await approveManualPaymentWithNotification(paymentId);
}

export async function rejectManualPayment(
  paymentId: string,
  reason: string,
): Promise<void> {
  const safeReason = reason.trim();
  if (!safeReason) throw new Error("O motivo da rejeição é obrigatório");
  if (safeReason.length > 1000) throw new Error("O motivo da rejeição é muito longo");

  const payment = await fetchManualPaymentForAction(paymentId);
  if (payment.status === "approved") {
    throw new Error("Este pagamento já foi aprovado e não pode ser rejeitado");
  }
  if (payment.status === "rejected") {
    throw new Error("Este pagamento já foi rejeitado");
  }

  await requireAuthenticatedUserId();
  await rejectManualPaymentWithNotification(paymentId, safeReason);
}
