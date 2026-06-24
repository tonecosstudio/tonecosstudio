/**
 * PaymentInfo Component
 * Displays payment history and allows status updates
 *
 * Requirements: 19.1, 19.2, 19.5, 25.3
 */

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreditCard, Edit, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useCustomerSidebarActions } from "@/hooks/admin/useCustomerSidebarActions";
import type { CustomerSidebarPayment } from "@/hooks/admin/useCustomerSidebar";
import { getOrderStatusLabel, MANUAL_PAYMENT_STATUS_OPTIONS } from "@/config/admin-order-status";
import type { ManualPaymentStatus } from "@/types/admin/orders";
import { type LucideIcon } from "lucide-react";
import { log } from "@/lib/logger";

interface PaymentInfoProps {
  payments: CustomerSidebarPayment[];
  onRefresh: () => void;
}

export function PaymentInfo({ payments, onRefresh }: PaymentInfoProps) {
  const { changePaymentStatus } = useCustomerSidebarActions();
  const [selectedPayment, setSelectedPayment] = useState<CustomerSidebarPayment | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<ManualPaymentStatus | "">("");
  const [updating, setUpdating] = useState(false);

  // Filter only manual payments (not linked to quotes)
  const manualPayments = payments.filter(
    (p) => p.payment_type === "one_time" || p.payment_type === "recurring"
  );
  const approvedPayments = manualPayments.filter((payment) => payment.status === "approved").length;
  const pendingPayments = manualPayments.filter(
    (payment) => payment.status === "pending" || payment.status === "under_review"
  ).length;

  if (manualPayments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
        Nenhum pagamento manual encontrado para este cliente.
      </div>
    );
  }

  const handleUpdateStatus = async () => {
    if (!selectedPayment || !newStatus) return;

    setUpdating(true);
    try {
      await changePaymentStatus(selectedPayment.id, newStatus);
      toast.success("Status do pagamento atualizado com sucesso");
      setShowStatusDialog(false);
      onRefresh();
    } catch (error) {
      log.error("Error updating payment status", { error, paymentId: selectedPayment.id, newStatus });
      toast.error("Erro ao atualizar status do pagamento");
    } finally {
      setUpdating(false);
    }
  };

  const openStatusDialog = (payment: CustomerSidebarPayment) => {
    setSelectedPayment(payment);
    setNewStatus(
      MANUAL_PAYMENT_STATUS_OPTIONS.some((option) => option.value === payment.status)
        ? (payment.status as ManualPaymentStatus)
        : "pending"
    );
    setShowStatusDialog(true);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: LucideIcon }
    > = {
      pending: { label: getOrderStatusLabel("pending"), variant: "secondary", icon: Clock },
      under_review: { label: getOrderStatusLabel("under_review"), variant: "outline", icon: Clock },
      requires_info: {
        label: getOrderStatusLabel("requires_info"),
        variant: "outline",
        icon: Clock,
      },
      approved: { label: getOrderStatusLabel("approved"), variant: "default", icon: CheckCircle },
      rejected: { label: getOrderStatusLabel("rejected"), variant: "destructive", icon: XCircle },
    };

    const config = statusMap[status] || { label: status, variant: "outline" as const, icon: Clock };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getPaymentTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      one_time: "Pagamento unico",
      recurring: "Recorrente",
    };
    return typeMap[type] || type;
  };

  return (
    <>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/20 p-3 text-xs">
          <div>
            <p className="text-muted-foreground">Registros</p>
            <p className="mt-1 font-semibold">{manualPayments.length}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Aprovados</p>
            <p className="mt-1 font-semibold">{approvedPayments}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Em fila</p>
            <p className="mt-1 font-semibold">{pendingPayments}</p>
          </div>
        </div>

        {manualPayments.map((payment) => (
          <Card key={payment.id} className="p-3">
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  <div>
                    <p className="font-medium text-sm">#{payment.reference_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(payment.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => openStatusDialog(payment)}>
                  <Edit className="h-3 w-3" />
                </Button>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">R$ {payment.amount.toFixed(2)}</span>
                  {getStatusBadge(payment.status)}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Tipo:</span>
                  <span className="text-xs font-medium">
                    {getPaymentTypeLabel(payment.payment_type)}
                  </span>
                </div>

                <div className="bg-muted p-2 rounded text-xs">
                  <p className="text-muted-foreground">Metodo de pagamento:</p>
                  <p className="font-medium">{payment.payment_method_label}</p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar status do pagamento</DialogTitle>
            <DialogDescription>Pagamento #{selectedPayment?.reference_number}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted p-3 rounded">
              <p className="text-sm text-muted-foreground">Valor</p>
              <p className="text-lg font-bold">R$ {selectedPayment?.amount.toFixed(2)}</p>
            </div>

            <div className="space-y-2">
              <Label>Novo status</Label>
              <Select
                value={newStatus}
                onValueChange={(value) => setNewStatus(value as ManualPaymentStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  {MANUAL_PAYMENT_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded text-xs text-yellow-700 dark:text-yellow-300">
              Atualizar o status do pagamento notifica o cliente automaticamente.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateStatus} disabled={updating}>
              {updating ? "Atualizando..." : "Atualizar status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
