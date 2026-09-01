/**
 * ProductionKanbanBoard Component
 *
 * Provides a visual kanban board with columns for each production stage:
 * - Drag-and-drop support using @dnd-kit
 * - Column collapse/expand functionality
 * - Item count per column
 *
 * Features:
 * - Visual organization by production stage
 * - Drag items between stages to update status
 * - Collapsible columns to save space
 * - Real-time updates
 */

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { AlertCircle, ChevronDown, ChevronRight, Package } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import type {
  Priority,
  ProductionFilters,
  ProductionQueueItem,
  ProductionStage,
} from "@/types/production";
import {
  STAGE_LABELS,
  STAGE_ORDER,
  useMoveProductionKanbanItem,
  useProductionPipelineQueue,
} from "@/hooks/admin/useProductionPipeline";

interface ProductionKanbanBoardProps {
  filters: ProductionFilters;
}

const STAGE_COLORS: Record<ProductionStage, string> = {
  awaiting_payment: "bg-slate-100 border-slate-300 dark:bg-slate-900/30 dark:border-slate-700",
  payment_confirmed: "bg-emerald-100 border-emerald-300 dark:bg-emerald-900/30 dark:border-emerald-700",
  awaiting_choice: "bg-yellow-100 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-700",
  model_preparation: "bg-blue-100 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700",
  printing: "bg-indigo-100 border-indigo-300 dark:bg-indigo-900/30 dark:border-indigo-700",
  post_processing: "bg-violet-100 border-violet-300 dark:bg-violet-900/30 dark:border-violet-700",
  painting: "bg-pink-100 border-pink-300 dark:bg-pink-900/30 dark:border-pink-700",
  quality_check: "bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700",
  packaging: "bg-orange-100 border-orange-300 dark:bg-orange-900/30 dark:border-orange-700",
  ready_to_ship: "bg-amber-100 border-amber-300 dark:bg-amber-900/30 dark:border-amber-700",
  shipped: "bg-cyan-100 border-cyan-300 dark:bg-cyan-900/30 dark:border-cyan-700",
  delivered: "bg-gray-100 border-gray-300 dark:bg-gray-900/30 dark:border-gray-700",
};

const STAGE_CONFIG: Array<{ key: ProductionStage; label: string; color: string }> = STAGE_ORDER.map(
  (stage) => ({
    key: stage,
    label: STAGE_LABELS[stage],
    color: STAGE_COLORS[stage] || "bg-gray-100 border-gray-300",
  })
);

export function ProductionKanbanBoard({ filters }: ProductionKanbanBoardProps) {
  const { toast } = useToast();
  const [collapsedColumns, setCollapsedColumns] = useState<Set<ProductionStage>>(new Set());
  const [activeItem, setActiveItem] = useState<ProductionQueueItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const { data: queueData, isLoading } = useProductionPipelineQueue(filters);
  const updateStageMutation = useMoveProductionKanbanItem(filters);

  const itemsByStage = useMemo(() => {
    const grouped = new Map<ProductionStage, ProductionQueueItem[]>();

    STAGE_CONFIG.forEach((stage) => {
      grouped.set(stage.key, []);
    });

    queueData?.data.forEach((item) => {
      const stageItems = grouped.get(item.currentStage) || [];
      stageItems.push(item);
      grouped.set(item.currentStage, stageItems);
    });

    return grouped;
  }, [queueData]);

  const toggleColumn = (stage: ProductionStage) => {
    setCollapsedColumns((previous) => {
      const next = new Set(previous);
      if (next.has(stage)) {
        next.delete(stage);
      } else {
        next.add(stage);
      }
      return next;
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const item = queueData?.data.find((candidate) => candidate.id === event.active.id);
    setActiveItem(item || null);
  };

  const validateStageTransition = (
    item: ProductionQueueItem,
    newStage: ProductionStage
  ): { valid: boolean; error?: string } => {
    const currentIndex = STAGE_ORDER.indexOf(item.currentStage);
    const newIndex = STAGE_ORDER.indexOf(newStage);

    if (currentIndex === newIndex) {
      return { valid: false, error: "O item já está neste estágio." };
    }

    if (newIndex > currentIndex + 1) {
      return {
        valid: false,
        error: "Não é possível pular estágios. Complete o estágio atual primeiro.",
      };
    }

    if (
      item.currentStage === "awaiting_choice" &&
      newIndex > currentIndex &&
      item.choiceStatus === "pending"
    ) {
      return {
        valid: false,
        error: "Aguardando escolha do personagem pelo cliente. Não é possível avançar.",
      };
    }

    return { valid: true };
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);

    if (!over || active.id === over.id) {
      return;
    }

    const newStage = over.id.toString().replace("stage-", "") as ProductionStage;
    const itemId = active.id.toString();
    const item = queueData?.data.find((candidate) => candidate.id === itemId);
    if (!item || item.currentStage === newStage) return;

    const validation = validateStageTransition(item, newStage);
    if (!validation.valid) {
      toast({
        title: "Transição inválida",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    updateStageMutation.mutate(
      { itemId, newStage },
      {
        onError: (error) => {
          toast({
            title: "Erro ao atualizar estágio",
            description:
              error instanceof Error
                ? error.message
                : "Não foi possível mover o item. Tente novamente.",
            variant: "destructive",
          });
        },
        onSuccess: () => {
          toast({
            title: "Estágio atualizado com sucesso",
            description: `O item foi movido para "${STAGE_CONFIG.find((stage) => stage.key === newStage)?.label}".`,
          });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Card className="border border-border bg-card shadow-sm">
        <CardContent className="p-6">
          <div className="text-sm text-muted-foreground">Carregando quadro kanban...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGE_CONFIG.map((stage) => {
          const items = itemsByStage.get(stage.key) || [];
          const isCollapsed = collapsedColumns.has(stage.key);

          return (
            <KanbanColumn
              key={stage.key}
              stage={stage.key}
              label={stage.label}
              color={stage.color}
              items={items}
              itemCount={items.length}
              isCollapsed={isCollapsed}
              onToggleCollapse={() => toggleColumn(stage.key)}
            />
          );
        })}
      </div>

      <DragOverlay>{activeItem ? <KanbanCard item={activeItem} isDragging /> : null}</DragOverlay>
    </DndContext>
  );
}

interface KanbanColumnProps {
  stage: ProductionStage;
  label: string;
  color: string;
  items: ProductionQueueItem[];
  itemCount: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

function KanbanColumn({
  stage,
  label,
  color,
  items,
  itemCount,
  isCollapsed,
  onToggleCollapse,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `stage-${stage}`,
  });

  return (
    <div className={`flex-shrink-0 ${isCollapsed ? "w-16" : "w-80"} transition-all duration-200`}>
      <Card className={`border-2 ${color} shadow-sm h-full ${isOver ? "ring-2 ring-primary" : ""}`}>
        <CardHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between gap-2">
            {isCollapsed ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleCollapse}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggleCollapse}
                    className="h-8 w-8 p-0 flex-shrink-0"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <h3 className="font-semibold text-sm truncate">{label}</h3>
                </div>
                <Badge variant="secondary" className="flex-shrink-0">
                  {itemCount}
                </Badge>
              </>
            )}
          </div>
        </CardHeader>

        {!isCollapsed && (
          <CardContent
            ref={setNodeRef}
            className="p-2 space-y-2 overflow-y-auto"
            style={{ maxHeight: "calc(100vh - 300px)", minHeight: "200px" }}
          >
            {items.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-8">
                Nenhum item neste estágio
              </div>
            ) : (
              items.map((item) => <KanbanCard key={item.id} item={item} />)
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}

interface KanbanCardProps {
  item: ProductionQueueItem;
  isDragging?: boolean;
}

function KanbanCard({ item, isDragging = false }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging: isBeingDragged } = useDraggable({
    id: item.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const priorityColors: Record<Priority, string> = {
    critical: "bg-red-500 text-white",
    high: "bg-orange-500 text-white",
    normal: "bg-blue-500 text-white",
    low: "bg-gray-500 text-white",
  };

  const priorityLabels: Record<Priority, string> = {
    critical: "Crítico",
    high: "Alto",
    normal: "Normal",
    low: "Baixo",
  };

  const getDeadlineInfo = () => {
    if (!item.choiceDeadline) return null;

    const deadline = new Date(item.choiceDeadline);
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffMs < 0) {
      return { text: "Prazo expirado", color: "text-red-600", urgent: true };
    }
    if (diffHours < 24) {
      return { text: `${diffHours}h restantes`, color: "text-red-600", urgent: true };
    }
    if (diffDays < 3) {
      return { text: `${diffDays}d restantes`, color: "text-orange-600", urgent: true };
    }
    return { text: `${diffDays}d restantes`, color: "text-muted-foreground", urgent: false };
  };

  const deadlineInfo = getDeadlineInfo();

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-move hover:shadow-md transition-shadow ${
        isBeingDragged || isDragging ? "opacity-50" : ""
      }`}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate" title={item.customerName}>
            {item.customerName}
          </div>
          <div
            className="text-xs text-muted-foreground truncate"
            title={`Pedido: ${item.orderId.slice(0, 8)}`}
          >
            #{item.orderId.slice(0, 8)}
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Package className="h-3 w-3 flex-shrink-0" />
          <span className="truncate" title={item.collectionName}>
            {item.collectionName}
          </span>
        </div>

        {item.characterName && (
          <div className="text-xs text-muted-foreground truncate" title={item.characterName}>
            Personagem: {item.characterName}
          </div>
        )}

        <Badge className={`text-xs ${priorityColors[item.priority] || priorityColors.normal}`}>
          {priorityLabels[item.priority] || item.priority}
        </Badge>

        {deadlineInfo && item.choiceStatus === "pending" && (
          <div className={`text-xs font-medium ${deadlineInfo.color} flex items-center gap-1`}>
            {deadlineInfo.urgent && <AlertCircle className="h-3 w-3" />}
            Prazo: {deadlineInfo.text}
          </div>
        )}

        {item.assignedToName && (
          <div className="flex items-center gap-2 pt-1 border-t border-border">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {getInitials(item.assignedToName)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate" title={item.assignedToName}>
              {item.assignedToName}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
