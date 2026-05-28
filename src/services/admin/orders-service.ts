/**
 * Serviço de Pedidos Unificados
 *
 * Este serviço consolida a busca e manipulação de entregas de assinatura
 * e compras avulsas em uma única interface unificada.
 *
 * IMPORTANTE: Tipagem completa habilitada para garantir segurança de tipos.
 * Todas as funções têm tipos de retorno explícitos e parâmetros tipados.
 */

import { supabase } from "@/integrations/supabase/client";
import { ALL_ORDER_STATUS_OPTIONS, isOrderStatus } from "@/config/admin-order-status";
import log from "@/lib/logger";
import { transitionStandalonePurchaseStatus } from "@/services/standalone-purchase-service";
import { updateDeliveryStatus } from "./delivery-detail-service";
import {
  approveManualPaymentWithNotification,
  recordOrderStatusHistory,
  rejectManualPaymentWithNotification,
  requestManualPaymentInfoRpc,
  updateManualPaymentStatus,
  updateQuoteStatusRpc,
} from "./admin-order-status-service";
import type {
  UnifiedOrder,
  OrderFilters,
  PaginationParams,
  PaginatedResponse,
  OrderStatus,
  StatusHistoryEntry,
  QuoteItem,
} from "@/types/admin/orders";

interface QueryError {
  message: string;
}

interface QueryResult<T> {
  data: T[] | null;
  count: number | null;
  error: QueryError | null;
}

type RawOrderStatusRow<T extends { id: string; status: OrderStatus }> = Omit<T, "status"> & {
  status: string | null;
};

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

interface CharacterSummary {
  id: string;
  name: string;
  image_url: string | null;
}

interface SubscriptionSummary {
  id: string;
  user_id: string;
  collection_id?: string | null;
  plan_type: string;
  deliveries_completed: number;
  deliveries_total: number;
  status: string;
}

interface DeliveryRow {
  id: string;
  status: OrderStatus;
  created_at: string | null;
  updated_at: string | null;
  tracking_code: string | null;
  actual_delivery_date: string | null;
  delivered_date: string | null;
  subscription_id: string;
  delivery_number: number | null;
  delivery_order: number | null;
  cycle_id: string | null;
  character_id: string | null;
  reveal_date: string | null;
  subscriptions: SubscriptionSummary | null;
  collection_characters?: CharacterSummary | null;
}

interface PurchaseRow {
  id: string;
  status: OrderStatus;
  created_at: string | null;
  updated_at: string | null;
  user_id: string;
  character_id: string | null;
  amount?: number | null;
  balance_amount?: number | null;
  paid_amount?: number | null;
  tracking_code: string | null;
  profiles?: ProfileSummary | null;
  collections?: CollectionSummary | null;
  collection_characters?: CharacterSummary | null;
}

interface ManualPaymentRow {
  id: string;
  status: OrderStatus;
  created_at: string | null;
  user_id: string;
  amount: number | null;
  payment_method: string | null;
  payment_date: string | null;
  reference_id: string | null;
  reference_type: string | null;
  notes: string | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
  profiles?: ProfileSummary | null;
}

interface SubscriptionPlanSummary {
  id: string;
  name: string;
  plan_type: string;
  price_full?: number | null;
  price_pix: number | null;
}

interface ManualPaymentSubscriptionRow {
  id: string;
  status: string;
  plan_type: string;
  created_at: string | null;
  updated_at: string | null;
}

interface EnrichedManualPaymentSubscription {
  id: string;
  status: string;
  start_date: string | null;
  end_date: null;
  subscription_plans: {
    id: string;
    name: string;
    price: number | null;
    billing_cycle: string;
  } | null;
}

interface ManualPaymentQuoteRow {
  id: string;
  status: string;
  total_price: number | null;
  admin_response: string | null;
}

interface ManualPaymentQueryRow extends ManualPaymentRow {
  subscription_id: string | null;
  quote_id: string | null;
  subscriptions?: EnrichedManualPaymentSubscription | null;
  quotes?: ManualPaymentQuoteRow | null;
}

interface QuoteRow {
  id: string;
  status: OrderStatus;
  created_at: string | null;
  updated_at: string | null;
  user_id: string;
  total_amount: number | null;
  notes: string | null;
  profiles?: ProfileSummary | null;
}

type QuoteItemWithQuoteId = QuoteItem & {
  quote_id: string;
};

interface QuoteItemRow {
  id: string;
  quote_id: string;
  character_id: string | null;
  name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  image_url: string | null;
}

interface SubscriptionCollectionRow {
  subscription_id: string;
  collection_id: string;
  collections: CollectionSummary | null;
}

function requireOrderStatus(value: unknown, context: string): OrderStatus {
  if (isOrderStatus(value)) {
    return value;
  }

  throw new Error(`Status de pedido inválido em ${context}: ${String(value)}`);
}

function normalizeOrderStatusRows<T extends { id: string; status: OrderStatus }>(
  rows: Array<RawOrderStatusRow<T>> | null | undefined,
  context: string
): T[] {
  return (rows ?? []).map((row) => ({
    ...row,
    status: requireOrderStatus(row.status, `${context}:${row.id}`),
  }) as T);
}

function normalizeQueryResult<T extends { id: string; status: OrderStatus }>(
  result: QueryResult<RawOrderStatusRow<T>>,
  context: string
): QueryResult<T> {
  return {
    data: normalizeOrderStatusRows(result.data, context),
    count: result.count,
    error: result.error,
  };
}

function incrementStatusCount(
  counts: Record<OrderStatus, number>,
  value: unknown,
  context: string
): void {
  const status = requireOrderStatus(value, context);
  counts[status] += 1;
}

// ============================================================================
// Função Principal: Buscar Pedidos Unificados
// ============================================================================

/**
 * Busca pedidos unificados com filtros e paginação
 *
 * Esta função é o núcleo do sistema de pedidos consolidados. Ela:
 * 1. Busca dados de subscription_deliveries e standalone_purchases
 * 2. Aplica filtros de tipo, status e data
 * 3. Carrega dados relacionados via joins
 * 4. Unifica os resultados em um único array
 * 5. Aplica busca em memória (ou full-text search)
 * 6. Ordena por data de criação (mais recente primeiro)
 * 7. Aplica paginação
 *
 * **Segurança**: O campo `filters.searchQuery` deve ser sanitizado antes de
 * chamar esta função. A sanitização é feita no componente OrderSearchBar
 * usando a função `sanitizeSearchInput()` de `@/lib/sanitizer`, que remove
 * tags HTML/scripts (proteção XSS). SQL Injection é prevenido pelo Supabase
 * RLS e queries parametrizadas.
 *
 * @param filters - Filtros a serem aplicados (searchQuery deve estar sanitizado)
 * @param pagination - Parâmetros de paginação
 * @returns Resposta paginada com pedidos unificados
 */
export async function fetchUnifiedOrders(
  filters: OrderFilters,
  pagination: PaginationParams
): Promise<PaginatedResponse<UnifiedOrder>> {
  const { page, pageSize } = pagination;
  const offset = (page - 1) * pageSize;

  // Buscar entregas de assinatura (se aplicável)
  let deliveriesPromise: Promise<QueryResult<DeliveryRow>> | null = null;
  if (filters.type === "all" || filters.type === "subscription_delivery") {
    deliveriesPromise = fetchSubscriptionDeliveries(filters);
  }

  // Buscar compras avulsas (se aplicável)
  let purchasesPromise: Promise<QueryResult<PurchaseRow>> | null = null;
  if (filters.type === "all" || filters.type === "standalone_purchase") {
    purchasesPromise = fetchStandalonePurchases(filters);
  }

  // Buscar pagamentos manuais (se aplicável)
  let paymentsPromise: Promise<QueryResult<ManualPaymentRow>> | null = null;
  if (filters.type === "all" || filters.type === "manual_payment") {
    paymentsPromise = fetchManualPayments(filters);
  }

  // Buscar orçamentos (se aplicável)
  let quotesPromise: Promise<QueryResult<QuoteRow>> | null = null;
  if (filters.type === "all" || filters.type === "quote") {
    quotesPromise = fetchQuotes(filters);
  }

  // Executar queries em paralelo
  const [deliveriesResult, purchasesResult, paymentsResult, quotesResult] = await Promise.all([
    deliveriesPromise || Promise.resolve({ data: [], count: 0, error: null }),
    purchasesPromise || Promise.resolve({ data: [], count: 0, error: null }),
    paymentsPromise || Promise.resolve({ data: [], count: 0, error: null }),
    quotesPromise || Promise.resolve({ data: [], count: 0, error: null }),
  ]);

  // Verificar erros
  if (deliveriesResult.error) {
    throw new Error(`Erro ao buscar entregas: ${deliveriesResult.error.message}`);
  }
  if (purchasesResult.error) {
    throw new Error(`Erro ao buscar compras: ${purchasesResult.error.message}`);
  }
  if (paymentsResult.error) {
    throw new Error(`Erro ao buscar pagamentos: ${paymentsResult.error.message}`);
  }
  if (quotesResult.error) {
    throw new Error(`Erro ao buscar orçamentos: ${quotesResult.error.message}`);
  }

  // Buscar profiles e collections para entregas de assinatura
  const profileIds = uniqueStrings([
    ...(deliveriesResult.data || []).map((delivery) => delivery.subscriptions?.user_id),
    ...(purchasesResult.data || []).map((purchase) => purchase.user_id),
    ...(paymentsResult.data || []).map((payment) => payment.user_id),
    ...(quotesResult.data || []).map((quote) => quote.user_id),
  ]);
  const collectionIds = uniqueStrings(
    (deliveriesResult.data || []).map((delivery) => delivery.subscriptions?.collection_id)
  );
  const [profilesMap, collectionsMap] = await Promise.all([
    fetchProfilesMap(profileIds),
    fetchCollectionsMap(collectionIds),
  ]);

  // Buscar itens dos orçamentos
  const quoteItemsMap = new Map<string, QuoteItem[]>();
  if (quotesResult.data && quotesResult.data.length > 0) {
    const quoteIds = quotesResult.data.map((q) => q.id);
    const items = await fetchQuoteItems(quoteIds);

    items.forEach((item) => {
      const arr = quoteItemsMap.get(item.quote_id) || [];
      arr.push(item);
      quoteItemsMap.set(item.quote_id, arr);
    });
  }

  // Transformar e unificar dados
  const { transformDeliveries, transformPurchases, transformManualPayments, transformQuotes } =
    await import("./orders-transformer");

  const unifiedOrders: UnifiedOrder[] = [
    ...transformDeliveries(deliveriesResult.data || [], profilesMap, collectionsMap),
    ...transformPurchases(purchasesResult.data || [], profilesMap),
    ...transformManualPayments(paymentsResult.data || [], profilesMap),
    ...transformQuotes(quotesResult.data || [], quoteItemsMap, profilesMap),
  ];

  // Aplicar busca usando PostgreSQL full-text search (se disponível)
  let filteredOrders = unifiedOrders;
  if (filters.searchQuery && filters.searchQuery.trim()) {
    // Try to use PostgreSQL full-text search for better performance
    try {
      // searchOrdersWithFullText não suporta 'quote' ainda, então usamos 'all' como fallback
      const searchType = filters.type === "quote" ? "all" : filters.type;
      const searchResults = await searchOrdersWithFullText(filters.searchQuery.trim(), searchType);

      if (searchResults.length > 0) {
        // Filter unified orders to only include search results
        const searchResultIds = new Set(searchResults.map((r) => r.order_id));
        filteredOrders = unifiedOrders.filter((order) => searchResultIds.has(order.id));

        // Sort by relevance rank from full-text search
        const rankMap = new Map(searchResults.map((r) => [r.order_id, r.rank]));
        filteredOrders.sort((a, b) => {
          const rankA = rankMap.get(a.id) || 0;
          const rankB = rankMap.get(b.id) || 0;
          return rankB - rankA; // Higher rank first
        });
      } else {
        // No results from full-text search
        filteredOrders = [];
      }
    } catch (error) {
      // Fallback to client-side search if full-text search fails
      log.warn("Full-text search failed, falling back to client-side search", { error });
      const query = filters.searchQuery.toLowerCase().trim();
      filteredOrders = unifiedOrders.filter(
        (order) =>
          order.customer.name.toLowerCase().includes(query) ||
          order.customer.email.toLowerCase().includes(query) ||
          order.id.toLowerCase().includes(query) ||
          (order.trackingCode && order.trackingCode.toLowerCase().includes(query))
      );
    }
  }

  // Ordenar por data de criação (mais recente primeiro)
  filteredOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Aplicar paginação
  const paginatedOrders = filteredOrders.slice(offset, offset + pageSize);

  return {
    data: paginatedOrders,
    total: filteredOrders.length,
    page,
    pageSize,
    totalPages: Math.ceil(filteredOrders.length / pageSize),
  };
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => typeof value === "string" && value.length > 0))];
}

async function fetchProfilesMap(userIds: string[]): Promise<Map<string, ProfileSummary>> {
  const profilesMap = new Map<string, ProfileSummary>();

  if (userIds.length === 0) {
    return profilesMap;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds);

  if (error) {
    log.warn("Failed to fetch order profile summaries", { error });
    return profilesMap;
  }

  ((data as ProfileSummary[] | null) || []).forEach((profile) => {
    profilesMap.set(profile.id, profile);
  });

  return profilesMap;
}

async function fetchCollectionsMap(collectionIds: string[]): Promise<Map<string, CollectionSummary>> {
  const collectionsMap = new Map<string, CollectionSummary>();

  if (collectionIds.length === 0) {
    return collectionsMap;
  }

  const { data, error } = await supabase
    .from("collections")
    .select("id, name, slug")
    .in("id", collectionIds);

  if (error) {
    log.warn("Failed to fetch order collection summaries", { error });
    return collectionsMap;
  }

  ((data as CollectionSummary[] | null) || []).forEach((collection) => {
    collectionsMap.set(collection.id, collection);
  });

  return collectionsMap;
}

// ============================================================================
// Funções Auxiliares: Buscar Dados por Tipo
// ============================================================================

/**
 * Busca entregas de assinatura com filtros aplicados
 *
 * IMPORTANTE: Supabase PostgREST não suporta joins aninhados.
 * Esta query busca apenas subscription_deliveries com subscriptions.
 * Os dados de profiles e collections são buscados separadamente na função principal.
 */
async function fetchSubscriptionDeliveries(filters: OrderFilters): Promise<QueryResult<DeliveryRow>> {
  let query = supabase.from("subscription_deliveries").select(
    `
      id,
      status,
      delivery_number,
      delivery_order,
      tracking_code,
      actual_delivery_date,
      delivered_date,
      shipping_date,
      reveal_date,
      created_at,
      updated_at,
      subscription_id,
      character_id,
      cycle_id,
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
    `,
    { count: "exact" }
  );

  // Aplicar filtros de status
  if (filters.status.length > 0) {
    query = query.in("status", filters.status);
  }

  // Aplicar filtros de data
  if (filters.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte("created_at", filters.dateTo);
  }

  const result = await query;
  return normalizeQueryResult<DeliveryRow>(
    result as unknown as QueryResult<RawOrderStatusRow<DeliveryRow>>,
    "subscription_deliveries"
  );
}

/**
 * Busca compras avulsas com filtros aplicados
 *
 * Esta query usa joins para buscar todos os dados relacionados em uma única operação:
 * - profiles (INNER JOIN)
 * - collections (INNER JOIN)
 * - collection_characters (LEFT JOIN)
 *
 * Isso evita N+1 queries e garante performance otimizada.
 */
async function fetchStandalonePurchases(filters: OrderFilters): Promise<QueryResult<PurchaseRow>> {
  let query = supabase.from("standalone_purchases").select(
    `
      id,
      status,
      user_id,
      collection_id,
      character_id,
      amount,
      paid_amount,
      balance_amount,
      payment_method,
      payment_link,
      tracking_code,
      shipping_carrier,
      notes,
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
    `,
    { count: "exact" }
  );

  // Aplicar filtros de status
  if (filters.status.length > 0) {
    query = query.in("status", filters.status);
  }

  // Aplicar filtros de data
  if (filters.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte("created_at", filters.dateTo);
  }

  const result = await query;

  if (result.error) {
    log.error('Error fetching standalone purchases (orders-service)', { error: result.error });
  }

  return normalizeQueryResult<PurchaseRow>(
    result as unknown as QueryResult<RawOrderStatusRow<PurchaseRow>>,
    "standalone_purchases"
  );
}

// ============================================================================
// Funções de Contagem
// ============================================================================

/**
 * Conta pedidos por status
 *
 * Útil para exibir badges com contagem ao lado de cada filtro de status
 */
export async function countOrdersByStatus(
  type: "all" | "subscription_delivery" | "standalone_purchase" | "manual_payment" | "quote"
): Promise<Record<OrderStatus, number>> {
  const counts = Object.fromEntries(
    ALL_ORDER_STATUS_OPTIONS.map((option) => [option.value, 0])
  ) as Record<OrderStatus, number>;

  // Contar entregas de assinatura
  if (type === "all" || type === "subscription_delivery") {
    const { data: deliveries } = await supabase.from("subscription_deliveries").select("status");

    if (deliveries) {
      deliveries.forEach((delivery) => {
        incrementStatusCount(counts, delivery.status, "subscription_deliveries");
      });
    }
  }

  // Contar compras avulsas
  if (type === "all" || type === "standalone_purchase") {
    const { data: purchases } = await supabase.from("standalone_purchases").select("status");

    if (purchases) {
      purchases.forEach((purchase) => {
        incrementStatusCount(counts, purchase.status, "standalone_purchases");
      });
    }
  }

  // Contar pagamentos manuais
  if (type === "all" || type === "manual_payment") {
    const { data: payments } = await supabase.from("manual_payments").select("status");

    if (payments) {
      payments.forEach((payment) => {
        incrementStatusCount(counts, payment.status, "manual_payments");
      });
    }
  }

  // Contar orçamentos
  if (type === "all" || type === "quote") {
    const { data: quotes } = await supabase.from("quotes").select("status");

    if (quotes) {
      quotes.forEach((quote) => {
        incrementStatusCount(counts, quote.status, "quotes");
      });
    }
  }

  return counts;
}

// ============================================================================
// Funções de Busca Individual
// ============================================================================

/**
 * Busca um pedido específico por ID e tipo
 */
export async function fetchOrderById(
  orderId: string,
  orderType: "subscription_delivery" | "standalone_purchase"
): Promise<UnifiedOrder | null> {
  if (orderType === "subscription_delivery") {
    const { data, error } = await supabase
      .from("subscription_deliveries")
      .select(
        `
        id,
        status,
        delivery_number,
        delivery_order,
        tracking_code,
        actual_delivery_date,
        delivered_date,
        shipping_date,
        reveal_date,
        created_at,
        updated_at,
        subscription_id,
        character_id,
        cycle_id,
        subscriptions (
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
      `
      )
      .eq("id", orderId)
      .single();

    if (error || !data) return null;

    // Buscar profile e collection separadamente (Supabase não suporta joins aninhados)
    const userId = data.subscriptions?.user_id;
    const collectionId = data.subscriptions?.collection_id;

    const profilesMap = new Map<string, ProfileSummary>();
    const collectionsMap = new Map<string, CollectionSummary>();

    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", userId)
        .single();

      if (profile) profilesMap.set(profile.id, profile);
    }

    if (collectionId) {
      const { data: collection } = await supabase
        .from("collections")
        .select("id, name, slug")
        .eq("id", collectionId)
        .single();

      if (collection) collectionsMap.set(collection.id, collection);
    }

    const deliveryRows = normalizeOrderStatusRows<DeliveryRow>(
      [data] as unknown as Array<RawOrderStatusRow<DeliveryRow>>,
      "subscription_deliveries"
    );

    const { transformDeliveries } = await import("./orders-transformer");
    const transformed = transformDeliveries(deliveryRows, profilesMap, collectionsMap);
    return transformed[0] || null;
  } else {
    const { data, error } = await supabase
      .from("standalone_purchases")
      .select(
        `
        id,
        status,
        user_id,
        collection_id,
        character_id,
        amount,
        paid_amount,
        balance_amount,
        payment_method,
        payment_link,
        tracking_code,
        shipping_carrier,
        notes,
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
      `
      )
      .eq("id", orderId)
      .single();

    if (error || !data) return null;

    // Fetch profile separately (no FK)
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", data.user_id)
      .single();

    const [purchaseRow] = normalizeOrderStatusRows<PurchaseRow>(
      [data] as unknown as Array<RawOrderStatusRow<PurchaseRow>>,
      "standalone_purchases"
    );
    const enrichedData = { ...purchaseRow, profiles: profile || { id: purchaseRow.user_id, full_name: 'Desconhecido', email: '' } };

    const { transformPurchases } = await import("./orders-transformer");
    const transformed = transformPurchases([enrichedData]);
    return transformed[0] || null;
  }
}
/**
 * Busca todos os pedidos de um usuário específico
 *
 * Esta função consolida todos os tipos de pedidos de um usuário:
 * - Entregas de assinatura (subscription_deliveries)
 * - Compras avulsas (standalone_purchases)
 * - Pagamentos manuais (manual_payments)
 * - Orçamentos (quotes)
 *
 * Os resultados são ordenados por data de criação (mais recente primeiro)
 *
 * @param userId - ID do usuário
 * @returns Array de pedidos unificados do usuário
 */
export async function fetchOrdersByUserId(userId: string): Promise<UnifiedOrder[]> {
  // Buscar entregas de assinatura do usuário
  const { data: deliveriesData, error: deliveriesError } = await supabase
    .from("subscription_deliveries")
    .select(
      `
      id,
      status,
      delivery_number,
      delivery_order,
      tracking_code,
      shipping_carrier,
      actual_delivery_date,
      delivered_date,
      reveal_date,
      shipping_date,
      production_start_date,
      created_at,
      updated_at,
      subscription_id,
      character_id,
      cycle_id,
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
    `
    )
    .eq("subscriptions.user_id", userId)
    .order("created_at", { ascending: false });

  if (deliveriesError) {
    log.error("Error fetching user deliveries", { error: deliveriesError });
  }

  const deliveries = normalizeOrderStatusRows<DeliveryRow>(
    deliveriesData as unknown as Array<RawOrderStatusRow<DeliveryRow>>,
    "subscription_deliveries"
  );

  // Buscar compras avulsas do usuário
  const { data: purchasesData, error: purchasesError } = await supabase
    .from("standalone_purchases")
    .select(
      `
      id,
      status,
      user_id,
      collection_id,
      character_id,
      amount,
      paid_amount,
      balance_amount,
      payment_method,
      payment_link,
      tracking_code,
      shipping_carrier,
      notes,
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
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (purchasesError) {
    log.error("Error fetching user purchases", { error: purchasesError });
  }

  let purchases = normalizeOrderStatusRows<PurchaseRow>(
    purchasesData as unknown as Array<RawOrderStatusRow<PurchaseRow>>,
    "standalone_purchases"
  );

  // Enrich purchases with profile
  if (purchases.length > 0) {
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", userId)
      .single();

    if (userProfile) {
      purchases = purchases.map((purchase) => ({
        ...purchase,
        profiles: userProfile,
      }));
    }
  }

  // Buscar pagamentos manuais do usuário
  const { data: paymentsData, error: paymentsError } = await supabase
    .from("manual_payments")
    .select(
      `
      id,
      user_id,
      amount,
      status,
      payment_method,
      payment_date,
      reference_id,
      reference_type,
      notes,
      confirmed_at,
      confirmed_by,
      created_at
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (paymentsError) {
    log.error("Error fetching user payments", { error: paymentsError });
  }

  let payments = normalizeOrderStatusRows<ManualPaymentRow>(
    paymentsData as unknown as Array<RawOrderStatusRow<ManualPaymentRow>>,
    "manual_payments"
  );

  // Fetch profile for manual payments
  if (payments.length > 0) {
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", userId)
      .single();

    if (userProfile) {
      payments = payments.map((payment) => ({
        ...payment,
        profiles: userProfile,
      }));
    }
  }

  // Buscar orçamentos do usuário
  const { data: quotesData, error: quotesError } = await supabase
    .from("quotes")
    .select(
      `
      id,
      user_id,
      status,
      notes,
      admin_notes,
      total_amount,
      deposit_amount,
      remaining_amount,
      payment_status,
      tracking_code,
      created_at,
      updated_at
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (quotesError) {
    log.error('Error fetching user quotes', { quotesError });
  }

  const quotes = normalizeOrderStatusRows<QuoteRow>(
    quotesData as unknown as Array<RawOrderStatusRow<QuoteRow>>,
    "quotes"
  );

  // Buscar profiles e collections para entregas de assinatura
  const profilesMap = new Map<string, ProfileSummary>();
  const collectionsMap = new Map<string, CollectionSummary>();

  if (deliveries.length > 0) {
    const userIds = [
      ...new Set(
        deliveries
          .map((d) => d.subscriptions?.user_id)
          .filter((id): id is string => typeof id === "string")
      ),
    ];

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      if (profiles) {
        profiles.forEach((p) => profilesMap.set(p.id, p));
      }
    }

    // Fetch collections via subscription_collections junction
    const subIds = [...new Set(deliveries.map((d) => d.subscription_id).filter(Boolean))];
    if (subIds.length > 0) {
      const { data: subCols } = await supabase
        .from("subscription_collections")
        .select("subscription_id, collection_id, collections(id, name, slug)")
        .in("subscription_id", subIds);

      if (subCols) {
        (subCols as unknown as SubscriptionCollectionRow[]).forEach((sc) => {
          if (sc.collections) {
            collectionsMap.set(sc.collections.id, sc.collections);
          }
        });
      }
    }
  }

  // Buscar itens dos orçamentos
  const quoteItemsMap = new Map<string, QuoteItem[]>();
  if (quotes.length > 0) {
    const quoteIds = quotes.map((q) => q.id);
    const items = await fetchQuoteItems(quoteIds);

    items.forEach((item) => {
      const arr = quoteItemsMap.get(item.quote_id) || [];
      arr.push(item);
      quoteItemsMap.set(item.quote_id, arr);
    });
  }

  // Transformar e unificar dados
  const { transformDeliveries, transformPurchases, transformManualPayments, transformQuotes } =
    await import("./orders-transformer");

  // Build profilesMap for payments/quotes too
  if (payments.length > 0 && !profilesMap.has(userId)) {
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", userId)
      .single();
    if (userProfile) profilesMap.set(userProfile.id, userProfile);
  }

  const unifiedOrders: UnifiedOrder[] = [
    ...transformDeliveries(deliveries, profilesMap, collectionsMap),
    ...transformPurchases(purchases, profilesMap),
    ...transformManualPayments(payments, profilesMap),
    ...transformQuotes(quotes, quoteItemsMap, profilesMap),
  ];

  // Ordenar por data de criação (mais recente primeiro)
  unifiedOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return unifiedOrders;
}

// ============================================================================
// Funções de Histórico de Status
// ============================================================================

/**
 * Busca o histórico de mudanças de status de um pedido
 *
 * Retorna todas as mudanças de status ordenadas por data (mais recente primeiro)
 *
 * @param orderId - ID do pedido
 * @param orderType - Tipo do pedido (subscription_delivery ou standalone_purchase)
 * @returns Array de entradas do histórico de status
 */
export async function fetchOrderStatusHistory(
  orderId: string,
  orderType: "subscription_delivery" | "standalone_purchase" | "manual_payment"
): Promise<StatusHistoryEntry[]> {
  const { data, error } = await supabase
    .from("order_status_history")
    .select("*")
    .eq("order_id", orderId)
    .eq("order_type", orderType)
    .order("created_at", { ascending: false });

  if (error) {
    log.error('Error fetching order status history', { error });
    throw new Error(`Erro ao buscar histórico de status: ${error.message}`);
  }

  // Transformar dados do banco para o formato da interface
  return (data || []).map((entry) => ({
    id: entry.id,
    orderId: entry.order_id,
    orderType: entry.order_type as
      | "subscription_delivery"
      | "standalone_purchase"
      | "manual_payment",
    oldStatus: entry.old_status as OrderStatus,
    newStatus: entry.new_status as OrderStatus,
    changedBy: entry.changed_by || "system",
    changedByName: entry.changed_by_name || "Sistema",
    changedAt: entry.created_at,
    notes: entry.notes || undefined,
  }));
}

// ============================================================================
// Funções de Atualização em Massa
// ============================================================================

/**
 * Atualiza o status de múltiplos pedidos em lote
 *
 * Esta função processa cada pedido individualmente, validando a transição
 * de status antes de aplicar a mudança. Coleta sucessos e falhas para
 * fornecer feedback detalhado ao usuário.
 *
 * **Validação**: Cada transição é validada usando `validateStatusTransition()`
 * do módulo orders-validator. Transições inválidas são registradas como falhas.
 *
 * **Processamento**: Os pedidos são processados sequencialmente para evitar
 * sobrecarga do banco de dados e permitir rastreamento preciso de erros.
 *
 * **Progresso**: Callback opcional permite rastrear progresso em tempo real.
 *
 * @param orders - Array de pedidos a serem atualizados
 * @param newStatus - Novo status a ser aplicado
 * @param onProgress - Callback opcional para rastrear progresso (recebe índice atual e total)
 * @returns Resultado com arrays de IDs bem-sucedidos e falhas com mensagens de erro
 *
 * @example
 * ```typescript
 * const result = await bulkUpdateStatus(
 *   selectedOrders,
 *   'shipped',
 *   (current, total) => console.log(`${current}/${total}`)
 * );
 * console.log(`${result.successful.length} pedidos atualizados`);
 * console.log(`${result.failed.length} pedidos falharam`);
 * ```
 *
 * Requisitos: 7.3, 7.5, 15.3
 */
export async function bulkUpdateStatus(
  orders: UnifiedOrder[],
  newStatus: OrderStatus,
  onProgress?: (current: number, total: number) => void
): Promise<import("@/types/admin/orders").BulkActionResult> {
  const { validateStatusTransition } = await import("./orders-validator");

  const result: import("@/types/admin/orders").BulkActionResult = {
    successful: [],
    failed: [],
  };

  // Processar cada pedido individualmente
  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];

    try {
      // Validar transição de status
      const validationError = validateStatusTransition(order.status, newStatus, order.type);

      if (validationError) {
        // Transição inválida - adicionar à lista de falhas
        result.failed.push({
          id: order.id,
          error: validationError.message,
        });

        // Notificar progresso
        if (onProgress) {
          onProgress(i + 1, orders.length);
        }

        continue;
      }

      if (order.type === "standalone_purchase") {
        await transitionStandalonePurchaseStatus(order.id, newStatus);
      } else if (order.type === "subscription_delivery") {
        await updateDeliveryStatus({
          deliveryId: order.id,
          newStatus,
        });
      } else if (order.type === "manual_payment") {
        await updateManualPaymentStatus(
          order.id,
          newStatus,
          newStatus === "rejected" ? "Rejeitado pelo painel admin" : null
        );
      } else if (order.type === "quote") {
        await updateQuoteStatusRpc(order.id, newStatus);
      } else {
        throw new Error(`Tipo de pedido nao suportado: ${order.type}`);
      }

        // Erro ao atualizar - adicionar à lista de falhas

      // Sucesso - adicionar à lista de sucessos
      result.successful.push(order.id);

      // Registrar mudança no histórico (opcional, não bloqueia em caso de erro)
      try {
        await recordOrderStatusHistory({
          orderId: order.id,
          orderType: order.type,
          oldStatus: order.status,
          newStatus,
        });
      } catch (historyError) {
        log.warn('Failed to register status history', { historyError });
        // Não falhar a operação se o histórico não puder ser registrado
      }
    } catch (error) {
      // Erro inesperado - adicionar à lista de falhas
      result.failed.push({
        id: order.id,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }

    // Notificar progresso após processar cada pedido
    if (onProgress) {
      onProgress(i + 1, orders.length);
    }
  }

  return result;
}

// ============================================================================
// Funções de Full-Text Search
// ============================================================================

/**
 * Busca pedidos usando PostgreSQL full-text search
 *
 * Esta função utiliza a função `search_unified_orders()` do PostgreSQL
 * que foi criada pela migration 20260426000000_create_fulltext_search_indexes.sql
 *
 * A busca é otimizada com índices GIN e retorna resultados com ranking de relevância.
 *
 * @param searchQuery - Termo de busca (deve estar sanitizado)
 * @param orderType - Tipo de pedido para filtrar ('all', 'subscription_delivery', 'standalone_purchase', 'manual_payment')
 * @returns Array de resultados com order_id, order_type e rank
 *
 * @example
 * ```typescript
 * const results = await searchOrdersWithFullText('João Silva', 'all');
 * // Returns: [{ order_id: '...', order_type: 'subscription_delivery', rank: 0.8 }, ...]
 * ```
 *
 * Requisitos: 4.2, 11.5
 * Task: 11.2 Implementar full-text search no PostgreSQL
 */
async function searchOrdersWithFullText(
  searchQuery: string,
  orderType: "all" | "subscription_delivery" | "standalone_purchase" | "manual_payment" = "all"
): Promise<Array<{ order_id: string; order_type: string; rank: number }>> {
  const { data, error } = await supabase.rpc("search_unified_orders", {
    search_query: searchQuery,
    order_type_filter: orderType === "manual_payment" ? "all" : orderType,
  });

  if (error) {
    log.error('Error in full-text search', { error });
    throw error;
  }

  return data || [];
}

// ============================================================================
// Funções para Pagamentos Manuais
// ============================================================================

/**
 * Busca pagamentos manuais com filtros aplicados
 *
 * Esta query busca pagamentos manuais com todos os dados relacionados:
 * - profiles (cliente)
 * - admin_payment_methods (método de pagamento)
 * - payment_files (comprovantes)
 * - profiles (admin que aprovou, se aplicável)
 */
async function fetchManualPayments(filters: OrderFilters): Promise<QueryResult<ManualPaymentRow>> {
  let query = supabase.from("manual_payments").select(
    `
      id,
      reference_number,
      user_id,
      payment_method_id,
      quote_id,
      subscription_id,
      amount,
      currency,
      payment_type,
      status,
      rejection_reason,
      created_at,
      updated_at,
      approved_at,
      approved_by,
      admin_payment_methods (
        id,
        name,
        type,
        instructions,
        pix_key,
        payment_link
      )
    `,
    { count: "exact" }
  );

  // Aplicar filtros de status
  if (filters.status.length > 0) {
    query = query.in("status", filters.status);
  }

  // Aplicar filtros de data
  if (filters.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte("created_at", filters.dateTo);
  }

  const result = normalizeQueryResult<ManualPaymentQueryRow>(
    await query as unknown as QueryResult<RawOrderStatusRow<ManualPaymentQueryRow>>,
    "manual_payments"
  );

  // Fetch related data separately
  if (result.data && result.data.length > 0) {
    const userIds = [...new Set(result.data.map((payment) => payment.user_id))];
    const subscriptionIds = result.data
      .filter((payment): payment is ManualPaymentQueryRow & { subscription_id: string } => Boolean(payment.subscription_id))
      .map((payment) => payment.subscription_id);
    const quoteIds = result.data
      .filter((payment): payment is ManualPaymentQueryRow & { quote_id: string } => Boolean(payment.quote_id))
      .map((payment) => payment.quote_id);

    // Fetch profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    // Fetch subscriptions with plans
    let subscriptions: EnrichedManualPaymentSubscription[] = [];
    if (subscriptionIds.length > 0) {
      const { data: subsData } = await supabase
        .from("subscriptions")
        .select("id, status, plan_type, created_at, updated_at")
        .in("id", subscriptionIds);

      if (subsData && subsData.length > 0) {
        // Fetch subscription plans separately
        const subscriptionRows = subsData as ManualPaymentSubscriptionRow[];
        const planTypes = [...new Set(subscriptionRows.map((subscription) => subscription.plan_type))];
        const { data: plansData } = await supabase
          .from("subscription_plans")
          .select("id, name, plan_type, price_full, price_pix")
          .in("plan_type", planTypes);

        const plansMap = new Map(
          ((plansData as SubscriptionPlanSummary[] | null) || []).map((plan) => [plan.plan_type, plan])
        );

        // Merge plans into subscriptions and map to expected format
        subscriptions = subscriptionRows.map((sub) => {
          const plan = plansMap.get(sub.plan_type);
          return {
            id: sub.id,
            status: sub.status,
            start_date: sub.created_at, // Use created_at as start_date
            end_date: null, // subscriptions table doesn't have end_date
            subscription_plans: plan ? {
              id: plan.id,
              name: plan.name,
              price: plan.price_pix, // Use PIX price as default
              billing_cycle: plan.plan_type, // Use plan_type as billing_cycle
            } : null,
          };
        });
      }
    }

    // Fetch quotes
    let quotes: ManualPaymentQuoteRow[] = [];
    if (quoteIds.length > 0) {
      const { data: quotesData } = await supabase
        .from("quotes")
        .select("id, status, total_price, admin_response")
        .in("id", quoteIds);
      quotes = (quotesData as ManualPaymentQuoteRow[] | null) || [];
    }

    // Create maps for easy lookup
    const profilesMap = new Map(((profiles as ProfileSummary[] | null) || []).map((profile) => [profile.id, profile]));
    const subscriptionsMap = new Map(subscriptions.map((subscription) => [subscription.id, subscription]));
    const quotesMap = new Map(quotes.map((quote) => [quote.id, quote]));

    // Merge data
    result.data = result.data.map((payment) => ({
      ...payment,
      profiles: profilesMap.get(payment.user_id) || null,
      subscriptions: payment.subscription_id ? subscriptionsMap.get(payment.subscription_id) || null : null,
      quotes: payment.quote_id ? quotesMap.get(payment.quote_id) || null : null,
    }));
  }

  return result;
}

// ============================================================================
// Funções para Orçamentos (Quotes)
// ============================================================================

/**
 * Busca orçamentos com filtros aplicados
 *
 * Esta query busca orçamentos com todos os dados relacionados:
 * - profiles (cliente)
 */
async function fetchQuotes(filters: OrderFilters): Promise<QueryResult<QuoteRow>> {
  let query = supabase.from("quotes").select(
    `
      id,
      user_id,
      status,
      deadline,
      notes,
      created_at,
      updated_at
    `,
    { count: "exact" }
  );

  // Aplicar filtros de status
  if (filters.status.length > 0) {
    query = query.in("status", filters.status);
  }

  // Aplicar filtros de data
  if (filters.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte("created_at", filters.dateTo);
  }

  const result = await query;
  return normalizeQueryResult<QuoteRow>(
    result as unknown as QueryResult<RawOrderStatusRow<QuoteRow>>,
    "quotes"
  );
}

/**
 * Busca itens de orçamentos
 *
 * @param quoteIds - IDs dos orçamentos
 * @returns Array de itens com modelos relacionados
 */
export async function fetchQuoteItems(quoteIds: string[]): Promise<QuoteItemWithQuoteId[]> {
  if (quoteIds.length === 0) return [];

  const { data, error } = await supabase
    .from("quote_items")
    .select(
      `
      id,
      quote_id,
      character_id,
      name,
      description,
      quantity,
      unit_price,
      total_price,
      image_url
    `
    )
    .in("quote_id", quoteIds);

  if (error) {
    throw new Error(`Erro ao buscar itens de orçamentos: ${error.message}`);
  }

  return ((data as QuoteItemRow[] | null) || []).map((item) => ({
    id: item.id,
    quote_id: item.quote_id,
    name: item.name,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    totalPrice: item.total_price,
    imageUrl: item.image_url,
    characterId: item.character_id,
  }));
}

// ============================================================================
// Funções para Pagamentos Manuais
// ============================================================================

/**
 * Solicita mais informações sobre um pagamento manual
 *
 * Esta função implementa um sistema completo de solicitação de informações:
 * 1. Busca o pagamento manual e valida sua existência
 * 2. Obtém o user_id do pagamento para notificar o cliente correto
 * 3. Obtém informações do admin que está fazendo a solicitação
 * 4. Cria um registro na tabela payment_info_requests
 * 5. Cria uma notificação para o usuário na tabela user_notifications
 * 6. Atualiza o status do pagamento para 'requires_info'
 *
 * @param paymentId - ID do pagamento manual
 * @param message - Mensagem com as informações solicitadas
 * @throws Error se o pagamento não for encontrado ou se houver erro ao criar a solicitação
 */
export async function requestManualPaymentInfo(paymentId: string, message: string): Promise<void> {
  // 1. Buscar o pagamento manual para obter o user_id
  const { data: payment, error: paymentError } = await supabase
    .from("manual_payments")
    .select("id, user_id, reference_number")
    .eq("id", paymentId)
    .single();

  if (paymentError || !payment) {
    throw new Error(`Pagamento não encontrado: ${paymentError?.message || "ID inválido"}`);
  }

  // 2. Obter informações do admin atual
  const {
    data: { user: admin },
  } = await supabase.auth.getUser();

  if (!admin) {
    throw new Error("Admin não autenticado");
  }

  void payment;
  void admin;
  await requestManualPaymentInfoRpc(paymentId, message);
}

/**
 * Aprova um pagamento manual
 *
 * Esta função:
 * 1. Valida que o pagamento existe e está em status apropriado
 * 2. Atualiza o status para 'approved'
 * 3. Registra o admin que aprovou e o timestamp
 * 4. Cria notificação para o usuário
 *
 * @param paymentId - ID do pagamento manual
 * @throws Error se o pagamento não for encontrado ou já estiver aprovado/rejeitado
 */
export async function approveManualPayment(paymentId: string): Promise<void> {
  // 1. Buscar o pagamento para validar
  const { data: payment, error: paymentError } = await supabase
    .from("manual_payments")
    .select("id, user_id, reference_number, status")
    .eq("id", paymentId)
    .single();

  if (paymentError || !payment) {
    throw new Error(`Pagamento não encontrado: ${paymentError?.message || "ID inválido"}`);
  }

  // Validar que o pagamento pode ser aprovado
  if (payment.status === "approved") {
    throw new Error("Este pagamento já foi aprovado");
  }

  if (payment.status === "rejected") {
    throw new Error("Este pagamento foi rejeitado e não pode ser aprovado");
  }

  // 2. Obter informações do admin atual
  const {
    data: { user: admin },
  } = await supabase.auth.getUser();

  if (!admin) {
    throw new Error("Admin não autenticado");
  }

  void payment;
  void admin;
  await approveManualPaymentWithNotification(paymentId);
}

/**
 * Rejeita um pagamento manual
 *
 * Esta função:
 * 1. Valida que o pagamento existe e está em status apropriado
 * 2. Atualiza o status para 'rejected'
 * 3. Registra o motivo da rejeição
 * 4. Cria notificação para o usuário com o motivo
 *
 * @param paymentId - ID do pagamento manual
 * @param reason - Motivo da rejeição
 * @throws Error se o pagamento não for encontrado ou já estiver aprovado/rejeitado
 */
export async function rejectManualPayment(paymentId: string, reason: string): Promise<void> {
  // 1. Buscar o pagamento para validar
  const { data: payment, error: paymentError } = await supabase
    .from("manual_payments")
    .select("id, user_id, reference_number, status")
    .eq("id", paymentId)
    .single();

  if (paymentError || !payment) {
    throw new Error(`Pagamento não encontrado: ${paymentError?.message || "ID inválido"}`);
  }

  // Validar que o pagamento pode ser rejeitado
  if (payment.status === "approved") {
    throw new Error("Este pagamento já foi aprovado e não pode ser rejeitado");
  }

  if (payment.status === "rejected") {
    throw new Error("Este pagamento já foi rejeitado");
  }

  void payment;
  await rejectManualPaymentWithNotification(paymentId, reason);
}
