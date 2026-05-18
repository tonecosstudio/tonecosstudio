import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertCircle,
  CheckCircle,
  CheckSquare,
  Clock,
  Download,
  Eye,
  Eye as EyeIcon,
  FileText,
  MessageSquare,
  MoreVertical,
  Square,
  XCircle,
} from "lucide-react";
import {
  formatPaymentCurrency,
  formatPaymentDate,
  formatPaymentDateOnly,
  getPaymentStatusConfig,
} from "@/lib/payment-dashboard-utils";
import type { PaymentListItem as PaymentListItemType } from "@/types/manual-payment";

interface PaymentListItemProps {
  payment: PaymentListItemType;
  onViewPayment?: (paymentId: string) => void;
  onExportPayment?: (paymentId: string) => void;
  isSelected?: boolean;
  onSelectChange?: (paymentId: string, selected: boolean) => void;
}

function getPaymentStatusIcon(
  status: PaymentListItemType["status"],
  className: string
): ReactNode {
  switch (status) {
    case "pending":
      return <Clock className={className} />;
    case "under_review":
      return <EyeIcon className={className} />;
    case "requires_info":
      return <AlertCircle className={className} />;
    case "approved":
      return <CheckCircle className={className} />;
    case "rejected":
      return <XCircle className={className} />;
    default:
      return null;
  }
}

export function PaymentListItem({
  payment,
  onViewPayment,
  onExportPayment,
  isSelected = false,
  onSelectChange,
}: PaymentListItemProps) {
  const statusConfig = getPaymentStatusConfig(payment.status);
  const statusIcon = getPaymentStatusIcon(payment.status, "h-3 w-3");

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
      {onSelectChange && (
        <div className="flex items-center" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            className="p-1 hover:bg-gray-100 rounded"
            onClick={() => onSelectChange(payment.id, !isSelected)}
            title={isSelected ? "Desmarcar" : "Marcar"}
          >
            {isSelected ? (
              <CheckSquare className="h-5 w-5 text-primary" />
            ) : (
              <Square className="h-5 w-5 text-gray-400" />
            )}
          </button>
        </div>
      )}

      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onViewPayment?.(payment.id)}>
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-sm truncate">{payment.reference_number}</h3>
          <Badge
            variant={statusConfig.variant}
            className={`${statusConfig.bgColor} ${statusConfig.color} ${statusConfig.borderColor} flex items-center gap-1 text-xs`}
          >
            {statusIcon}
            {statusConfig.label}
          </Badge>
        </div>
        <div className="text-sm text-gray-600">
          <div className="font-medium truncate">{payment.customer_name}</div>
          <div className="text-xs text-gray-500 truncate">{payment.customer_email}</div>
        </div>
      </div>

      <div className="flex flex-col sm:items-end gap-1">
        <div className="font-semibold text-sm">
          {formatPaymentCurrency(payment.amount, payment.currency)}
        </div>
        <div className="text-xs text-gray-500">{payment.payment_method_name}</div>
      </div>

      <div className="flex items-center gap-2">
        {payment.file_count > 0 && (
          <Badge
            variant="outline"
            className="text-xs flex items-center gap-1 bg-white"
            title={`${payment.file_count} arquivo${payment.file_count !== 1 ? "s" : ""}`}
          >
            <FileText className="h-3 w-3" />
            {payment.file_count}
          </Badge>
        )}
        {payment.unread_messages > 0 && (
          <Badge
            variant="outline"
            className="text-xs flex items-center gap-1 bg-white"
            title={`${payment.unread_messages} mensagem${payment.unread_messages !== 1 ? "ns" : ""} nao lida${payment.unread_messages !== 1 ? "s" : ""}`}
          >
            <MessageSquare className="h-3 w-3" />
            {payment.unread_messages}
          </Badge>
        )}
      </div>

      <div className="text-xs text-gray-500 whitespace-nowrap">
        {formatPaymentDate(payment.created_at)}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onViewPayment?.(payment.id)}
          title="Ver detalhes"
        >
          <Eye className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              aria-label="Abrir acoes do pagamento"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onViewPayment?.(payment.id)}>
              <Eye className="mr-2 h-4 w-4" />
              Ver detalhes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExportPayment?.(payment.id)}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function PaymentListItemCard({
  payment,
  onViewPayment,
  isSelected = false,
  onSelectChange,
}: PaymentListItemProps) {
  const statusConfig = getPaymentStatusConfig(payment.status);
  const statusIcon = getPaymentStatusIcon(payment.status, "h-4 w-4");

  return (
    <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-start gap-2">
          {onSelectChange && (
            <button
              type="button"
              className="p-1 hover:bg-gray-100 rounded mt-0.5"
              onClick={() => onSelectChange(payment.id, !isSelected)}
              title={isSelected ? "Desmarcar" : "Marcar"}
            >
              {isSelected ? (
                <CheckSquare className="h-4 w-4 text-primary" />
              ) : (
                <Square className="h-4 w-4 text-gray-400" />
              )}
            </button>
          )}
          <div className="cursor-pointer" onClick={() => onViewPayment?.(payment.id)}>
            <h3 className="font-semibold text-sm">{payment.reference_number}</h3>
            <div className="text-xs text-gray-500 mt-1">
              {formatPaymentDateOnly(payment.created_at)}
            </div>
          </div>
        </div>
        <div
          className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${statusConfig.bgColor} ${statusConfig.color}`}
        >
          {statusIcon}
          {statusConfig.label}
        </div>
      </div>

      <div className="mb-3">
        <div className="font-medium text-sm">{payment.customer_name}</div>
        <div className="text-xs text-gray-500 truncate">{payment.customer_email}</div>
      </div>

      <div className="flex justify-between items-center mb-3">
        <div>
          <div className="font-semibold text-sm">
            {formatPaymentCurrency(payment.amount, payment.currency)}
          </div>
          <div className="text-xs text-gray-500">{payment.payment_method_name}</div>
        </div>

        <div className="flex items-center gap-2">
          {payment.file_count > 0 && (
            <div className="text-xs text-gray-600 flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {payment.file_count}
            </div>
          )}
          {payment.unread_messages > 0 && (
            <div className="text-xs text-gray-600 flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {payment.unread_messages}
            </div>
          )}
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => onViewPayment?.(payment.id)}
      >
        <Eye className="h-4 w-4 mr-2" />
        Ver detalhes
      </Button>
    </div>
  );
}
