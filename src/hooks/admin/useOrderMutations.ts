/**
 * Hook de Mutações de Pedidos
 *
 * Este hook gerencia operações de modificação de pedidos (criar, atualizar, deletar)
 * com invalidação automática de cache.
 *
 * IMPORTANTE: O histórico de mudanças de status é registrado AUTOMATICAMENTE
 * pelos triggers do banco de dados (log_subscription_delivery_status_change e
 * log_standalone_purchase_status_change). Não é necessário inserir manualmente
 * na tabela order_status_history.
 *
 * Os triggers capturam:
 * - ID do pedido e tipo (subscription_delivery ou standalone_purchase)
 * - Status antigo e novo
 * - ID e nome do admin que fez a mudança (via auth.uid())
 * - Timestamp da mudança
 *
 * Ver migration: 20260424000000_create_order_status_history.sql
 * 
 * IMPORTANTE: Tipagem completa habilitada para garantir segurança de tipos.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ORDERS_QUERY_KEY } from "./useOrdersQuery";
import type { OrderStatus, BulkActionResult } from "@/types/admin/orders";

// ============================================================================
// Tipos
// ============================================================================

export interface UpdateOrderStatusParams {
  orderId: string;
  orderType: "subscription_delivery" | "standalone_purchase" | "manual_payment" | "quote";
  newStatus: OrderStatus;
  notes?: string;
}

export interface BulkUpdateStatusParams {
  orderIds: string[];
  orderType: "subscription_delivery" | "standalone_purchase" | "manual_payment" | "quote";
  newStatus: OrderStatus;
}

export interface UpdateTrackingCodeParams {
  orderId: string;
  orderType: "subscription_delivery" | "standalone_purchase" | "manual_payment" | "quote";
  trackingCode: string;
}

// ============================================================================
// Hook Principal
// ============================================================================

export function useOrderMutations() {
  const queryClient = useQueryClient();

  // Mutation: Atualizar status individual
  const updateStatus = useMutation({
    mutationFn: async (params: UpdateOrderStatusParams) => {
      const { orderId, orderType, newStatus } = params;

      const table =
        orderType === "subscription_delivery"
          ? "subscription_deliveries"
          : orderType === "standalone_purchase"
            ? "standalone_purchases"
            : "manual_payments";

      const { data, error } = await supabase
        .from(table as any)
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .select()
        .single();

      if (error) throw error;

      // O histórico é registrado automaticamente pelo trigger do banco de dados
      // Não é necessário chamar logStatusChange manualmente
      // O trigger log_subscription_delivery_status_change ou log_standalone_purchase_status_change
      // irá inserir automaticamente na tabela order_status_history

      return data;
    },
    onSuccess: () => {
      // Invalidar cache de pedidos
      queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] });
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar status:", error);
    },
  });

  // Mutation: Atualizar status em massa
  const bulkUpdateStatus = useMutation({
    mutationFn: async (params: {
      orders: Array<{
        id: string;
        type: "subscription_delivery" | "standalone_purchase" | "manual_payment" | "quote";
        status: OrderStatus;
      }>;
      newStatus: OrderStatus;
      onProgress?: (current: number, total: number) => void;
    }): Promise<BulkActionResult> => {
      const { orders, newStatus, onProgress } = params;

      // Importar a função de atualização em massa do serviço
      const { bulkUpdateStatus: bulkUpdateStatusService } =
        await import("@/services/admin/orders-service");

      // Transformar os dados para o formato esperado pelo serviço
      const unifiedOrders = orders.map((order) => ({
        id: order.id,
        type: order.type,
        status: order.status,
        // Campos mínimos necessários para a validação
        createdAt: "",
        updatedAt: "",
        customer: { id: "", name: "", email: "" },
        collection: { id: "", name: "", slug: "" },
        amount: 0,
        trackingCode: null,
        expectedDeliveryDate: null,
        actualDeliveryDate: null,
      }));

      // Chamar a função do serviço que inclui validação e progresso
      return await bulkUpdateStatusService(unifiedOrders as any, newStatus, onProgress);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] });
    },
    onError: (error: any) => {
      console.error("Erro na atualização em massa:", error);
    },
  });

  // Mutation: Atualizar código de rastreamento
  const updateTrackingCode = useMutation({
    mutationFn: async (params: UpdateTrackingCodeParams) => {
      const { orderId, orderType, trackingCode } = params;

      const table =
        orderType === "subscription_delivery"
          ? "subscription_deliveries"
          : orderType === "standalone_purchase"
            ? "standalone_purchases"
            : "manual_payments";

      const { data, error } = await supabase
        .from(table as any)
        .update({
          tracking_code: trackingCode,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] });
    },
  });

  // Mutation: Atualizar data de entrega
  const updateDeliveryDate = useMutation({
    mutationFn: async (params: {
      orderId: string;
      orderType: "subscription_delivery" | "standalone_purchase" | "manual_payment" | "quote";
      expectedDate?: string;
      actualDate?: string;
    }) => {
      const { orderId, orderType, expectedDate, actualDate } = params;

      const table =
        orderType === "subscription_delivery"
          ? "subscription_deliveries"
          : orderType === "standalone_purchase"
            ? "standalone_purchases"
            : "manual_payments";

      const updates: any = {
        updated_at: new Date().toISOString(),
      };

      if (expectedDate !== undefined) {
        updates.expected_delivery_date = expectedDate;
      }
      if (actualDate !== undefined) {
        updates.actual_delivery_date = actualDate;
      }

      const { data, error } = await supabase
        .from(table as any)
        .update(updates)
        .eq("id", orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] });
    },
  });

  return {
    updateStatus,
    bulkUpdateStatus,
    updateTrackingCode,
    updateDeliveryDate,
  };
}

// ============================================================================
// Hooks Especializados
// ============================================================================

/**
 * Hook para atualizar apenas status
 */
export function useUpdateOrderStatus() {
  const { updateStatus } = useOrderMutations();
  return updateStatus;
}

/**
 * Hook para atualização em massa
 */
export function useBulkUpdateStatus() {
  const { bulkUpdateStatus } = useOrderMutations();
  return bulkUpdateStatus;
}

/**
 * Hook para atualizar código de rastreamento
 */
export function useUpdateTrackingCode() {
  const { updateTrackingCode } = useOrderMutations();
  return updateTrackingCode;
}

// ============================================================================
// Funções Auxiliares
// ============================================================================

/**
 * Valida transição de status
 */
export function validateStatusTransition(
  currentStatus: OrderStatus,
  newStatus: OrderStatus,
  orderType: "subscription_delivery" | "standalone_purchase" | "manual_payment" | "quote"
): { valid: boolean; error?: string } {
  // Matriz de transições válidas para entregas de assinatura
  const subscriptionTransitions: Record<string, string[]> = {
    scheduled: ["pending_choice", "cancelled"],
    pending_choice: ["confirmed", "cancelled"],
    confirmed: ["in_production", "cancelled"],
    in_production: ["shipped", "cancelled"],
    shipped: ["delivered"],
    delivered: ["revealed"],
    revealed: [],
    cancelled: [],
  };

  // Matriz de transições válidas para compras avulsas
  const purchaseTransitions: Record<string, string[]> = {
    awaiting_deposit: ["deposit_paid", "cancelled"],
    deposit_paid: ["awaiting_balance", "cancelled"],
    awaiting_balance: ["balance_paid", "cancelled"],
    balance_paid: ["completed"],
    completed: [],
    cancelled: [],
  };

  // Matriz de transições válidas para pagamentos manuais
  const manualPaymentTransitions: Record<string, string[]> = {
    pending: ["under_review", "rejected"],
    under_review: ["requires_info", "approved", "rejected"],
    requires_info: ["under_review", "rejected"],
    approved: [],
    rejected: [],
  };

  // Matriz de transições válidas para orçamentos
  const quoteTransitions: Record<string, string[]> = {
    pending: ["reviewing", "archived"],
    reviewing: ["answered", "archived"],
    answered: ["archived"],
    archived: [],
  };

  const transitions =
    orderType === "subscription_delivery"
      ? subscriptionTransitions
      : orderType === "standalone_purchase"
        ? purchaseTransitions
        : orderType === "manual_payment"
          ? manualPaymentTransitions
          : quoteTransitions;

  const validNextStatuses = transitions[currentStatus] || [];

  if (!validNextStatuses.includes(newStatus)) {
    return {
      valid: false,
      error: `Transição de "${currentStatus}" para "${newStatus}" não é permitida`,
    };
  }

  return { valid: true };
}

/**
 * Obtém próximos status válidos para um pedido
 */
export function getValidNextStatuses(
  currentStatus: OrderStatus,
  orderType: "subscription_delivery" | "standalone_purchase" | "manual_payment" | "quote"
): OrderStatus[] {
  const subscriptionTransitions: Record<string, OrderStatus[]> = {
    scheduled: ["pending_choice", "cancelled"],
    pending_choice: ["confirmed", "cancelled"],
    confirmed: ["in_production", "cancelled"],
    in_production: ["shipped", "cancelled"],
    shipped: ["delivered"],
    delivered: ["revealed"],
    revealed: [],
    cancelled: [],
  };

  const purchaseTransitions: Record<string, OrderStatus[]> = {
    awaiting_deposit: ["deposit_paid", "cancelled"],
    deposit_paid: ["awaiting_balance", "cancelled"],
    awaiting_balance: ["balance_paid", "cancelled"],
    balance_paid: ["completed"],
    completed: [],
    cancelled: [],
  };

  const manualPaymentTransitions: Record<string, OrderStatus[]> = {
    pending: ["under_review", "rejected"],
    under_review: ["requires_info", "approved", "rejected"],
    requires_info: ["under_review", "rejected"],
    approved: [],
    rejected: [],
  };

  const quoteTransitions: Record<string, OrderStatus[]> = {
    pending: ["reviewing", "archived"],
    reviewing: ["answered", "archived"],
    answered: ["archived"],
    archived: [],
  };

  const transitions =
    orderType === "subscription_delivery"
      ? subscriptionTransitions
      : orderType === "standalone_purchase"
        ? purchaseTransitions
        : orderType === "manual_payment"
          ? manualPaymentTransitions
          : quoteTransitions;

  return transitions[currentStatus] || [];
}

/**
 * Verifica se um status é final (não pode mais mudar)
 */
export function isFinalStatus(status: OrderStatus): boolean {
  const finalStatuses: OrderStatus[] = [
    "revealed",
    "completed",
    "cancelled",
    "approved",
    "rejected",
    "answered",
    "archived",
  ];

  return finalStatuses.includes(status);
}

/**
 * Obtém label amigável para status
 */
export function getStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    // Entregas de assinatura
    scheduled: "Agendada",
    pending_choice: "Aguardando Escolha",
    confirmed: "Confirmada",
    in_production: "Em Produção",
    shipped: "Enviada",
    delivered: "Entregue",
    revealed: "Revelada",
    // Compras avulsas
    awaiting_deposit: "Aguardando Depósito",
    deposit_paid: "Depósito Pago",
    awaiting_balance: "Aguardando Saldo",
    balance_paid: "Saldo Pago",
    completed: "Completa",
    // Pagamentos manuais
    pending: "Pendente",
    under_review: "Em Análise",
    requires_info: "Requer Informações",
    approved: "Aprovado",
    rejected: "Rejeitado",
    // Orçamentos
    reviewing: "Em Análise",
    answered: "Respondido",
    archived: "Arquivado",
    // Comum
    cancelled: "Cancelada",
  };

  return labels[status] || status;
}

/**
 * Obtém cor para badge de status
 */
export function getStatusColor(status: OrderStatus): string {
  const colors: Record<string, string> = {
    scheduled: "blue",
    pending_choice: "yellow",
    confirmed: "green",
    in_production: "purple",
    shipped: "indigo",
    delivered: "green",
    revealed: "teal",
    awaiting_deposit: "orange",
    deposit_paid: "lime",
    awaiting_balance: "orange",
    balance_paid: "lime",
    completed: "green",
    pending: "gray",
    under_review: "blue",
    requires_info: "yellow",
    approved: "green",
    rejected: "red",
    reviewing: "blue",
    answered: "green",
    archived: "gray",
    cancelled: "red",
  };

  return colors[status] || "gray";
}

// ============================================================================
// Mutations para Pagamentos Manuais
// ============================================================================

/**
 * Hook para aprovar pagamento manual
 */
export function useApproveManualPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentId: string) => {
      const { approveManualPayment } = await import("@/services/admin/orders-service");
      await approveManualPayment(paymentId);
    },
    onSuccess: () => {
      // Invalidar todas as queries de pedidos
      queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] });
      // Forçar refetch imediato
      queryClient.refetchQueries({ queryKey: [ORDERS_QUERY_KEY] });
    },
    onError: (error: any) => {
      console.error("Erro ao aprovar pagamento:", error);
    },
  });
}

/**
 * Hook para rejeitar pagamento manual
 */
export function useRejectManualPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { paymentId: string; reason: string }) => {
      const { rejectManualPayment } = await import("@/services/admin/orders-service");
      await rejectManualPayment(params.paymentId, params.reason);
    },
    onSuccess: () => {
      // Invalidar todas as queries de pedidos
      queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] });
      // Forçar refetch imediato
      queryClient.refetchQueries({ queryKey: [ORDERS_QUERY_KEY] });
    },
    onError: (error: any) => {
      console.error("Erro ao rejeitar pagamento:", error);
    },
  });
}

/**
 * Hook para solicitar mais informações sobre pagamento manual
 */
export function useRequestManualPaymentInfo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { paymentId: string; message: string }) => {
      const { requestManualPaymentInfo } = await import("@/services/admin/orders-service");
      await requestManualPaymentInfo(params.paymentId, params.message);
    },
    onSuccess: () => {
      // Invalidar todas as queries de pedidos
      queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] });
      // Forçar refetch imediato
      queryClient.refetchQueries({ queryKey: [ORDERS_QUERY_KEY] });
    },
    onError: (error: any) => {
      console.error("Erro ao solicitar informações:", error);
    },
  });
}
