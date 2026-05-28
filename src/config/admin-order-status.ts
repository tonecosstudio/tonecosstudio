import type {
  ManualPaymentStatus,
  OrderFilters,
  OrderStatus,
  QuoteStatus,
  StandalonePurchaseStatus,
  SubscriptionDeliveryStatus,
} from "@/types/admin/orders";

export type AdminOrderType = Exclude<OrderFilters["type"], "all">;
export type AdminOrderTypeFilter = OrderFilters["type"];

export interface OrderStatusOption<TStatus extends OrderStatus = OrderStatus> {
  value: TStatus;
  label: string;
}

export const ORDER_TYPE_LABELS: Record<AdminOrderTypeFilter, string> = {
  all: "Todos os Pedidos",
  subscription_delivery: "Entrega de Assinatura",
  standalone_purchase: "Compra Avulsa",
  manual_payment: "Pagamento Manual",
  quote: "Orçamento",
};

export const ORDER_TYPE_SHORT_LABELS: Record<AdminOrderType, string> = {
  subscription_delivery: "Assinatura",
  standalone_purchase: "Avulsa",
  manual_payment: ORDER_TYPE_LABELS.manual_payment,
  quote: ORDER_TYPE_LABELS.quote,
};

export const ORDER_TYPE_OPTIONS: Array<{ value: AdminOrderTypeFilter; label: string }> = [
  { value: "all", label: ORDER_TYPE_LABELS.all },
  { value: "subscription_delivery", label: ORDER_TYPE_LABELS.subscription_delivery },
  { value: "standalone_purchase", label: ORDER_TYPE_LABELS.standalone_purchase },
  { value: "manual_payment", label: ORDER_TYPE_LABELS.manual_payment },
  { value: "quote", label: ORDER_TYPE_LABELS.quote },
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  scheduled: "Agendada",
  pending_choice: "Aguardando Escolha",
  confirmed: "Confirmada",
  in_production: "Em Produção",
  shipped: "Enviada",
  delivered: "Entregue",
  revealed: "Revelada",
  awaiting_deposit: "Aguardando Depósito",
  deposit_paid: "Depósito Pago",
  awaiting_balance: "Aguardando Saldo",
  balance_paid: "Saldo Pago",
  completed: "Completa",
  pending: "Pendente",
  under_review: "Em Análise",
  requires_info: "Requer Informações",
  approved: "Aprovado",
  rejected: "Rejeitado",
  reviewing: "Em Análise",
  answered: "Respondido",
  archived: "Arquivado",
  cancelled: "Cancelada",
};

export const SUBSCRIPTION_DELIVERY_STATUS_OPTIONS: Array<
  OrderStatusOption<SubscriptionDeliveryStatus>
> = [
  { value: "scheduled", label: ORDER_STATUS_LABELS.scheduled },
  { value: "pending_choice", label: ORDER_STATUS_LABELS.pending_choice },
  { value: "confirmed", label: ORDER_STATUS_LABELS.confirmed },
  { value: "in_production", label: ORDER_STATUS_LABELS.in_production },
  { value: "shipped", label: ORDER_STATUS_LABELS.shipped },
  { value: "delivered", label: ORDER_STATUS_LABELS.delivered },
  { value: "revealed", label: ORDER_STATUS_LABELS.revealed },
  { value: "cancelled", label: ORDER_STATUS_LABELS.cancelled },
];

export const STANDALONE_PURCHASE_STATUS_OPTIONS: Array<
  OrderStatusOption<StandalonePurchaseStatus>
> = [
  { value: "awaiting_deposit", label: ORDER_STATUS_LABELS.awaiting_deposit },
  { value: "deposit_paid", label: ORDER_STATUS_LABELS.deposit_paid },
  { value: "awaiting_balance", label: ORDER_STATUS_LABELS.awaiting_balance },
  { value: "balance_paid", label: ORDER_STATUS_LABELS.balance_paid },
  { value: "in_production", label: ORDER_STATUS_LABELS.in_production },
  { value: "shipped", label: ORDER_STATUS_LABELS.shipped },
  { value: "delivered", label: ORDER_STATUS_LABELS.delivered },
  { value: "completed", label: ORDER_STATUS_LABELS.completed },
  { value: "cancelled", label: ORDER_STATUS_LABELS.cancelled },
];

export const MANUAL_PAYMENT_STATUS_OPTIONS: Array<OrderStatusOption<ManualPaymentStatus>> = [
  { value: "pending", label: ORDER_STATUS_LABELS.pending },
  { value: "under_review", label: ORDER_STATUS_LABELS.under_review },
  { value: "requires_info", label: ORDER_STATUS_LABELS.requires_info },
  { value: "approved", label: ORDER_STATUS_LABELS.approved },
  { value: "rejected", label: ORDER_STATUS_LABELS.rejected },
];

export const QUOTE_STATUS_OPTIONS: Array<OrderStatusOption<QuoteStatus>> = [
  { value: "pending", label: ORDER_STATUS_LABELS.pending },
  { value: "reviewing", label: ORDER_STATUS_LABELS.reviewing },
  { value: "answered", label: ORDER_STATUS_LABELS.answered },
  { value: "archived", label: ORDER_STATUS_LABELS.archived },
];

function uniqueStatusOptions(options: OrderStatusOption[]): OrderStatusOption[] {
  return Array.from(new Map(options.map((option) => [option.value, option])).values());
}

export const ALL_ORDER_STATUS_OPTIONS = uniqueStatusOptions([
  ...SUBSCRIPTION_DELIVERY_STATUS_OPTIONS,
  ...STANDALONE_PURCHASE_STATUS_OPTIONS,
  ...MANUAL_PAYMENT_STATUS_OPTIONS,
  ...QUOTE_STATUS_OPTIONS,
]);

export function getOrderStatusOptionsForType(type: AdminOrderTypeFilter): OrderStatusOption[] {
  switch (type) {
    case "subscription_delivery":
      return SUBSCRIPTION_DELIVERY_STATUS_OPTIONS;
    case "standalone_purchase":
      return STANDALONE_PURCHASE_STATUS_OPTIONS;
    case "manual_payment":
      return MANUAL_PAYMENT_STATUS_OPTIONS;
    case "quote":
      return QUOTE_STATUS_OPTIONS;
    case "all":
      return ALL_ORDER_STATUS_OPTIONS;
  }
}

export function getOrderStatusLabel(status: OrderStatus | string): string {
  return ORDER_STATUS_LABELS[status as OrderStatus] ?? status;
}

const ORDER_STATUS_SET = new Set<string>(Object.keys(ORDER_STATUS_LABELS));

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && ORDER_STATUS_SET.has(value);
}

export function getOrderTypeLabel(type: AdminOrderTypeFilter | string): string {
  return (ORDER_TYPE_LABELS as Record<string, string>)[type] ?? type;
}

export function getShortOrderTypeLabel(type: AdminOrderType | string): string {
  return (ORDER_TYPE_SHORT_LABELS as Record<string, string>)[type] ?? getOrderTypeLabel(type);
}
