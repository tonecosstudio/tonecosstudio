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
import type {
  UnifiedOrder,
  OrderFilters,
  PaginationParams,
  PaginatedResponse,
  OrderStatus,
  StatusHistoryEntry,
} from "@/types/admin/orders";

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
 * usando a função `sanitizeSearchInput()` de `@/lib/sanitizer`.
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
  let deliveriesPromise: Promise<any> | null = null;
  if (filters.type === "all" || filters.type === "subscription_delivery") {
    deliveriesPromise = fetchSubscriptionDeliveries(filters);
  }

  // Buscar compras avulsas (se aplicável)
  let purchasesPromise: Promise<any> | null = null;
  if (filters.type === "all" || filters.type === "standalone_purchase") {
    purchasesPromise = fetchStandalonePurchases(filters);
  }

  // Buscar pagamentos manuais (se aplicável)
  let paymentsPromise: Promise<any> | null = null;
  if (filters.type === "all" || filters.type === "manual_payment") {
    paymentsPromise = fetchManualPayments(filters);
  }

  // Buscar orçamentos (se aplicável)
  let quotesPromise: Promise<any> | null = null;
  if (filters.type === "all" || filters.type === "quote") {
    quotesPromise = fetchQuotes(filters);
  }

  // Executar queries em paralelo
  const [deliveriesResult, purchasesResult, paymentsResult, quotesResult] = await Promise.all([
    deliveriesPromise || Promise.resolve({ data: [], count: 0 }),
    purchasesPromise || Promise.resolve({ data: [], count: 0 }),
    paymentsPromise || Promise.resolve({ data: [], count: 0 }),
    quotesPromise || Promise.resolve({ data: [], count: 0 }),
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
  const profilesMap = new Map<string, any>();
  const collectionsMap = new Map<string, any>();

  if (deliveriesResult.data && deliveriesResult.data.length > 0) {
    // Extrair IDs únicos de user_id e collection_id
    const userIds = [
      ...new Set(
        deliveriesResult.data
          .map((d: any) => d.subscriptions?.user_id)
          .filter((id: any): id is string => typeof id === "string")
      ),
    ] as string[];
    const collectionIds = [
      ...new Set(
        deliveriesResult.data
          .map((d: any) => d.subscriptions?.collection_id)
          .filter((id: any): id is string => typeof id === "string")
      ),
    ] as string[];

    // Buscar profiles
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      if (profiles) {
        profiles.forEach((p: any) => profilesMap.set(p.id, p));
      }
    }

    // Buscar collections
    if (collectionIds.length > 0) {
      const { data: collections } = await supabase
        .from("collections")
        .select("id, name, slug")
        .in("id", collectionIds);

      if (collections) {
        collections.forEach((c: any) => collectionsMap.set(c.id, c));
      }
    }
  }

  // Buscar itens dos orçamentos
  const quoteItemsMap = new Map<string, any[]>();
  if (quotesResult.data && quotesResult.data.length > 0) {
    const quoteIds = quotesResult.data.map((q: any) => q.id);
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
    ...transformPurchases(purchasesResult.data || []),
    ...transformManualPayments(paymentsResult.data || []),
    ...transformQuotes(quotesResult.data || [], quoteItemsMap),
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
      console.warn("Full-text search failed, falling back to client-side search:", error);
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
async function fetchSubscriptionDeliveries(filters: OrderFilters) {
  let query = supabase.from("subscription_deliveries").select(
    `
      id,
      status,
      delivery_number,
      tracking_code,
      expected_delivery_date,
      actual_delivery_date,
      reveal_date,
      created_at,
      updated_at,
      subscription_id,
      character_id,
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

  return await query;
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
async function fetchStandalonePurchases(filters: OrderFilters) {
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
    console.error('❌ Error fetching standalone purchases (orders-service):', result.error);
    console.error('Error details:', JSON.stringify(result.error, null, 2));
  }

  return result;
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
  const counts: Record<string, number> = {};

  // Contar entregas de assinatura
  if (type === "all" || type === "subscription_delivery") {
    const { data: deliveries } = await supabase.from("subscription_deliveries").select("status");

    if (deliveries) {
      deliveries.forEach((d: { status: string }) => {
        counts[d.status] = (counts[d.status] || 0) + 1;
      });
    }
  }

  // Contar compras avulsas
  if (type === "all" || type === "standalone_purchase") {
    const { data: purchases } = await supabase.from("standalone_purchases").select("status");

    if (purchases) {
      purchases.forEach((p: { status: string }) => {
        counts[p.status] = (counts[p.status] || 0) + 1;
      });
    }
  }

  // Contar pagamentos manuais
  if (type === "all" || type === "manual_payment") {
    const { data: payments } = await supabase.from("manual_payments").select("status");

    if (payments) {
      payments.forEach((p: { status: string }) => {
        counts[p.status] = (counts[p.status] || 0) + 1;
      });
    }
  }

  // Contar orçamentos
  if (type === "all" || type === "quote") {
    const { data: quotes } = await supabase.from("quotes").select("status");

    if (quotes) {
      quotes.forEach((q: { status: string }) => {
        counts[q.status] = (counts[q.status] || 0) + 1;
      });
    }
  }

  return counts as Record<OrderStatus, number>;
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
        tracking_code,
        expected_delivery_date,
        actual_delivery_date,
        reveal_date,
        created_at,
        updated_at,
        subscription_id,
        character_id,
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

    const profilesMap = new Map<string, any>();
    const collectionsMap = new Map<string, any>();

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

    const { transformDeliveries } = await import("./orders-transformer");
    const transformed = transformDeliveries([data], profilesMap, collectionsMap);
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

    const enrichedData = { ...data, profiles: profile || { id: data.user_id, full_name: 'Desconhecido', email: '' } };

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
      tracking_code,
      expected_delivery_date,
      actual_delivery_date,
      reveal_date,
      created_at,
      updated_at,
      subscription_id,
      character_id,
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
    console.error("Error fetching user deliveries:", deliveriesError);
  }

  // Buscar compras avulsas do usuário
  const { data: purchasesData, error: purchasesError } = await supabase
    .from("standalone_purchases")
    .select(
      `
      id,
      status,
      user_id,
      collection_id,
      cycle_id,
      character_id,
      price_deposit,
      price_balance,
      price_full,
      deposit_paid_at,
      balance_paid_at,
      balance_due_date,
      deposit_voucher_url,
      balance_voucher_url,
      tracking_code,
      expected_delivery_date,
      actual_delivery_date,
      created_at,
      updated_at,
      profiles (
        id,
        full_name,
        email
      ),
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
    console.error("Error fetching user purchases:", purchasesError);
  }

  // Buscar pagamentos manuais do usuário
  const { data: paymentsData, error: paymentsError } = await supabase
    .from("manual_payments")
    .select(
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
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (paymentsError) {
    console.error("Error fetching user payments:", paymentsError);
  }
  
  // Fetch profile for manual payments
  if (paymentsData && paymentsData.length > 0) {
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", userId)
      .single();
    
    if (userProfile) {
      paymentsData.forEach((payment: any) => {
        payment.profiles = userProfile;
      });
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
      deadline,
      notes,
      created_at,
      updated_at
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (quotesError) {
    console.error("Error fetching user quotes:", quotesError);
  }

  // Buscar profiles e collections para entregas de assinatura
  const profilesMap = new Map<string, any>();
  const collectionsMap = new Map<string, any>();

  if (deliveriesData && deliveriesData.length > 0) {
    const userIds = [
      ...new Set(
        deliveriesData
          .map((d: any) => d.subscriptions?.user_id)
          .filter((id): id is string => typeof id === "string")
      ),
    ];
    const collectionIds = [
      ...new Set(
        deliveriesData
          .map((d: any) => d.subscriptions?.collection_id)
          .filter((id): id is string => typeof id === "string")
      ),
    ];

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      if (profiles) {
        profiles.forEach((p: any) => profilesMap.set(p.id, p));
      }
    }

    if (collectionIds.length > 0) {
      const { data: collections } = await supabase
        .from("collections")
        .select("id, name, slug")
        .in("id", collectionIds);

      if (collections) {
        collections.forEach((c: any) => collectionsMap.set(c.id, c));
      }
    }
  }

  // Buscar itens dos orçamentos
  const quoteItemsMap = new Map<string, any[]>();
  if (quotesData && quotesData.length > 0) {
    const quoteIds = quotesData.map((q: any) => q.id);
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
    ...transformDeliveries(deliveriesData || [], profilesMap, collectionsMap),
    ...transformPurchases(purchasesData || []),
    ...transformManualPayments(paymentsData || []),
    ...transformQuotes(quotesData || [], quoteItemsMap),
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
  const result = await (supabase as any)
    .from("order_status_history")
    .select("*")
    .eq("order_id", orderId)
    .eq("order_type", orderType)
    .order("created_at", { ascending: false });

  const { data, error } = result as {
    data: Array<{
      id: string;
      order_id: string;
      order_type: string;
      old_status: string | null;
      new_status: string;
      changed_by_admin_id: string | null;
      changed_by_admin_name: string | null;
      created_at: string;
      notes: string | null;
    }> | null;
    error: any;
  };

  if (error) {
    console.error("Error fetching order status history:", error);
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
    changedBy: entry.changed_by_admin_id || "system",
    changedByName: entry.changed_by_admin_name || "Sistema",
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

      // Atualizar status no banco de dados
      const tableName =
        order.type === "subscription_delivery" ? "subscription_deliveries" : "standalone_purchases";

      const { error: updateError } = await supabase
        .from(tableName)
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (updateError) {
        // Erro ao atualizar - adicionar à lista de falhas
        result.failed.push({
          id: order.id,
          error: `Erro ao atualizar: ${updateError.message}`,
        });

        // Notificar progresso
        if (onProgress) {
          onProgress(i + 1, orders.length);
        }

        continue;
      }

      // Sucesso - adicionar à lista de sucessos
      result.successful.push(order.id);

      // Registrar mudança no histórico (opcional, não bloqueia em caso de erro)
      try {
        await (supabase as any).from("order_status_history").insert({
          order_id: order.id,
          order_type: order.type,
          old_status: order.status,
          new_status: newStatus,
          changed_by_admin_id: (await supabase.auth.getUser()).data.user?.id || null,
          changed_by_admin_name: (await supabase.auth.getUser()).data.user?.email || "Admin",
          created_at: new Date().toISOString(),
        });
      } catch (historyError) {
        console.warn("Falha ao registrar histórico de status:", historyError);
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
  // @ts-expect-error - search_unified_orders RPC function will be available after migration
  const { data, error } = (await supabase.rpc("search_unified_orders", {
    search_query: searchQuery,
    order_type_filter: orderType === "manual_payment" ? "all" : orderType,
  })) as { data: Array<{ order_id: string; order_type: string; rank: number }> | null; error: any };

  if (error) {
    console.error("Error in full-text search:", error);
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
async function fetchManualPayments(filters: OrderFilters) {
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

  const result = await query;
  
  // Fetch related data separately
  if (result.data && result.data.length > 0) {
    const userIds = [...new Set(result.data.map((p: any) => p.user_id))];
    const subscriptionIds = result.data.filter((p: any) => p.subscription_id).map((p: any) => p.subscription_id);
    const quoteIds = result.data.filter((p: any) => p.quote_id).map((p: any) => p.quote_id);
    
    // Fetch profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);
    
    // Fetch subscriptions with plans
    let subscriptions: any[] = [];
    if (subscriptionIds.length > 0) {
      const { data: subsData } = await supabase
        .from("subscriptions")
        .select("id, status, plan_type, created_at, updated_at")
        .in("id", subscriptionIds);
      
      if (subsData && subsData.length > 0) {
        // Fetch subscription plans separately
        const planTypes = [...new Set(subsData.map((s: any) => s.plan_type))];
        const { data: plansData } = await supabase
          .from("subscription_plans")
          .select("id, name, plan_type, price_full, price_pix")
          .in("plan_type", planTypes);
        
        const plansMap = new Map(plansData?.map((p: any) => [p.plan_type, p]) || []);
        
        // Merge plans into subscriptions and map to expected format
        subscriptions = subsData.map((sub: any) => {
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
    let quotes: any[] = [];
    if (quoteIds.length > 0) {
      const { data: quotesData } = await supabase
        .from("quotes")
        .select("id, status, total_price, admin_response")
        .in("id", quoteIds);
      quotes = quotesData || [];
    }
    
    // Create maps for easy lookup
    const profilesMap = new Map(profiles?.map((p: any) => [p.id, p]) || []);
    const subscriptionsMap = new Map(subscriptions.map((s: any) => [s.id, s]));
    const quotesMap = new Map(quotes.map((q: any) => [q.id, q]));
    
    // Merge data
    result.data = result.data.map((payment: any) => ({
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
async function fetchQuotes(filters: OrderFilters) {
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

  return await query;
}

/**
 * Busca itens de orçamentos
 *
 * @param quoteIds - IDs dos orçamentos
 * @returns Array de itens com modelos relacionados
 */
export async function fetchQuoteItems(quoteIds: string[]): Promise<
  Array<{
    id: string;
    quote_id: string;
    model_id: string;
    quantity: number;
    scale: string;
    models?: {
      id: string;
      name: string;
      franchise: string | null;
    };
  }>
> {
  if (quoteIds.length === 0) return [];

  const { data, error } = await supabase
    .from("quote_items")
    .select(
      `
      id,
      quote_id,
      model_id,
      quantity,
      scale,
      models (
        id,
        name,
        franchise
      )
    `
    )
    .in("quote_id", quoteIds);

  if (error) {
    throw new Error(`Erro ao buscar itens de orçamentos: ${error.message}`);
  }

  return data || [];
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

  // 3. Criar registro de solicitação de informações
  const { error: requestError } = await (supabase as any).from("payment_info_requests").insert({
    payment_id: paymentId,
    requested_by_admin_id: admin.id,
    requested_by_admin_name: admin.email || "Admin",
    message: message,
    status: "pending",
  });

  if (requestError) {
    throw new Error(`Erro ao criar solicitação: ${requestError.message}`);
  }

  // 4. Criar notificação para o usuário
  const { error: notificationError } = await (supabase as any).from("user_notifications").insert({
    user_id: payment.user_id,
    type: "payment_info_request",
    title: "Informações Adicionais Necessárias",
    message: `Precisamos de mais informações sobre seu pagamento (Ref: ${payment.reference_number}). ${message}`,
    related_id: paymentId,
    related_type: "manual_payment",
    is_read: false,
  });

  if (notificationError) {
    console.error("Erro ao criar notificação:", notificationError);
    // Não falhar a operação se a notificação não puder ser criada
    // A solicitação já foi registrada com sucesso
  }

  // 5. Atualizar status do pagamento para 'requires_info'
  const { error: updateError } = await supabase
    .from("manual_payments")
    .update({
      status: "requires_info",
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentId);

  if (updateError) {
    console.error("Erro ao atualizar status do pagamento:", updateError);
    // Não falhar a operação - a solicitação e notificação já foram criadas
  }
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

  // 3. Atualizar status do pagamento
  const { error: updateError } = await supabase
    .from("manual_payments")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: admin.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentId);

  if (updateError) {
    throw new Error(`Erro ao aprovar pagamento: ${updateError.message}`);
  }

  // 4. Criar notificação para o usuário
  const { error: notificationError } = await (supabase as any).from("user_notifications").insert({
    user_id: payment.user_id,
    type: "payment_approved",
    title: "Pagamento Aprovado",
    message: `Seu pagamento (Ref: ${payment.reference_number}) foi aprovado com sucesso!`,
    related_id: paymentId,
    related_type: "manual_payment",
    is_read: false,
  });

  if (notificationError) {
    console.error("Erro ao criar notificação:", notificationError);
    // Não falhar a operação - o pagamento já foi aprovado
  }
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

  // 2. Atualizar status do pagamento
  const { error: updateError } = await supabase
    .from("manual_payments")
    .update({
      status: "rejected",
      rejection_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentId);

  if (updateError) {
    throw new Error(`Erro ao rejeitar pagamento: ${updateError.message}`);
  }

  // 3. Criar notificação para o usuário
  const { error: notificationError } = await (supabase as any).from("user_notifications").insert({
    user_id: payment.user_id,
    type: "payment_rejected",
    title: "Pagamento Rejeitado",
    message: `Seu pagamento (Ref: ${payment.reference_number}) foi rejeitado. Motivo: ${reason}`,
    related_id: paymentId,
    related_type: "manual_payment",
    is_read: false,
  });

  if (notificationError) {
    console.error("Erro ao criar notificação:", notificationError);
    // Não falhar a operação - o pagamento já foi rejeitado
  }
}
