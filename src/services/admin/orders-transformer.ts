/**
 * Transformadores de Dados para Pedidos Unificados
 * 
 * Este módulo contém funções para transformar dados brutos do Supabase
 * em objetos UnifiedOrder padronizados.
 */

import type { UnifiedOrder } from '@/types/admin/orders';

// ============================================================================
// Tipos para Dados Brutos do Supabase
// ============================================================================

interface RawSubscriptionDelivery {
  id: string;
  status: string;
  delivery_number: number;
  tracking_code: string | null;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  reveal_date: string | null;
  created_at: string | null;
  updated_at: string | null;
  subscription_id: string;
  character_id: string | null;
  subscriptions: {
    id: string;
    user_id: string;
    collection_id: string | null;
    plan_type: string;
    deliveries_completed: number;
    deliveries_total: number;
    status: string;
  } | null;
  collection_characters?: {
    id: string;
    name: string;
    image_url: string | null;
  } | null;
}

interface RawStandalonePurchase {
  id: string;
  status: string;
  user_id: string;
  collection_id: string;
  cycle_id: string;
  character_id: string | null;
  price_deposit: number;
  price_balance: number;
  price_full: number;
  deposit_paid_at: string | null;
  balance_paid_at: string | null;
  balance_due_date: string | null;
  deposit_voucher_url: string | null;
  balance_voucher_url: string | null;
  tracking_code: string | null;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  created_at: string | null;
  updated_at: string | null;
  profiles: {
    id: string;
    full_name: string | null;
    email: string | null;
  };
  collections: {
    id: string;
    name: string;
    slug: string;
  };
  cycles?: {
    id: string;
    cycle_number: number;
    month: number;
    year: number;
  } | null;
  collection_characters?: {
    id: string;
    name: string;
    image_url: string | null;
  } | null;
}

// ============================================================================
// Função: Transformar Entregas de Assinatura
// ============================================================================

/**
 * Transforma entregas de assinatura brutas em UnifiedOrder
 * 
 * Os dados de profile e collection são buscados separadamente e passados via maps
 * para evitar joins aninhados que o Supabase PostgREST não suporta.
 * 
 * @param deliveries - Array de entregas brutas do Supabase
 * @param profilesMap - Map de profiles por ID
 * @param collectionsMap - Map de collections por ID
 * @returns Array de UnifiedOrder
 */
export function transformDeliveries(
  deliveries: RawSubscriptionDelivery[],
  profilesMap: Map<string, any>,
  collectionsMap: Map<string, any>
): UnifiedOrder[] {
  return deliveries
    .filter(delivery => delivery.subscriptions !== null) // Filtrar entregas sem subscription
    .map(delivery => {
      const subscription = delivery.subscriptions!; // Garantido pelo filter acima
      
      // Buscar profile e collection dos maps
      const profile = profilesMap.get(subscription.user_id);
      const collection = subscription.collection_id ? collectionsMap.get(subscription.collection_id) : null;

      // Construir objeto UnifiedOrder
      const unifiedOrder: UnifiedOrder = {
        id: delivery.id,
        type: 'subscription_delivery',
        status: delivery.status as any,
        createdAt: delivery.created_at || new Date().toISOString(),
        updatedAt: delivery.updated_at || new Date().toISOString(),

        // Dados do cliente
        customer: {
          id: subscription.user_id,
          name: profile?.full_name || 'Nome não disponível',
          email: profile?.email || 'Email não disponível'
        },

        // Dados da coleção
        collection: {
          id: subscription.collection_id || '',
          name: collection?.name || 'Coleção não disponível',
          slug: collection?.slug || ''
        },

        // Dados financeiros (para entregas de assinatura, o valor vem do plano)
        amount: calculateSubscriptionDeliveryAmount(subscription.plan_type),

        // Dados de entrega
        trackingCode: delivery.tracking_code,
        expectedDeliveryDate: delivery.expected_delivery_date,
        actualDeliveryDate: delivery.actual_delivery_date,

        // Dados específicos de entrega de assinatura
        subscriptionDelivery: {
          subscriptionId: delivery.subscription_id,
          deliveryNumber: delivery.delivery_number,
          cycleId: null, // Entregas de assinatura não têm ciclo direto
          characterId: delivery.character_id,
          revealDate: delivery.reveal_date,

          subscription: {
            id: subscription.id,
            planType: subscription.plan_type,
            deliveriesCompleted: subscription.deliveries_completed,
            deliveriesTotal: subscription.deliveries_total,
            status: subscription.status
          },

          character: delivery.collection_characters ? {
            id: delivery.collection_characters.id,
            name: delivery.collection_characters.name,
            imageUrl: delivery.collection_characters.image_url
          } : undefined
        }
      };

      return unifiedOrder;
    });
}

// ============================================================================
// Função: Transformar Compras Avulsas
// ============================================================================

/**
 * Transforma compras avulsas brutas em UnifiedOrder
 * 
 * Os dados de profile agora vêm diretamente da query via join,
 * eliminando a necessidade de um array separado de profiles.
 * 
 * @param purchases - Array de compras brutas do Supabase (com profiles aninhados)
 * @returns Array de UnifiedOrder
 */
export function transformPurchases(
  purchases: RawStandalonePurchase[]
): UnifiedOrder[] {
  return purchases.map(purchase => {
    // Profile agora vem diretamente do join
    const profile = purchase.profiles;

    // Construir objeto UnifiedOrder
    const unifiedOrder: UnifiedOrder = {
      id: purchase.id,
      type: 'standalone_purchase',
      status: purchase.status as any,
      createdAt: purchase.created_at || new Date().toISOString(),
      updatedAt: purchase.updated_at || new Date().toISOString(),

      // Dados do cliente (agora do join)
      customer: {
        id: purchase.user_id,
        name: profile?.full_name || 'Nome não disponível',
        email: profile?.email || 'Email não disponível'
      },

      // Dados da coleção
      collection: {
        id: purchase.collection_id,
        name: purchase.collections.name,
        slug: purchase.collections.slug
      },

      // Dados financeiros
      amount: purchase.price_full,

      // Dados de entrega
      trackingCode: purchase.tracking_code,
      expectedDeliveryDate: purchase.expected_delivery_date,
      actualDeliveryDate: purchase.actual_delivery_date,

      // Dados específicos de compra avulsa
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

        cycle: purchase.cycles ? {
          id: purchase.cycles.id,
          cycleNumber: purchase.cycles.cycle_number,
          month: purchase.cycles.month,
          year: purchase.cycles.year
        } : undefined,

        character: purchase.collection_characters ? {
          id: purchase.collection_characters.id,
          name: purchase.collection_characters.name,
          imageUrl: purchase.collection_characters.image_url
        } : undefined
      }
    };

    return unifiedOrder;
  });
}

// ============================================================================
// Funções Auxiliares
// ============================================================================

/**
 * Calcula o valor de uma entrega de assinatura baseado no tipo de plano
 * 
 * Nota: Esta é uma implementação simplificada. Em produção, você deve
 * buscar o valor real do plano da tabela de preços.
 */
function calculateSubscriptionDeliveryAmount(planType: string): number {
  // Mapeamento básico de planos para valores
  // TODO: Buscar valores reais da tabela de preços
  const planPrices: Record<string, number> = {
    'monthly': 99.90,
    'quarterly': 89.90,
    'semiannual': 79.90,
    'annual': 69.90
  };

  return planPrices[planType] || 0;
}

/**
 * Valida se os dados brutos estão completos
 * 
 * Útil para debugging e garantir integridade dos dados
 */
export function validateRawDelivery(delivery: any): delivery is RawSubscriptionDelivery {
  return (
    delivery &&
    typeof delivery.id === 'string' &&
    typeof delivery.status === 'string' &&
    typeof delivery.delivery_number === 'number' &&
    delivery.subscriptions &&
    typeof delivery.subscriptions.user_id === 'string' &&
    typeof delivery.subscriptions.collection_id === 'string'
  );
}

/**
 * Valida se os dados brutos de compra estão completos
 */
export function validateRawPurchase(purchase: any): purchase is RawStandalonePurchase {
  return (
    purchase &&
    typeof purchase.id === 'string' &&
    typeof purchase.status === 'string' &&
    typeof purchase.user_id === 'string' &&
    typeof purchase.collection_id === 'string' &&
    typeof purchase.price_full === 'number' &&
    purchase.profiles &&
    typeof purchase.profiles.id === 'string' &&
    purchase.collections &&
    typeof purchase.collections.name === 'string'
  );
}

/**
 * Filtra dados inválidos antes de transformar
 * 
 * Remove registros com dados incompletos ou corrompidos
 */
export function filterValidDeliveries(deliveries: any[]): RawSubscriptionDelivery[] {
  return deliveries.filter(validateRawDelivery);
}

/**
 * Filtra compras inválidas antes de transformar
 */
export function filterValidPurchases(purchases: any[]): RawStandalonePurchase[] {
  return purchases.filter(validateRawPurchase);
}

/**
 * Transforma com tratamento de erros
 * 
 * Versão segura que não falha se houver dados inválidos
 */
export function safeTransformDeliveries(
  deliveries: any[],
  profilesMap: Map<string, any>,
  collectionsMap: Map<string, any>
): UnifiedOrder[] {
  try {
    const validDeliveries = filterValidDeliveries(deliveries);
    return transformDeliveries(validDeliveries, profilesMap, collectionsMap);
  } catch (error) {
    console.error('Erro ao transformar entregas:', error);
    return [];
  }
}

/**
 * Transforma compras com tratamento de erros
 */
export function safeTransformPurchases(
  purchases: any[]
): UnifiedOrder[] {
  try {
    const validPurchases = filterValidPurchases(purchases);
    return transformPurchases(validPurchases);
  } catch (error) {
    console.error('Erro ao transformar compras:', error);
    return [];
  }
}


// ============================================================================
// Função: Transformar Pagamentos Manuais
// ============================================================================

/**
 * Transforma pagamentos manuais brutos em UnifiedOrder
 * 
 * @param payments - Array de pagamentos brutos do Supabase
 * @param filesMap - Map opcional de arquivos por payment_id (para incluir comprovantes)
 * @returns Array de UnifiedOrder
 */
export function transformManualPayments(
  payments: any[],
  filesMap?: Map<string, Array<{
    id: string;
    fileName: string;
    filePath: string;
    fileSize: number;
    fileType: string;
    thumbnailPath: string | null;
    uploadedBy: string;
    createdAt: string;
  }>>
): UnifiedOrder[] {
  return payments.map(payment => {
    // Profile vem diretamente do join
    const profile = payment.profiles;
    const paymentMethod = payment.admin_payment_methods;

    // Buscar arquivos do map (se fornecido)
    const files = filesMap?.get(payment.id) || [];

    // Construir objeto UnifiedOrder
    const unifiedOrder: UnifiedOrder = {
      id: payment.id,
      type: 'manual_payment',
      status: payment.status as any,
      createdAt: payment.created_at || new Date().toISOString(),
      updatedAt: payment.updated_at || new Date().toISOString(),

      // Dados do cliente
      customer: {
        id: payment.user_id,
        name: profile?.full_name || 'Nome não disponível',
        email: profile?.email || 'Email não disponível'
      },

      // Pagamentos manuais não têm coleção diretamente
      collection: null,

      // Dados financeiros
      amount: payment.amount,

      // Pagamentos manuais não têm dados de entrega
      trackingCode: null,
      expectedDeliveryDate: null,
      actualDeliveryDate: null,

      // Dados específicos de pagamento manual
      manualPayment: {
        paymentId: payment.id,
        referenceNumber: payment.reference_number,
        paymentMethodId: payment.payment_method_id,
        paymentMethodName: paymentMethod?.name || 'Método não disponível',
        paymentType: payment.payment_type,
        currency: payment.currency || 'BRL',
        linkedTo: payment.quote_id ? {
          type: 'quote',
          id: payment.quote_id
        } : payment.subscription_id ? {
          type: 'subscription',
          id: payment.subscription_id
        } : null,
        rejectionReason: payment.rejection_reason,
        approvedAt: payment.approved_at,
        approvedBy: payment.approved_by,
        approvedByName: null, // Será carregado separadamente se necessário
        files: files, // Arquivos de comprovante
        paymentMethod: paymentMethod ? {
          id: paymentMethod.id,
          name: paymentMethod.name,
          type: paymentMethod.type,
          instructions: paymentMethod.instructions,
          pixKey: paymentMethod.pix_key,
          paymentLink: paymentMethod.payment_link
        } : undefined
      }
    };

    return unifiedOrder;
  });
}


// ============================================================================
// Função: Transformar Orçamentos
// ============================================================================

/**
 * Transforma orçamentos brutos em UnifiedOrder
 * 
 * @param quotes - Array de orçamentos brutos do Supabase
 * @param itemsMap - Map de itens por quote_id
 * @returns Array de UnifiedOrder
 */
export function transformQuotes(
  quotes: any[],
  itemsMap: Map<string, any[]>
): UnifiedOrder[] {
  return quotes.map(quote => {
    const profile = quote.profiles;
    const items = itemsMap.get(quote.id) || [];

    const unifiedOrder: UnifiedOrder = {
      id: quote.id,
      type: 'quote',
      status: quote.status as any,
      createdAt: quote.created_at || new Date().toISOString(),
      updatedAt: quote.updated_at || new Date().toISOString(),

      // Dados do cliente
      customer: {
        id: quote.user_id,
        name: profile?.full_name || 'Nome não disponível',
        email: profile?.email || 'Email não disponível'
      },

      // Orçamentos não têm coleção específica
      collection: null,

      // Orçamentos não têm valor definido até serem respondidos
      amount: 0,

      // Orçamentos não têm dados de entrega
      trackingCode: null,
      expectedDeliveryDate: null,
      actualDeliveryDate: null,

      // Dados específicos de orçamento
      quote: {
        quoteId: quote.id,
        items: items.map(item => ({
          id: item.id,
          modelId: item.model_id,
          modelName: item.models?.name || 'Modelo não disponível',
          franchise: item.models?.franchise || null,
          quantity: item.quantity,
          scale: item.scale
        })),
        deadline: quote.deadline,
        notes: quote.notes
      }
    };

    return unifiedOrder;
  });
}
