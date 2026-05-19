/**
 * Transformadores de Dados para Pedidos Unificados
 * Corrigido para usar schema real do banco de dados
 */

import type { OrderStatus, QuoteItem, UnifiedOrder } from "@/types/admin/orders";

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

// ============================================================================
// Transformar Entregas de Assinatura
// ============================================================================

export function transformDeliveries(
  deliveries: DeliveryRow[],
  profilesMap: Map<string, ProfileSummary>,
  collectionsMap: Map<string, CollectionSummary>
): UnifiedOrder[] {
  return deliveries
    .filter((delivery) => delivery.subscriptions !== null)
    .map((delivery) => {
      const subscription = delivery.subscriptions!;
      const profile = profilesMap.get(subscription.user_id);

      // Try to find collection from collectionsMap
      const collectionFromMap = collectionsMap.values().next().value;

      return {
        id: delivery.id,
        type: "subscription_delivery" as const,
        status: delivery.status,
        createdAt: delivery.created_at || new Date().toISOString(),
        updatedAt: delivery.updated_at || new Date().toISOString(),

        customer: {
          id: subscription.user_id,
          name: profile?.full_name || "Nome não disponível",
          email: profile?.email || "Email não disponível",
        },

        collection: collectionFromMap ? {
          id: collectionFromMap.id || "",
          name: collectionFromMap.name || "Coleção não disponível",
          slug: collectionFromMap.slug || "",
        } : null,

        amount: 0,
        trackingCode: delivery.tracking_code,
        expectedDeliveryDate: null,
        actualDeliveryDate: delivery.actual_delivery_date || delivery.delivered_date,

        subscriptionDelivery: {
          subscriptionId: delivery.subscription_id,
          deliveryNumber: delivery.delivery_number || delivery.delivery_order || 1,
          cycleId: delivery.cycle_id || null,
          characterId: delivery.character_id,
          revealDate: delivery.reveal_date,

          subscription: {
            id: subscription.id,
            planType: subscription.plan_type,
            deliveriesCompleted: subscription.deliveries_completed,
            deliveriesTotal: subscription.deliveries_total,
            status: subscription.status,
          },

          character: delivery.collection_characters
            ? {
                id: delivery.collection_characters.id,
                name: delivery.collection_characters.name,
                imageUrl: delivery.collection_characters.image_url,
              }
            : undefined,
        },
      };
    });
}

// ============================================================================
// Transformar Compras Avulsas
// ============================================================================

export function transformPurchases(purchases: PurchaseRow[]): UnifiedOrder[] {
  return purchases.map((purchase) => {
    const profile = purchase.profiles || {};
    const collection = purchase.collections;

    return {
      id: purchase.id,
      type: "standalone_purchase" as const,
      status: purchase.status,
      createdAt: purchase.created_at || new Date().toISOString(),
      updatedAt: purchase.updated_at || new Date().toISOString(),

      customer: {
        id: purchase.user_id,
        name: profile?.full_name || "Nome não disponível",
        email: profile?.email || "Email não disponível",
      },

      collection: collection ? {
        id: collection.id,
        name: collection.name,
        slug: collection.slug,
      } : null,

      amount: purchase.amount || 0,
      trackingCode: purchase.tracking_code,
      expectedDeliveryDate: null,
      actualDeliveryDate: null,

      standalonePurchase: {
        cycleId: "",
        characterId: purchase.character_id,
        priceDeposit: 0,
        priceBalance: purchase.balance_amount || 0,
        priceFull: purchase.amount || 0,
        depositPaidAt: null,
        balancePaidAt: purchase.paid_amount > 0 ? purchase.updated_at : null,
        balanceDueDate: null,
        depositVoucherUrl: null,
        balanceVoucherUrl: null,

        character: purchase.collection_characters
          ? {
              id: purchase.collection_characters.id,
              name: purchase.collection_characters.name,
              imageUrl: purchase.collection_characters.image_url,
            }
          : undefined,
      },
    };
  });
}

// ============================================================================
// Transformar Pagamentos Manuais
// ============================================================================

export function transformManualPayments(
  payments: ManualPaymentRow[],
  profilesMap?: Map<string, ProfileSummary>,
): UnifiedOrder[] {
  return payments.map((payment) => {
    const profile = profilesMap?.get(payment.user_id) || payment.profiles;

    return {
      id: payment.id,
      type: "manual_payment" as const,
      status: payment.status,
      createdAt: payment.created_at || new Date().toISOString(),
      updatedAt: payment.created_at || new Date().toISOString(),

      customer: {
        id: payment.user_id,
        name: profile?.full_name || "Nome não disponível",
        email: profile?.email || "Email não disponível",
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
        referenceType: payment.reference_type,
        notes: payment.notes,
        confirmedAt: payment.confirmed_at,
        confirmedBy: payment.confirmed_by,
      },
    };
  });
}

// ============================================================================
// Transformar Orçamentos
// ============================================================================

export function transformQuotes(
  quotes: QuoteRow[],
  itemsMap: Map<string, QuoteItem[]>,
  profilesMap?: Map<string, ProfileSummary>
): UnifiedOrder[] {
  return quotes.map((quote) => {
    const profile = profilesMap?.get(quote.user_id) || quote.profiles;
    const items = itemsMap.get(quote.id) || [];

    return {
      id: quote.id,
      type: "quote" as const,
      status: quote.status,
      createdAt: quote.created_at || new Date().toISOString(),
      updatedAt: quote.updated_at || new Date().toISOString(),

      customer: {
        id: quote.user_id,
        name: profile?.full_name || "Nome não disponível",
        email: profile?.email || "Email não disponível",
      },

      collection: null,
      amount: quote.total_amount || 0,
      trackingCode: null,
      expectedDeliveryDate: null,
      actualDeliveryDate: null,

      quote: {
        items: items,
        totalAmount: quote.total_amount,
        notes: quote.notes,
      },
    };
  });
}
