/**
 * OrdersList Component
 * Displays list of customer orders with status and tracking
 *
 * Requirements: 7.2, 7.3, 7.4, 7.6, 25.3
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
import { CheckCircle, Clock, CreditCard, Edit, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  useCustomerSidebarActions,
  type OrderProductionStage,
} from "@/hooks/admin/useCustomerSidebarActions";
import type { CustomerSidebarOrder } from "@/hooks/admin/useCustomerSidebar";
import {
  getOrderStatusLabel,
  getOrderStatusOptionsForType,
} from "@/config/admin-order-status";
import type { OrderStatus } from "@/types/admin/orders";
import { getProductionStageLabel } from "@/config/production-stages";
import { OrderTypeIndicator } from "@/components/admin/orders/OrderTypeIndicator";
import { log } from "@/lib/logger";

interface OrdersListProps {
  orders: CustomerSidebarOrder[];
  onRefresh: () => void;
}

export function OrdersList({ orders, onRefresh }: OrdersListProps) {
  const { changeOrderStatus, loadOrderProductionStages } = useCustomerSidebarActions();
  const [selectedOrder, setSelectedOrder] = useState<CustomerSidebarOrder | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<OrderStatus | "">("");
  const [updating, setUpdating] = useState(false);
  const [productionStages, setProductionStages] = useState<OrderProductionStage[]>([]);

  if (orders.length === 0) {
    return (
      <div className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
        Nenhum pedido encontrado para este cliente.
      </div>
    );
  }

  const handleUpdateStatus = async () => {
    if (!selectedOrder || !newStatus) return;

    setUpdating(true);
    try {
      await changeOrderStatus(selectedOrder.id, selectedOrder.type, newStatus);
      toast.success("Status do pedido atualizado com sucesso");
      setShowStatusDialog(false);
      onRefresh();
    } catch (error) {
      log.error("Error updating order status", { error, orderId: selectedOrder.id, newStatus });
      toast.error("Erro ao atualizar status do pedido");
    } finally {
      setUpdating(false);
    }
  };

  const openStatusDialog = async (order: CustomerSidebarOrder) => {
    setSelectedOrder(order);
    const validOptions = getOrderStatusOptionsForType(order.type);
    setNewStatus(validOptions.some((option) => option.value === order.status) ? order.status : "");
    setShowStatusDialog(true);

    // Load production stages
    try {
      const stages = await loadOrderProductionStages(order.id);
      setProductionStages(stages);
    } catch (error) {
      log.error("Error loading production stages", { error, orderId: order.id });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
    > = {
      pending: { label: getOrderStatusLabel("pending"), variant: "secondary" },
      under_review: { label: getOrderStatusLabel("under_review"), variant: "outline" },
      requires_info: { label: getOrderStatusLabel("requires_info"), variant: "outline" },
      approved: { label: getOrderStatusLabel("approved"), variant: "default" },
      rejected: { label: getOrderStatusLabel("rejected"), variant: "destructive" },
    };

    const config = statusMap[status] || { label: status, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
      case "under_review":
      case "requires_info":
        return <Clock className="h-4 w-4" />;
      case "approved":
        return <CheckCircle className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  const getAvailableStatusOptions = (order: CustomerSidebarOrder | null) => {
    if (!order) {
      return [];
    }

    return getOrderStatusOptionsForType(order.type);
  };

  return (
    <>
      <div className="space-y-3">
        {orders.map((order) => (
          <Card key={order.id} className="p-3">
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(order.status)}
                  <div>
                    <p className="font-medium text-sm">#{order.reference_number.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(order.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => openStatusDialog(order)}>
                  <Edit className="h-3 w-3" />
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">R$ {order.amount.toFixed(2)}</span>
                {getStatusBadge(order.status)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Tipo</span>
                <OrderTypeIndicator type={order.type} />
              </div>
              {order.tracking_code && (
                <div className="rounded bg-muted px-2 py-1 text-xs">
                  <span className="text-muted-foreground">Rastreamento: </span>
                  <span className="font-medium">{order.tracking_code}</span>
                </div>
              )}
              {order.production_stages && order.production_stages.length > 0 && (
                <div className="rounded bg-muted px-2 py-2 text-xs">
                  <p className="font-medium">
                    {order.production_stages.length} etapa
                    {order.production_stages.length !== 1 ? "s" : ""} registrada
                    {order.production_stages.length !== 1 ? "s" : ""}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Ultima:{" "}
                    {getProductionStageLabel(
                      order.production_stages[order.production_stages.length - 1].stage
                    )}
                  </p>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Status Update Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar Status do Pedido</DialogTitle>
            <DialogDescription>Pedido #{selectedOrder?.reference_number}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={newStatus}
                onValueChange={(value) => setNewStatus(value as OrderStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableStatusOptions(selectedOrder).map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {productionStages.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Estagios de producao interna
                </Label>
                <div className="space-y-1">
                  {productionStages.map((stage) => (
                    <div key={stage.id} className="bg-muted p-2 rounded text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{getProductionStageLabel(stage.stage)}</span>
                        <span className="text-muted-foreground">
                          {format(new Date(stage.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      {stage.notes && <p className="text-muted-foreground mt-1">{stage.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
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
