import { useState } from "react";
import { AlertCircle, Calendar, Clock, Package, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Priority, ProductionQueueItem, ProductionStage } from "@/types/production";
import { BlockProductionModal } from "./BlockProductionModal";
import { EditProductionModal } from "./EditProductionModal";
import { ProductionHistoryModal } from "./ProductionHistoryModal";
import { UnblockProductionModal } from "./UnblockProductionModal";

interface ProductionItemDetailsProps {
  item: ProductionQueueItem | null;
  onUpdate?: () => void;
}

const PRIORITY_CLASSES: Record<Priority, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  normal: "bg-blue-500",
  low: "bg-green-500",
};

const STAGE_LABELS: Record<ProductionStage, string> = {
  awaiting_payment: "Aguardando Pagamento",
  payment_confirmed: "Pagamento Confirmado",
  awaiting_choice: "Aguardando Escolha",
  model_preparation: "Preparacao do Modelo",
  printing: "Em Impressao 3D",
  post_processing: "Limpeza e Preparacao",
  painting: "Pintura Artesanal",
  quality_check: "Controle de Qualidade",
  packaging: "Embalagem",
  ready_to_ship: "Pronto para Envio",
  shipped: "Enviado",
  delivered: "Entregue",
};

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

  const isBlocked = item.productionStatus === "on_hold";

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-start justify-between mb-2">
          <h2 className="text-2xl font-bold">{item.customerName}</h2>
          <Badge className={PRIORITY_CLASSES[item.priority]}>{item.priority}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{item.collectionName}</p>
      </div>

      <Separator />

      <div className="space-y-3">
        <h3 className="font-semibold">Status</h3>
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{STAGE_LABELS[item.currentStage]}</span>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <h3 className="font-semibold">Prazos</h3>
        <div className="space-y-2">
          {item.estimatedCompletionDate ? (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Conclusao estimada: {formatDate(item.estimatedCompletionDate)}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Conclusao estimada nao definida</span>
            </div>
          )}

          {item.scheduledProductionDate && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Producao agendada: {formatDate(item.scheduledProductionDate)}
              </span>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {item.assignedTo && (
        <>
          <div className="space-y-3">
            <h3 className="font-semibold">Atribuido a</h3>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{item.assignedToName || "Nao atribuido"}</span>
            </div>
          </div>
          <Separator />
        </>
      )}

      {item.productionNotes && (
        <>
          <div className="space-y-3">
            <h3 className="font-semibold">Notas de Producao</h3>
            <p className="text-sm text-muted-foreground">{item.productionNotes}</p>
          </div>
          <Separator />
        </>
      )}

      {isBlocked && (
        <>
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              Item Bloqueado
            </h3>
            {item.productionNotes && (
              <p className="text-sm text-muted-foreground">{item.productionNotes}</p>
            )}
          </div>
          <Separator />
        </>
      )}

      <div className="space-y-2">
        <Button className="w-full" variant="default" onClick={() => setShowEditModal(true)}>
          Editar Item
        </Button>
        <Button className="w-full" variant="outline" onClick={() => setShowHistoryModal(true)}>
          Ver Historico
        </Button>
        {isBlocked ? (
          <Button
            className="w-full"
            variant="destructive"
            onClick={() => setShowUnblockModal(true)}
          >
            Desbloquear
          </Button>
        ) : (
          <Button className="w-full" variant="secondary" onClick={() => setShowBlockModal(true)}>
            Bloquear
          </Button>
        )}
      </div>

      <EditProductionModal
        isOpen={showEditModal}
        onOpenChange={setShowEditModal}
        item={item}
        onSuccess={onUpdate}
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
        onBlock={onUpdate}
      />

      <UnblockProductionModal
        isOpen={showUnblockModal}
        onOpenChange={setShowUnblockModal}
        productionQueueId={item.id}
        onUnblock={onUpdate}
      />
    </div>
  );
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("pt-BR");
}
