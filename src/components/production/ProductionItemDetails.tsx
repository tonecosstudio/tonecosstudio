// @ts-nocheck
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, User, Package, AlertCircle } from "lucide-react";
import type { ProductionQueueItem } from "@/services/admin/production-service";

interface ProductionItemDetailsProps {
  item: ProductionQueueItem | null;
}

export function ProductionItemDetails({ item }: ProductionItemDetailsProps) {
  if (!item) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Selecione um item para ver os detalhes
      </div>
    );
  }

  const priorityColors = {
    critical: "bg-red-500",
    high: "bg-orange-500",
    medium: "bg-yellow-500",
    low: "bg-green-500",
  };

  const stageLabels: Record<string, string> = {
    awaiting_choice: "Aguardando Escolha",
    design: "Design",
    production: "Produção",
    quality_check: "Controle de Qualidade",
    packaging: "Embalagem",
    shipped: "Enviado",
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
        <Button className="w-full" variant="default">
          Editar Item
        </Button>
        <Button className="w-full" variant="outline">
          Ver Histórico
        </Button>
        {item.isBlocked ? (
          <Button className="w-full" variant="destructive">
            Desbloquear
          </Button>
        ) : (
          <Button className="w-full" variant="secondary">
            Bloquear
          </Button>
        )}
      </div>
    </div>
  );
}
