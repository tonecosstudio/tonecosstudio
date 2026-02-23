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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Package, Truck, CheckCircle, Clock, Edit } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { updateOrderStatus, getOrderProductionStages, type Order, type OrderProductionStage } from "@/lib/services/integrationService";

interface OrdersListProps {
  orders: Order[];
  onRefresh: () => void;
}

export function OrdersList({ orders, onRefresh }: OrdersListProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [updating, setUpdating] = useState(false);
  const [productionStages, setProductionStages] = useState<OrderProductionStage[]>([]);

  if (orders.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        Nenhum pedido encontrado
      </div>
    );
  }

  const handleUpdateStatus = async () => {
    if (!selectedOrder || !newStatus) return;

    setUpdating(true);
    try {
      await updateOrderStatus(selectedOrder.id, newStatus, trackingCode || undefined);
      toast.success("Status do pedido atualizado com sucesso");
      setShowStatusDialog(false);
      onRefresh();
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Erro ao atualizar status do pedido");
    } finally {
      setUpdating(false);
    }
  };

  const openStatusDialog = async (order: Order) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setTrackingCode(order.tracking_code || "");
    setShowStatusDialog(true);

    // Load production stages
    try {
      const stages = await getOrderProductionStages(order.id);
      setProductionStages(stages);
    } catch (error) {
      console.error("Error loading production stages:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "Aguardando Pagamento", variant: "secondary" },
      under_review: { label: "Em Análise", variant: "outline" },
      approved: { label: "Aprovado", variant: "default" },
      rejected: { label: "Rejeitado", variant: "destructive" },
      em_producao: { label: "Em Produção", variant: "default" },
      enviado: { label: "Enviado", variant: "default" },
      entregue: { label: "Entregue", variant: "default" },
    };

    const config = statusMap[status] || { label: status, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
      case "under_review":
        return <Clock className="h-4 w-4" />;
      case "em_producao":
        return <Package className="h-4 w-4" />;
      case "enviado":
        return <Truck className="h-4 w-4" />;
      case "entregue":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getProductionStageLabel = (stage: string) => {
    const stageMap: Record<string, string> = {
      molde_pronto: "Molde Pronto",
      impressao_iniciada: "Impressão Iniciada",
      pintura_iniciada: "Pintura Iniciada",
      finalizacao: "Finalização",
    };
    return stageMap[stage] || stage;
  };

  return (
    <>
      <div className="space-y-3">
        {orders.map((order) => (
          <Card key={order.id} className="p-3">
            <div className="space-y-2">
              {/* Order Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(order.status)}
                  <div>
                    <p className="font-medium text-sm">#{order.reference_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(order.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openStatusDialog(order)}
                >
                  <Edit className="h-3 w-3" />
                </Button>
              </div>

              {/* Order Details */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  R$ {order.amount.toFixed(2)}
                </span>
                {getStatusBadge(order.status)}
              </div>

              {/* Tracking Code */}
              {order.tracking_code && (order.status === "enviado" || order.status === "entregue") && (
                <div className="bg-muted p-2 rounded text-xs">
                  <p className="text-muted-foreground">Código de rastreamento:</p>
                  <p className="font-mono font-medium">{order.tracking_code}</p>
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
            <DialogDescription>
              Pedido #{selectedOrder?.reference_number}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Status Selection */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Aguardando Pagamento</SelectItem>
                  <SelectItem value="under_review">Em Análise</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="em_producao">Em Produção</SelectItem>
                  <SelectItem value="enviado">Enviado</SelectItem>
                  <SelectItem value="entregue">Entregue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tracking Code (only for enviado/entregue) */}
            {(newStatus === "enviado" || newStatus === "entregue") && (
              <div className="space-y-2">
                <Label>Código de Rastreamento</Label>
                <Input
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  placeholder="Ex: BR123456789BR"
                />
              </div>
            )}

            {/* Production Stages (Internal Only) */}
            {productionStages.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Estágios de Produção Interna (visível apenas para admin)
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
                      {stage.notes && (
                        <p className="text-muted-foreground mt-1">{stage.notes}</p>
                      )}
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
              {updating ? "Atualizando..." : "Atualizar Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
