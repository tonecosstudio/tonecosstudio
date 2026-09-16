import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { PaymentDetails, PaymentListItem, PaymentStatus } from "@/types/manual-payment";

export type PaymentDashboardSortField = "created_at" | "amount" | "customer_name" | "status";
export type PaymentDashboardSortDirection = "asc" | "desc";

export interface PaymentStatusUiConfig {
  status: PaymentStatus;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  variant: "default" | "outline" | "secondary" | "destructive";
}

const STATUS_ORDER: Record<PaymentStatus, number> = {
  pending: 0,
  under_review: 1,
  requires_info: 2,
  approved: 3,
  rejected: 4,
};

const STATUS_CONFIG: Record<PaymentStatus, PaymentStatusUiConfig> = {
  pending: {
    status: "pending",
    variant: "outline",
    label: "Pendente",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
  },
  under_review: {
    status: "under_review",
    variant: "secondary",
    label: "Em Revisao",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  requires_info: {
    status: "requires_info",
    variant: "destructive",
    label: "Precisa de Info",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
  },
  approved: {
    status: "approved",
    variant: "default",
    label: "Aprovado",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  rejected: {
    status: "rejected",
    variant: "destructive",
    label: "Rejeitado",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
};

export const PAYMENT_STATUS_OPTIONS: PaymentStatus[] = ["pending", "under_review", "requires_info"];

export function getPaymentStatusConfig(status: PaymentStatus): PaymentStatusUiConfig {
  return STATUS_CONFIG[status];
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

export function formatPaymentDateOnly(dateString: string): string {
  return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
}

export function exportPaymentListItemToCsv(payment: PaymentListItem): void {
  const headers = [
    "ID",
    "Referencia",
    "Cliente",
    "Email",
    "Valor",
    "Moeda",
    "Metodo",
    "Status",
    "Criado em",
    "Arquivos",
    "Mensagens nao lidas",
  ];

  const row = [
    payment.id,
    payment.reference_number,
    payment.customer_name,
    payment.customer_email,
    formatPaymentCurrency(payment.amount, payment.currency),
    payment.currency,
    payment.payment_method_name,
    getPaymentStatusConfig(payment.status).label,
    formatPaymentDate(payment.created_at),
    String(payment.file_count),
    String(payment.unread_messages),
  ];

  downloadCsvFile([headers, row], `pagamento_${payment.reference_number || payment.id}.csv`);
}

export function exportPaymentDetailsToCsv(payment: PaymentDetails): void {
  const rows: string[][] = [
    ["Campo", "Valor"],
    ["ID", payment.id],
    ["Referencia", payment.reference_number],
    ["Cliente", payment.customer_name || ""],
    ["Email", payment.customer_email || ""],
    ["Valor", formatPaymentCurrency(payment.amount, payment.currency)],
    ["Moeda", payment.currency],
    ["Metodo", payment.payment_method?.name || payment.payment_method_id || "Não informado"],
    ["Tipo", payment.payment_type],
    ["Status", getPaymentStatusConfig(payment.status).label],
    ["Criado em", formatPaymentDate(payment.created_at)],
    ["Atualizado em", formatPaymentDate(payment.updated_at)],
    ["Aprovado em", payment.approved_at ? formatPaymentDate(payment.approved_at) : ""],
    ["Aprovado por", payment.approved_by || ""],
    ["Motivo da rejeicao", payment.rejection_reason || ""],
    ["Arquivos", String(payment.files.length)],
    ["Eventos da linha do tempo", String(payment.timeline.length)],
    ["Conversa", payment.conversation?.id || ""],
    ["Status da conversa", payment.conversation?.status || ""],
  ];

  downloadCsvFile(rows, `pagamento_${payment.reference_number || payment.id}_detalhes.csv`);
}

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function downloadCsvFile(rows: string[][], fileName: string): void {
  const csv = rows.map((fields) => fields.map(escapeCsvField).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
