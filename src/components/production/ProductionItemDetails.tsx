// @ts-nocheck
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, User, Package, AlertCircle } from "lucide-react";
import type { ProductionQueueItem } from "@/services/admin/production-service";
import { BlockProductionModal } from "./BlockProductionModal";
import { UnblockProductionModal } from "./UnblockProductionModal";
import { EditProductionModal } from "./EditProductionModal";
import { ProductionHistoryModal } from "./ProductionHistoryModal";

interface ProductionItemDetailsProps {
  item: ProductionQueueItem | null;
  onUpdate?: () => void;
}

export function ProductionItemDetails({ item, onUpdate }: ProductionItemDetailsProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showUnblockModal, setShowUnblockModal] = useState(false);

  if (!item) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Selecione um item para ver os detalhes
      </div>
    );
  }

  const handleModalSuccess = () => {
    if (onUpdate) {
      onUpdate();
    }
  };

  const priorityColors = {
    critical: "bg-red-500",
    high: "bg-orange-500",
    medium: "bg-yellow-500",
    low: "bg-green-500",
  };

  const stageLabels: Record<string, string> = {
    awaiting_payment: "Aguardando Pagamento",
    payment_confirmed: "Pagamento Confirmado",
    awaiting_choice: "Aguardando Escolha",
    model_preparation: "Preparação do Modelo",
    printing: "Em Impressão 3D",
    post_processing: "Limpeza e Preparação",
    painting: "Pintura Artesanal",
    quality_check: "Controle de Qualidade",
    packaging: "Embalagem",
    ready_to_ship: "Pronto para Envio",
    shipped: "Enviado",
    delivered: "Entregue",
    blocked: "Bloqueado",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between mb-2">
          <h2 className="text-2xl font-bold">{item.customerName}</h2>
          <Badge
            className={priorityColors[item.priority as keyof typeof priorityColors]}
          >
            {item.priority}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{item.collectionName}</p>
      </div>

      <Separator />

      {/* Status */}
      <div className="space-y-3">
        <h3 className="font-semibold">Status</h3>
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {stageLabels[item.currentStage] || item.currentStage}
          </span>
        </div>
      </div>

      <Separator />

      {/* Prazos */}
      <div className="space-y-3">
        <h3 className="font-semibold">Prazos</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              Entrega: {new Date(item.deliveryDeadline).toLocaleDateString("pt-BR")}
            </span>
          </div>
          {item.productionDeadline && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Produção: {new Date(item.productionDeadline).toLocaleDateString("pt-BR")}
              </span>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Atribuição */}
      {item.assignedTo && (
        <>
          <div className="space-y-3">
            <h3 className="font-semibold">Atribuído a</h3>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{item.assignedToName || "Não atribuído"}</span>
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Notas */}
      {item.productionNotes && (
        <>
          <div className="space-y-3">
            <h3 className="font-semibold">Notas de Produção</h3>
            <p className="text-sm text-muted-foreground">{item.productionNotes}</p>
          </div>
          <Separator />
        </>
      )}

      {/* Bloqueio */}
      {item.isBlocked && (
        <>
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              Item Bloqueado
            </h3>
            {item.blockReason && (
              <p className="text-sm text-muted-foreground">{item.blockReason}</p>
            )}
          </div>
          <Separator />
        </>
      )}

      {/* Ações */}
      <div className="space-y-2">
        <Button 
          className="w-full" 
          variant="default"
          onClick={() => setShowEditModal(true)}
        >
          Editar Item
        </Button>
        <Button 
          className="w-full" 
          variant="outline"
          onClick={() => setShowHistoryModal(true)}
        >
          Ver Histórico
        </Button>
        {item.isBlocked ? (
          <Button 
            className="w-full" 
            variant="destructive"
            onClick={() => setShowUnblockModal(true)}
          >
            Desbloquear
          </Button>
        ) : (
          <Button 
            className="w-full" 
            variant="secondary"
            onClick={() => setShowBlockModal(true)}
          >
            Bloquear
          </Button>
        )}
      </div>

      {/* Modals */}
      <EditProductionModal
        isOpen={showEditModal}
        onOpenChange={setShowEditModal}
        item={item}
        onSuccess={handleModalSuccess}
      />

      <ProductionHistoryModal
        isOpen={showHistoryModal}
        onOpenChange={setShowHistoryModal}
        productionQueueId={item.id}
      />

      <BlockProductionModal
        isOpen={showBlockModal}
        onOpenChange={setShowBlockModal}
        productionQueueId={item.id}
        onBlock={handleModalSuccess}
      />

      <UnblockProductionModal
        isOpen={showUnblockModal}
        onOpenChange={setShowUnblockModal}
        productionQueueId={item.id}
        onUnblock={handleModalSuccess}
      />
    </div>
  );
}
