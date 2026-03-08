/**
 * Transformadores de Dados para Pedidos Unificados
 * Corrigido para usar schema real do banco de dados
 */

import type { UnifiedOrder } from "@/types/admin/orders";

// ============================================================================
// Transformar Entregas de Assinatura
// ============================================================================

export function transformDeliveries(
  deliveries: any[],
  profilesMap: Map<string, any>,
  collectionsMap: Map<string, any>
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

export function transformPurchases(purchases: any[]): UnifiedOrder[] {
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
        cycleId: null,
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
  payments: any[],
  profilesMap?: Map<string, any>,
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
  quotes: any[], 
  itemsMap: Map<string, any[]>,
  profilesMap?: Map<string, any>
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
