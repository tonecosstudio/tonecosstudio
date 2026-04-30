/**
 * PaymentListItem Component
 *
 * Componente para exibir um item de pagamento individual no dashboard admin.
 *
 * Requirements: 5.1-5.10
 * Task: 12.2 Criar componente PaymentListItem
 */

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Eye,
  MoreVertical,
  Download,
  FileText,
  MessageSquare,
  Clock,
  Eye as EyeIcon,
  AlertCircle,
  CheckCircle,
  XCircle,
  CheckSquare,
  Square,
} from "lucide-react";
import type { PaymentListItem as PaymentListItemType } from "@/types/manual-payment";

interface PaymentListItemProps {
  payment: PaymentListItemType;
  onViewPayment?: (paymentId: string) => void;
  onExportPayment?: (paymentId: string) => void;
  isSelected?: boolean;
  onSelectChange?: (paymentId: string, selected: boolean) => void;
}

export function PaymentListItem({
  payment,
  onViewPayment,
  onExportPayment,
  isSelected = false,
  onSelectChange,
}: PaymentListItemProps) {
  // Get status configuration
  const getStatusConfig = (status: PaymentListItemType["status"]) => {
    switch (status) {
      case "pending":
        return {
          variant: "outline" as const,
          icon: <Clock className="h-3 w-3" />,
          label: "Pendente",
          color: "text-yellow-600",
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-200",
        };
      case "under_review":
        return {
          variant: "secondary" as const,
          icon: <EyeIcon className="h-3 w-3" />,
          label: "Em Revisão",
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
        };
      case "requires_info":
        return {
          variant: "destructive" as const,
          icon: <AlertCircle className="h-3 w-3" />,
          label: "Precisa de Info",
          color: "text-orange-600",
          bgColor: "bg-orange-50",
          borderColor: "border-orange-200",
        };
      case "approved":
        return {
          variant: "default" as const,
          icon: <CheckCircle className="h-3 w-3" />,
          label: "Aprovado",
          color: "text-green-600",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
        };
      case "rejected":
        return {
          variant: "destructive" as const,
          icon: <XCircle className="h-3 w-3" />,
          label: "Rejeitado",
          color: "text-red-600",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
        };
      default:
        return {
          variant: "outline" as const,
          icon: null,
          label: status,
          color: "text-gray-600",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200",
        };
    }
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency || "BRL",
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const statusConfig = getStatusConfig(payment.status);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
      {/* Checkbox */}
      {onSelectChange && (
        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
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

      {/* Reference Number and Customer */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onViewPayment?.(payment.id)}>
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-sm truncate">{payment.reference_number}</h3>
          <Badge
            variant={statusConfig.variant}
            className={`${statusConfig.bgColor} ${statusConfig.color} ${statusConfig.borderColor} flex items-center gap-1 text-xs`}
          >
            {statusConfig.icon}
            {statusConfig.label}
          </Badge>
        </div>
        <div className="text-sm text-gray-600">
          <div className="font-medium truncate">{payment.customer_name}</div>
          <div className="text-xs text-gray-500 truncate">{payment.customer_email}</div>
        </div>
      </div>

      {/* Amount and Payment Method */}
      <div className="flex flex-col sm:items-end gap-1">
        <div className="font-semibold text-sm">
          {formatCurrency(payment.amount, payment.currency)}
        </div>
        <div className="text-xs text-gray-500">{payment.payment_method_name}</div>
      </div>

      {/* File and Message Badges */}
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
            title={`${payment.unread_messages} mensagem${payment.unread_messages !== 1 ? "ns" : ""} não lida${payment.unread_messages !== 1 ? "s" : ""}`}
          >
            <MessageSquare className="h-3 w-3" />
            {payment.unread_messages}
          </Badge>
        )}
      </div>

      {/* Date */}
      <div className="text-xs text-gray-500 whitespace-nowrap">
        {formatDate(payment.created_at)}
      </div>

      {/* Actions */}
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
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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

// Card variant for mobile/compact view
export function PaymentListItemCard({
  payment,
  onViewPayment,
  isSelected = false,
  onSelectChange,
}: PaymentListItemProps) {
  const getStatusConfig = (status: PaymentListItemType["status"]) => {
    switch (status) {
      case "pending":
        return {
          icon: <Clock className="h-4 w-4" />,
          label: "Pendente",
          color: "text-yellow-600",
          bgColor: "bg-yellow-50",
        };
      case "under_review":
        return {
          icon: <EyeIcon className="h-4 w-4" />,
          label: "Em Revisão",
          color: "text-blue-600",
          bgColor: "bg-blue-50",
        };
      case "requires_info":
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          label: "Precisa de Info",
          color: "text-orange-600",
          bgColor: "bg-orange-50",
        };
      case "approved":
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          label: "Aprovado",
          color: "text-green-600",
          bgColor: "bg-green-50",
        };
      case "rejected":
        return {
          icon: <XCircle className="h-4 w-4" />,
          label: "Rejeitado",
          color: "text-red-600",
          bgColor: "bg-red-50",
        };
      default:
        return {
          icon: null,
          label: status,
          color: "text-gray-600",
          bgColor: "bg-gray-50",
        };
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency || "BRL",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const statusConfig = getStatusConfig(payment.status);

  return (
    <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
      {/* Header with reference, status, and checkbox */}
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
          <div>
            <h3
              className="font-semibold text-sm cursor-pointer"
              onClick={() => onViewPayment?.(payment.id)}
            >
              {payment.reference_number}
            </h3>
            <div className="text-xs text-gray-500 mt-1">{formatDate(payment.created_at)}</div>
          </div>
        </div>
        <div
          className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${statusConfig.bgColor} ${statusConfig.color}`}
        >
          {statusConfig.icon}
          {statusConfig.label}
        </div>
      </div>

      {/* Customer info */}
      <div className="mb-3">
        <div className="font-medium text-sm">{payment.customer_name}</div>
        <div className="text-xs text-gray-500 truncate">{payment.customer_email}</div>
      </div>

      {/* Payment details */}
      <div className="flex justify-between items-center mb-3">
        <div>
          <div className="font-semibold text-sm">
            {formatCurrency(payment.amount, payment.currency)}
          </div>
          <div className="text-xs text-gray-500">{payment.payment_method_name}</div>
        </div>

        {/* Badges */}
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

      {/* Action button */}
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
