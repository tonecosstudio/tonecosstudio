import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { PaymentListItem, PaymentStatus } from "@/types/manual-payment";

export type PaymentDashboardSortField = "created_at" | "amount" | "customer_name" | "status";
export type PaymentDashboardSortDirection = "asc" | "desc";

export interface PaymentStatusUiConfig {
  label: string;
  color: string;
  bgColor: string;
  variant: "outline" | "secondary" | "destructive";
}

const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  under_review: 1,
  requires_info: 2,
};

const STATUS_CONFIG: Record<string, PaymentStatusUiConfig> = {
  pending: {
    variant: "outline",
    label: "Pendente",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
  },
  under_review: {
    variant: "secondary",
    label: "Em Revisao",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  requires_info: {
    variant: "destructive",
    label: "Precisa de Info",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
};

export function getPaymentStatusConfig(status: PaymentStatus): PaymentStatusUiConfig {
  return (
    STATUS_CONFIG[status] || {
      variant: "outline",
      label: status,
      color: "text-gray-600",
      bgColor: "bg-gray-50",
    }
  );
}

export function sortPaymentListItems(
  payments: PaymentListItem[],
  sortField: PaymentDashboardSortField,
  sortDirection: PaymentDashboardSortDirection
): PaymentListItem[] {
  return [...payments].sort((a, b) => {
    let aValue: number | string;
    let bValue: number | string;

    switch (sortField) {
      case "created_at":
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
        break;
      case "amount":
        aValue = a.amount;
        bValue = b.amount;
        break;
      case "customer_name":
        aValue = a.customer_name.toLowerCase();
        bValue = b.customer_name.toLowerCase();
        break;
      case "status":
        aValue = STATUS_ORDER[a.status] ?? 99;
        bValue = STATUS_ORDER[b.status] ?? 99;
        break;
      default:
        return 0;
    }

    if (sortDirection === "asc") {
      return aValue > bValue ? 1 : -1;
    }

    return aValue < bValue ? 1 : -1;
  });
}

export function formatPaymentCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency || "BRL",
  }).format(amount);
}

export function formatPaymentDate(dateString: string): string {
  return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: ptBR });
}

