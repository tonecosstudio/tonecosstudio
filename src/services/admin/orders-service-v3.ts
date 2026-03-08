/**
 * Orders Service V3 - Arquitetura Corrigida
 * 
 * Correção fundamental: Assinaturas são tratadas como UM pedido,
 * não como múltiplos pedidos (um por entrega).
 * 
 * Estrutura:
 * - Subscription = 1 pedido com N entregas
 * - Standalone Purchase = 1 pedido
 * - Manual Payment = 1 transação
 * - Quote = 1 orçamento
 */

// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import type { OrderFilters, PaginationParams, UnifiedOrder } from "@/types/admin/orders";

const DEBUG = true;

// ============================================================================
// Tipos Internos
// ============================================================================

interface SubscriptionWithDeliveries {
  id: string;
  user_id: string;
  collection_id: string;
  plan_type: string;
  status: string;
  total_paid: number;
  deliveries_total: number;
  deliveries_completed: number;
  created_at: string;
  updated_at: string;
  deliveries: Array<{
    id: string;
    delivery_number: number;
    status: string;
    character_id: string | null;
    expected_delivery_date: string | null;
    actual_delivery_date: string | null;
    tracking_code: string | null;
    reveal_date: string | null;
  }>;
}

// ============================================================================
// Função Principal
// ============================================================================

export async function fetchAllOrders(
  filters: OrderFilters,
  pagination: PaginationParams
): Promise<{ orders: UnifiedOrder[]; total: number }> {
  if (DEBUG) {
    console.log('🔍 [OrdersV3] Fetching orders with filters:', filters);
    console.log('📄 [OrdersV3] Pagination:', pagination);
  }

  try {
    const promises = [];

    // Buscar assinaturas (agrupadas, não por entrega)
    if (filters.type === "all" || filters.type === "subscription_delivery") {
      promises.push(fetchSubscriptions(filters));
    } else {
      promises.push(Promise.resolve({ data: [], error: null }));
    }

    // Buscar compras standalone
    if (filters.type === "all" || filters.type === "standalone_purchase") {
      promises.push(fetchStandalonePurchases(filters));
    } else {
      promises.push(Promise.resolve({ data: [], error: null }));
    }

    // Buscar pagamentos manuais
    if (filters.type === "all" || filters.type === "manual_payment") {
      promises.push(fetchManualPayments(filters));
    } else {
      promises.push(Promise.resolve({ data: [], error: null }));
    }

    // Buscar orçamentos
    if (filters.type === "all" || filters.type === "quote") {
      promises.push(fetchQuotes(filters));
    } else {
      promises.push(Promise.resolve({ data: [], error: null }));
    }

    const [subscriptionsResult, purchasesResult, paymentsResult, quotesResult] = 
      await Promise.all(promises);

    if (DEBUG) {
      console.log('📊 [OrdersV3] Results:', {
        subscriptions: subscriptionsResult.data?.length || 0,
        purchases: purchasesResult.data?.length || 0,
        payments: paymentsResult.data?.length || 0,
        quotes: quotesResult.data?.length || 0,
      });
    }

    // Processar resultados
    const subscriptions = subscriptionsResult.data || [];
    const purchases = purchasesResult.data || [];
    const payments = paymentsResult.data || [];
    const quotes = quotesResult.data || [];

    if (DEBUG) {
      console.log('📊 [OrdersV3] Subscriptions:', subscriptions.length);
      console.log('📊 [OrdersV3] Purchases:', purchases.length);
      console.log('📊 [OrdersV3] Payments:', payments.length);
      console.log('📊 [OrdersV3] Quotes:', quotes.length);
    }

    // Buscar dados relacionados
    const { profilesMap, collectionsMap } = await fetchRelatedData(
      subscriptions,
      purchases,
      payments,
      quotes
    );

    // Transformar em UnifiedOrder
    const unifiedOrders: UnifiedOrder[] = [];

    // Transformar assinaturas (1 assinatura = 1 pedido)
    if (DEBUG) console.log('🔄 [OrdersV3] Transforming subscriptions...');
    subscriptions.forEach(sub => {
      try {
        unifiedOrders.push(transformSubscription(sub, profilesMap, collectionsMap));
      } catch (error) {
        console.error('❌ [OrdersV3] Error transforming subscription:', sub.id, error);
      }
    });

    // Transformar compras standalone
    if (DEBUG) console.log('🔄 [OrdersV3] Transforming purchases...');
    purchases.forEach(purchase => {
      try {
        unifiedOrders.push(transformPurchase(purchase));
      } catch (error) {
        console.error('❌ [OrdersV3] Error transforming purchase:', purchase.id, error);
      }
    });

    // Transformar pagamentos manuais
    if (DEBUG) console.log('🔄 [OrdersV3] Transforming payments...');
    payments.forEach(payment => {
      try {
        unifiedOrders.push(transformPayment(payment, profilesMap));
      } catch (error) {
        console.error('❌ [OrdersV3] Error transforming payment:', payment.id, error);
      }
    });

    // Transformar orçamentos
    if (DEBUG) console.log('🔄 [OrdersV3] Transforming quotes...');
    quotes.forEach(quote => {
      try {
        unifiedOrders.push(transformQuote(quote, profilesMap, collectionsMap));
      } catch (error) {
        console.error('❌ [OrdersV3] Error transforming quote:', quote.id, error);
      }
    });

    // Ordenar por data de criação (mais recente primeiro)
    unifiedOrders.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Aplicar paginação
    const start = (pagination.page - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    const paginatedOrders = unifiedOrders.slice(start, end);

    if (DEBUG) {
      console.log('✅ [OrdersV3] Total unified orders:', unifiedOrders.length);
      console.log('📄 [OrdersV3] Paginated orders:', paginatedOrders.length);
    }

    return {
      orders: paginatedOrders,
      total: unifiedOrders.length
    };

  } catch (error) {
    console.error('❌ [OrdersV3] Error fetching orders:', error);
    throw error;
  }
}

// ============================================================================
// Funções de Busca
// ============================================================================

async function fetchSubscriptions(filters: OrderFilters) {
  // Buscar assinaturas
  let query = supabase
    .from('subscriptions')
    .select('*');

  // Aplicar filtros de status se houver
  if (filters.status.length > 0) {
    query = query.in('status', filters.status);
  }

  // Aplicar filtro de tipo de plano se houver
  if (filters.planType) {
    query = query.eq('plan_type', filters.planType);
  }

  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo);
  }

  const { data: subscriptions, error: subError } = await query;

  if (subError) {
    console.error('❌ [OrdersV3] Error fetching subscriptions:', subError);
    return { data: [], error: subError };
  }

  if (!subscriptions || subscriptions.length === 0) {
    console.log('⚠️ [OrdersV3] No subscriptions found');
    return { data: [], error: null };
  }

  console.log('📊 [OrdersV3] Subscriptions found:', subscriptions.length);

  // Buscar entregas para cada assinatura
  const subscriptionIds = subscriptions.map(s => s.id);
  
  const { data: deliveries, error: delError } = await supabase
    .from('subscription_deliveries')
    .select('*')
    .in('subscription_id', subscriptionIds);

  if (delError) {
    console.error('❌ [OrdersV3] Error fetching deliveries:', delError);
    return { data: [], error: delError };
  }

  console.log('📦 [OrdersV3] Deliveries found:', deliveries?.length || 0);

  // Agrupar entregas por assinatura
  const deliveriesBySubscription = new Map<string, any[]>();
  deliveries?.forEach(delivery => {
    const subId = delivery.subscription_id;
    if (!deliveriesBySubscription.has(subId)) {
      deliveriesBySubscription.set(subId, []);
    }
    deliveriesBySubscription.get(subId)!.push(delivery);
  });

  // Combinar assinaturas com suas entregas
  const subscriptionsWithDeliveries = subscriptions.map(sub => ({
    ...sub,
    deliveries: deliveriesBySubscription.get(sub.id) || []
  }));

  console.log('✅ [OrdersV3] Subscriptions with deliveries:', subscriptionsWithDeliveries.length);

  return { data: subscriptionsWithDeliveries, error: null };
}

async function fetchStandalonePurchases(filters: OrderFilters) {
  let query = supabase
    .from('standalone_purchases')
    .select(`
      *,
      profiles!inner(id, full_name, email),
      collections!inner(id, name, slug),
      collection_characters(id, name, image_url)
    `);

  if (filters.status.length > 0) {
    query = query.in('status', filters.status);
  }
  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo);
  }

  const { data: purchases, error } = await query;

  if (error) {
    return { data: null, error };
  }

  // SOLUÇÃO ALTERNATIVA: Se collection_characters não vier no join,
  // buscar personagens separadamente
  if (purchases) {
    for (const purchase of purchases) {
      // Se character_id existe mas collection_characters não veio
      if (purchase.character_id && !purchase.collection_characters) {
        const { data: character } = await supabase
          .from('collection_characters')
          .select('id, name, image_url')
          .eq('id', purchase.character_id)
          .single();
        
        if (character) {
          purchase.collection_characters = character;
        }
      }
    }
  }

  return { data: purchases, error: null };
}

async function fetchManualPayments(filters: OrderFilters) {
  let query = supabase
    .from('manual_payments')
    .select('*');

  if (filters.status.length > 0) {
    query = query.in('status', filters.status);
  }
  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo);
  }

  return await query;
}

async function fetchQuotes(filters: OrderFilters) {
  let query = supabase
    .from('quotes')
    .select('*');

  if (filters.status.length > 0) {
    query = query.in('status', filters.status);
  }
  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo);
  }

  return await query;
}

// ============================================================================
// Buscar Dados Relacionados
// ============================================================================

async function fetchRelatedData(
  subscriptions: any[],
  purchases: any[],
  payments: any[],
  quotes: any[]
) {
  const profilesMap = new Map();
  const collectionsMap = new Map();

  // Coletar IDs únicos
  const userIds = new Set<string>();
  const collectionIds = new Set<string>();

  subscriptions.forEach(sub => {
    userIds.add(sub.user_id);
    if (sub.collection_id) collectionIds.add(sub.collection_id);
  });

  payments.forEach(payment => {
    userIds.add(payment.user_id);
  });

  quotes.forEach(quote => {
    userIds.add(quote.user_id);
    if (quote.collection_id) collectionIds.add(quote.collection_id);
  });

  // Buscar profiles
  if (userIds.size > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', Array.from(userIds));

    profiles?.forEach(p => profilesMap.set(p.id, p));
  }

  // Buscar collections
  if (collectionIds.size > 0) {
    const { data: collections } = await supabase
      .from('collections')
      .select('id, name, slug')
      .in('id', Array.from(collectionIds));

    collections?.forEach(c => collectionsMap.set(c.id, c));
  }

  return { profilesMap, collectionsMap };
}

// ============================================================================
// Transformadores
// ============================================================================

function transformSubscription(
  subscription: SubscriptionWithDeliveries,
  profilesMap: Map<string, any>,
  collectionsMap: Map<string, any>
): UnifiedOrder {
  const profile = profilesMap.get(subscription.user_id);
  const collection = collectionsMap.get(subscription.collection_id);

  // Encontrar próxima entrega ou última entrega
  const sortedDeliveries = (subscription.deliveries || []).sort((a, b) => a.delivery_number - b.delivery_number);
  const nextDelivery = sortedDeliveries.find(d => d.status === 'scheduled') || sortedDeliveries[sortedDeliveries.length - 1] || null;

  return {
    id: subscription.id, // ID da assinatura, não da entrega
    type: 'subscription_delivery',
    status: subscription.status as any,
    createdAt: subscription.created_at,
    updatedAt: subscription.updated_at,

    customer: {
      id: subscription.user_id,
      name: profile?.full_name || 'Nome não disponível',
      email: profile?.email || 'Email não disponível',
    },

    collection: collection ? {
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
    } : null,

    amount: subscription.total_paid || 0,

    // Dados da próxima/última entrega
    trackingCode: nextDelivery?.tracking_code || null,
    expectedDeliveryDate: nextDelivery?.expected_delivery_date || null,
    actualDeliveryDate: nextDelivery?.actual_delivery_date || null,

    subscriptionDelivery: {
      subscriptionId: subscription.id,
      deliveryNumber: nextDelivery?.delivery_number || 1,
      cycleId: null,
      characterId: nextDelivery?.character_id || null,
      revealDate: nextDelivery?.reveal_date || null,

      subscription: {
        id: subscription.id,
        planType: subscription.plan_type,
        deliveriesCompleted: subscription.deliveries_completed || 0,
        deliveriesTotal: subscription.deliveries_total || 0,
        status: subscription.status,
      },

      character: undefined,
      
      // NOVO: Lista de todas as entregas
      allDeliveries: sortedDeliveries.map(d => ({
        id: d.id,
        deliveryNumber: d.delivery_number,
        status: d.status,
        characterId: d.character_id,
        expectedDeliveryDate: d.expected_delivery_date,
        actualDeliveryDate: d.actual_delivery_date,
        trackingCode: d.tracking_code,
        revealDate: d.reveal_date,
      }))
    },
  };
}

function transformPurchase(purchase: any): UnifiedOrder {
  // Mapear dados do personagem se existir
  const character = purchase.collection_characters ? {
    id: purchase.collection_characters.id,
    name: purchase.collection_characters.name,
    imageUrl: purchase.collection_characters.image_url,
  } : undefined;

  return {
    id: purchase.id,
    type: 'standalone_purchase',
    status: purchase.status,
    createdAt: purchase.created_at,
    updatedAt: purchase.updated_at,

    customer: {
      id: purchase.profiles.id,
      name: purchase.profiles.full_name || 'Nome não disponível',
      email: purchase.profiles.email || 'Email não disponível',
    },

    collection: {
      id: purchase.collections.id,
      name: purchase.collections.name,
      slug: purchase.collections.slug,
    },

    amount: purchase.price_full || 0,

    trackingCode: purchase.tracking_code,
    expectedDeliveryDate: purchase.expected_delivery_date,
    actualDeliveryDate: purchase.actual_delivery_date,

    standalonePurchase: {
      cycleId: purchase.cycle_id,
      characterId: purchase.character_id,
      priceDeposit: purchase.price_deposit,
      priceBalance: purchase.price_balance,
      priceFull: purchase.price_full,
      depositPaidAt: purchase.deposit_paid_at,
      balancePaidAt: purchase.balance_paid_at,
      balanceDueDate: purchase.balance_due_date,
      depositVoucherUrl: purchase.deposit_voucher_url,
      balanceVoucherUrl: purchase.balance_voucher_url,
      character: character,
    },
  };
}

function transformPayment(payment: any, profilesMap: Map<string, any>): UnifiedOrder {
  const profile = profilesMap.get(payment.user_id);

  return {
    id: payment.id,
    type: 'manual_payment',
    status: payment.status,
    createdAt: payment.created_at,
    updatedAt: payment.updated_at,

    customer: {
      id: payment.user_id,
      name: profile?.full_name || 'Nome não disponível',
      email: profile?.email || 'Email não disponível',
    },

    collection: null,
    amount: payment.amount || 0,

    trackingCode: null,
    expectedDeliveryDate: null,
    actualDeliveryDate: null,

    manualPayment: {
      paymentMethod: payment.payment_method,
      paymentDate: payment.payment_date,
      referenceId: payment.reference_id,
      notes: payment.notes,
      voucherUrl: payment.voucher_url,
    },
  };
}

function transformQuote(
  quote: any,
  profilesMap: Map<string, any>,
  collectionsMap: Map<string, any>
): UnifiedOrder {
  const profile = profilesMap.get(quote.user_id);
  const collection = collectionsMap.get(quote.collection_id);

  return {
    id: quote.id,
    type: 'quote',
    status: quote.status,
    createdAt: quote.created_at,
    updatedAt: quote.updated_at,

    customer: {
      id: quote.user_id,
      name: profile?.full_name || 'Nome não disponível',
      email: profile?.email || 'Email não disponível',
    },

    collection: collection ? {
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
    } : null,

    amount: quote.total_amount || 0,

    trackingCode: null,
    expectedDeliveryDate: null,
    actualDeliveryDate: null,

    quote: {
      items: quote.items || [],
      totalAmount: quote.total_amount,
      validUntil: quote.valid_until,
      notes: quote.notes,
    },
  };
}
