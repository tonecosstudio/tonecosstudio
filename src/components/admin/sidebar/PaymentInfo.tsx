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
import { updatePaymentStatus, type ManualPayment } from "@/lib/services/integrationService";
import { type LucideIcon } from "lucide-react";

interface PaymentInfoProps {
  payments: ManualPayment[];
  onRefresh: () => void;
}

export function PaymentInfo({ payments, onRefresh }: PaymentInfoProps) {
  const [selectedPayment, setSelectedPayment] = useState<ManualPayment | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [updating, setUpdating] = useState(false);

  // Filter only manual payments (not linked to quotes)
  const manualPayments = payments.filter(
    (p) => p.payment_type === "one_time" || p.payment_type === "recurring"
  );

  if (manualPayments.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        Nenhum pagamento manual encontrado
      </div>
    );
  }

  const handleUpdateStatus = async () => {
    if (!selectedPayment || !newStatus) return;

    setUpdating(true);
    try {
      await updatePaymentStatus(selectedPayment.id, newStatus);
      toast.success("Status do pagamento atualizado com sucesso");
      setShowStatusDialog(false);
      onRefresh();
    } catch (error) {
      console.error("Error updating payment status:", error);
      toast.error("Erro ao atualizar status do pagamento");
    } finally {
      setUpdating(false);
    }
  };

  const openStatusDialog = (payment: ManualPayment) => {
    setSelectedPayment(payment);
    setNewStatus(payment.status);
    setShowStatusDialog(true);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: LucideIcon }
    > = {
      pending: { label: "Pendente", variant: "secondary", icon: Clock },
      under_review: { label: "Em Análise", variant: "outline", icon: Clock },
      requires_info: { label: "Requer Info", variant: "outline", icon: Clock },
      approved: { label: "Aprovado", variant: "default", icon: CheckCircle },
      rejected: { label: "Rejeitado", variant: "destructive", icon: XCircle },
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
      one_time: "Pagamento Único",
      recurring: "Recorrente",
    };
    return typeMap[type] || type;
  };

  return (
    <>
      <div className="space-y-3">
        {manualPayments.map((payment) => (
          <Card key={payment.id} className="p-3">
            <div className="space-y-2">
              {/* Payment Header */}
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

              {/* Payment Details */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">R$ {payment.amount.toFixed(2)}</span>
                  {getStatusBadge(payment.status)}
                </div>

                {/* Payment Type */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Tipo:</span>
                  <span className="text-xs font-medium">
                    {getPaymentTypeLabel(payment.payment_type)}
                  </span>
                </div>

                {/* Payment Method */}
                <div className="bg-muted p-2 rounded text-xs">
                  <p className="text-muted-foreground">Método de pagamento:</p>
                  <p className="font-medium">ID: {payment.payment_method_id.slice(0, 8)}</p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Status Update Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar Status do Pagamento</DialogTitle>
            <DialogDescription>Pagamento #{selectedPayment?.reference_number}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current Amount */}
            <div className="bg-muted p-3 rounded">
              <p className="text-sm text-muted-foreground">Valor</p>
              <p className="text-lg font-bold">R$ {selectedPayment?.amount.toFixed(2)}</p>
            </div>

            {/* Status Selection */}
            <div className="space-y-2">
              <Label>Novo Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="under_review">Em Análise</SelectItem>
                  <SelectItem value="requires_info">Requer Informações</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Warning for status changes */}
            <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded text-xs text-yellow-700 dark:text-yellow-300">
              ⚠️ Atualizar o status do pagamento irá notificar automaticamente o cliente
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateStatus} disabled={updating}>
              {updating ? "Atualizando..." : "Atualizar Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
